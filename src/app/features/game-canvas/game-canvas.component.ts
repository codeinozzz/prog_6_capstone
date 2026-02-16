import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MapStore, GameStore, PlayersStore, MqttEventsStore } from '../../store';
import { Tank } from '../../core/models/tank.model';
import { Bullet } from '../../core/models/bullet.model';
import { MovementEvent } from '../../core/models/movement.model';
import { GameService } from '../../core/services/game.service';
import { MqttService } from '../../core/services/mqtt.service';
import { InputHandlerService } from './services/input-handler.service';
import { CollisionService } from './services/collision.service';
import { RenderingService } from './services/rendering.service';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TANK_SIZE, MOVE_SPEED, BULLET_SPEED } from './constants/game.constants';
import type { PowerUpEvent } from '../../core/models/mqtt-event.model';

const POWERUP_SIZE = 20;

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.scss']
})
export class GameCanvasComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly mapStore = inject(MapStore);
  private readonly gameStore = inject(GameStore);
  private readonly playersStore = inject(PlayersStore);
  private readonly mqttStore = inject(MqttEventsStore);
  private readonly gameService = inject(GameService);
  private readonly mqttService = inject(MqttService);
  private readonly inputHandler = inject(InputHandlerService);
  private readonly collisionService = inject(CollisionService);
  private readonly renderingService = inject(RenderingService);

  private animationId: number | null = null;
  private bulletFiredSub: Subscription | null = null;
  private tileDestroyedSub: Subscription | null = null;
  private mqttSubs: Subscription[] = [];

  // Colores de power-ups por tipo
  private readonly POWERUP_COLORS: Record<string, string> = {
    ammo: '#ffcc00',
    health: '#00cc44',
    speed: '#00aaff',
  };

  tank: Tank = {
    id: 'player-1',
    position: { x: 40, y: 40 },
    direction: 'right',
    health: 100,
    isActive: true
  };

  bullets: Bullet[] = [];
  remoteBullets: Bullet[] = [];
  private bulletIdCounter = 0;
  private remoteBulletIdCounter = 0;

  // Benchmarking SignalR: timestamps de eventos clave
  private signalREventTimes: number[] = [];

  ngOnInit(): void {
    if (!this.playersStore.isConnected()) {
      this.playersStore.connect();
    }

    // Conectar MQTT a la misma sala actual
    const roomId = this.playersStore.localPlayerId() ?? 'default';
    this.mqttStore.connectToRoom(roomId);

    // SignalR — bullet recibido (medir latencia)
    this.bulletFiredSub = this.gameService.onBulletFired().subscribe(({ playerId, x, y, direction }) => {
      this.signalREventTimes.push(Date.now());
      this.remoteBullets.push({
        id: `remote-bullet-${++this.remoteBulletIdCounter}`,
        position: { x, y },
        direction: direction as Bullet['direction'],
        speed: BULLET_SPEED,
        active: true
      });
    });

    this.tileDestroyedSub = this.gameService.onTileDestroyed().subscribe(({ tileX, tileY }) => {
      this.mapStore.destroyTile(tileX, tileY);
    });

    // MQTT — colisión recibida
    this.mqttSubs.push(
      this.mqttService.collision$.subscribe((ev) => {
        if (ev.victimId === this.playersStore.localPlayerId()) {
          this.gameStore.decreaseHealth(ev.damage);
        }
      })
    );

    // MQTT — fin de partida
    this.mqttSubs.push(
      this.mqttService.gameEnd$.subscribe((ev) => {
        console.log('[MQTT] Game over! Winner:', ev.winnerName);
      })
    );

    // Benchmark periódico: enviar ping MQTT cada 5s
    const benchInterval = setInterval(() => {
      this.mqttService.sendBenchmarkPing(roomId);
    }, 5000);
    this.mqttSubs.push(new Subscription(() => clearInterval(benchInterval)));
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    this.startGameLoop();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.bulletFiredSub?.unsubscribe();
    this.tileDestroyedSub?.unsubscribe();
    this.mqttSubs.forEach((s) => s.unsubscribe());
    this.mqttStore.disconnect();

    // Log latency stats on destroy
    const stats = this.mqttService.getLatencyStats();
    console.log('[Benchmark] MQTT latency stats:', stats);
    console.log('[Benchmark] SignalR events received:', this.signalREventTimes.length);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const action = this.inputHandler.parseKeyEvent(event);
    if (!action) return;

    event.preventDefault();
    if (action.type === 'move' && action.direction) {
      this.moveTank(action.direction);
    } else if (action.type === 'shoot') {
      this.shoot();
    }
  }

  private moveTank(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.tank.direction = direction;

    const deltaMap = {
      up: { x: 0, y: -MOVE_SPEED },
      down: { x: 0, y: MOVE_SPEED },
      left: { x: -MOVE_SPEED, y: 0 },
      right: { x: MOVE_SPEED, y: 0 }
    };

    const delta = deltaMap[direction];
    const newX = this.tank.position.x + delta.x;
    const newY = this.tank.position.y + delta.y;

    if (!this.collisionService.checkTankCollision(newX, newY, this.mapStore.tiles(), this.mapStore.tileSize())) {
      this.tank.position.x = Math.max(0, Math.min(CANVAS_WIDTH - TANK_SIZE, newX));
      this.tank.position.y = Math.max(0, Math.min(CANVAS_HEIGHT - TANK_SIZE, newY));
    }

    this.checkPowerUpCollection();
    this.broadcastMovement();
  }

  private broadcastMovement(): void {
    const localPlayerId = this.playersStore.localPlayerId();
    if (!localPlayerId) return;

    const movement: MovementEvent = {
      playerId: localPlayerId,
      position: { x: this.tank.position.x, y: this.tank.position.y },
      direction: this.tank.direction,
      timestamp: Date.now()
    };

    this.playersStore.updatePlayerPosition(localPlayerId, movement.position, movement.direction);
    this.playersStore.sendPlayerMove(movement);
  }

  private shoot(): void {
    if (this.gameStore.ammunition() <= 0) return;

    this.gameStore.decreaseAmmunition(1);

    const bulletOffset = TANK_SIZE / 2 - 3;
    let bulletX = this.tank.position.x + bulletOffset;
    let bulletY = this.tank.position.y + bulletOffset;

    switch (this.tank.direction) {
      case 'up':    bulletY = this.tank.position.y - 10; break;
      case 'down':  bulletY = this.tank.position.y + TANK_SIZE; break;
      case 'left':  bulletX = this.tank.position.x - 10; break;
      case 'right': bulletX = this.tank.position.x + TANK_SIZE; break;
    }

    this.bullets.push({
      id: `bullet-${++this.bulletIdCounter}`,
      position: { x: bulletX, y: bulletY },
      direction: this.tank.direction,
      speed: BULLET_SPEED,
      active: true
    });

    const localPlayerId = this.playersStore.localPlayerId();
    if (localPlayerId) {
      this.gameService.sendBulletFired(localPlayerId, bulletX, bulletY, this.tank.direction);
    }
  }

  /** Detectar si el tanque local está sobre un power-up activo */
  private checkPowerUpCollection(): void {
    const activePowerUps = this.mqttStore.activePowerUps().filter((p) => p.active);
    const localId = this.playersStore.localPlayerId() ?? '';
    const roomId = this.playersStore.localPlayerId() ?? 'default';

    for (const pu of activePowerUps) {
      const dx = Math.abs(this.tank.position.x - pu.x);
      const dy = Math.abs(this.tank.position.y - pu.y);

      if (dx < TANK_SIZE && dy < TANK_SIZE) {
        // Aplicar efecto
        this.applyPowerUp(pu);

        // Notificar via MQTT + SignalR
        this.mqttService.publishPowerUpCollected(roomId, pu.id, localId);
        this.gameService.collectPowerUp(pu.id);
        this.mqttStore.removePowerUp(pu.id);
      }
    }
  }

  private applyPowerUp(pu: PowerUpEvent): void {
    switch (pu.type) {
      case 'ammo':
        this.gameStore.decreaseAmmunition(-10); // añadir 10 balas
        console.log('[PowerUp] +10 ammo');
        break;
      case 'health':
        this.gameStore.decreaseHealth(-25); // recuperar 25 HP (decreaseHealth acepta negativos)
        console.log('[PowerUp] +25 health');
        break;
      case 'speed':
        // La velocidad es constante en este juego, el efecto es visual
        console.log('[PowerUp] Speed boost (cosmetic)');
        break;
    }
  }

  private updateBulletArray(bullets: Bullet[], isLocal: boolean): Bullet[] {
    const tiles = this.mapStore.tiles();
    const tileSize = this.mapStore.tileSize();

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      switch (bullet.direction) {
        case 'up':    bullet.position.y -= bullet.speed; break;
        case 'down':  bullet.position.y += bullet.speed; break;
        case 'left':  bullet.position.x -= bullet.speed; break;
        case 'right': bullet.position.x += bullet.speed; break;
      }

      if (this.collisionService.isOutOfBounds(bullet.position.x, bullet.position.y)) {
        bullet.active = false;
        continue;
      }

      const collision = this.collisionService.checkBulletTileCollision(
        bullet.position.x, bullet.position.y, tiles, tileSize
      );

      if (collision.hit) {
        if (collision.tileType === 2) {
          this.mapStore.destroyTile(collision.tileX, collision.tileY);
          if (isLocal) {
            this.gameStore.incrementScore(10);
            this.gameService.sendTileDestroyed(collision.tileX, collision.tileY);
          }
        }
        bullet.active = false;
      }
    }

    return bullets.filter(b => b.active);
  }

  private startGameLoop(): void {
    const loop = () => {
      this.bullets = this.updateBulletArray(this.bullets, true);
      this.remoteBullets = this.updateBulletArray(this.remoteBullets, false);
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private draw(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.renderingService.clearCanvas(ctx);
    this.renderingService.drawMap(ctx, this.mapStore.tiles(), this.mapStore.tileSize());

    // Dibujar power-ups activos (recibidos via MQTT)
    for (const pu of this.mqttStore.activePowerUps().filter((p) => p.active)) {
      this.drawPowerUp(ctx, pu);
    }

    for (const player of this.playersStore.remotePlayers()) {
      this.renderingService.drawRemoteTank(ctx, player);
    }

    this.renderingService.drawLocalTank(ctx, this.tank);
    this.renderingService.drawBullets(ctx, this.bullets);
    this.renderingService.drawBullets(ctx, this.remoteBullets);
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpEvent): void {
    const color = this.POWERUP_COLORS[pu.type] ?? '#ffffff';
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300); // efecto pulsante

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2, POWERUP_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Letra identificadora
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.type[0].toUpperCase(), pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2);
    ctx.restore();
  }
}
