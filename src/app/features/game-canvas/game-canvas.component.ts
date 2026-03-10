import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { TANK_SIZE, MOVE_SPEED, BULLET_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT, MapTheme } from './constants/game.constants';
import type { PowerUpEvent } from '../../core/models/mqtt-event.model';

const POWERUP_SIZE = 20;

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  private playerDiedSub: Subscription | null = null;
  private playerHitSub: Subscription | null = null;
  private initialPowerUpsSub: Subscription | null = null;
  private mqttSubs: Subscription[] = [];
  private gameEnded = false;

  private readonly POWERUP_COLORS: Record<string, string> = {
    ammo: '#ffcc00',
    health: '#00cc44',
    speed: '#00aaff',
  };

  private readonly SPAWN_POSITIONS = [
    { x: 40,  y: 40  },
    { x: 330, y: 330 },
    { x: 40,  y: 330 },
    { x: 330, y: 40  },
  ];

  tank: Tank = {
    id: 'player-local',
    position: { x: 40, y: 40 },
    direction: 'right',
    health: 100,
    isActive: true
  };

  bullets: Bullet[] = [];
  remoteBullets: Bullet[] = [];
  private bulletIdCounter = 0;
  private remoteBulletIdCounter = 0;

  private signalREventTimes: number[] = [];

  ngOnInit(): void {
    if (!this.playersStore.isConnected()) {
      this.playersStore.connect();
    }

    this.gameStore.resetGame();
    this.gameEnded = false;

    const isHost = localStorage.getItem('isHost') !== 'false';
    const spawnIndex = isHost ? 0 : Math.min(this.playersStore.remotePlayers().length, this.SPAWN_POSITIONS.length - 1);
    this.tank.position = { ...this.SPAWN_POSITIONS[spawnIndex] };

    const roomId = localStorage.getItem('currentRoomId') ?? 'default';
    this.mqttStore.connectToRoom(roomId);

    this.initialPowerUpsSub = this.gameService.onInitialPowerUps().subscribe((powerUps) => {
      this.mqttStore.initializePowerUps(powerUps);
    });

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

    this.playerHitSub = this.gameService.onPlayerHit().subscribe(({ damage }) => {
      this.applyDamage(damage);
    });

    this.playerDiedSub = this.gameService.onPlayerDied().subscribe(({ victimId }) => {
      this.playersStore.removePlayer(victimId);

      if (this.playersStore.remotePlayers().length === 0
          && this.gameStore.playerStatus() !== 'dead'
          && !this.gameEnded) {
        this.gameEnded = true;
        const localId = this.playersStore.localPlayerId() ?? '';
        const localName = localStorage.getItem('username') ?? 'Player';
        const finalScore = this.gameStore.score();
        this.gameService.endGame(localId, localName, finalScore);
      }
    });

    this.mqttSubs.push(
      this.mqttService.collision$.subscribe((ev) => {
        if (ev.victimId === this.playersStore.localPlayerId()) {
          this.applyDamage(ev.damage);
        }
      })
    );

    this.mqttSubs.push(
      this.mqttService.gameEnd$.subscribe((ev) => {
        console.log('[MQTT] Game over! Winner:', ev.winnerName);
      })
    );

    const benchInterval = setInterval(() => {
      this.mqttService.sendBenchmarkPing(roomId);
    }, 5000);
    this.mqttSubs.push(new Subscription(() => clearInterval(benchInterval)));
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.startGameLoop();
    this.broadcastMovement();
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || canvas.offsetWidth || window.innerWidth;
    canvas.height = rect.height || canvas.offsetHeight || window.innerHeight;
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.bulletFiredSub?.unsubscribe();
    this.tileDestroyedSub?.unsubscribe();
    this.playerDiedSub?.unsubscribe();
    this.playerHitSub?.unsubscribe();
    this.initialPowerUpsSub?.unsubscribe();
    this.mqttSubs.forEach((s) => s.unsubscribe());
    this.mqttStore.disconnect();

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
    if (this.gameStore.playerStatus() === 'dead') return;

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
    if (this.gameStore.playerStatus() === 'dead') return;
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

  private checkPowerUpCollection(): void {
    const activePowerUps = this.mqttStore.activePowerUps().filter((p) => p.active);
    const localId = this.playersStore.localPlayerId() ?? '';
    const roomId = localStorage.getItem('currentRoomId') ?? 'default';

    for (const pu of activePowerUps) {
      const dx = Math.abs(this.tank.position.x - pu.x);
      const dy = Math.abs(this.tank.position.y - pu.y);

      if (dx < TANK_SIZE && dy < TANK_SIZE) {
        this.applyPowerUp(pu);
        this.gameStore.incrementScore(25);
        this.mqttService.publishPowerUpCollected(roomId, pu.id, localId);
        this.gameService.collectPowerUp(pu.id);
        this.mqttStore.removePowerUp(pu.id);
      }
    }
  }

  private applyDamage(damage: number): void {
    if (this.gameStore.playerStatus() === 'dead') return;

    this.gameStore.decreaseHealth(damage);
    const newHealth = this.gameStore.health();

    if (newHealth <= 0) {
      this.gameStore.setPlayerStatus('dead');
      const localId = this.playersStore.localPlayerId() ?? '';
      const localName = localStorage.getItem('username') ?? 'Player';
      this.gameService.playerDied(localId, localName, '', '');
      this.gameService.submitScore(localName, this.gameStore.score());
    } else if (newHealth < 40) {
      this.gameStore.setPlayerStatus('injured');
    }
  }

  private applyPowerUp(pu: PowerUpEvent): void {
    switch (pu.type) {
      case 'ammo':
        this.gameStore.decreaseAmmunition(-10);
        console.log('[PowerUp] +10 ammo');
        break;
      case 'health':
        this.gameStore.decreaseHealth(-25);
        if (this.gameStore.health() >= 40) {
          this.gameStore.setPlayerStatus('alive');
        }
        console.log('[PowerUp] +25 health');
        break;
      case 'speed':
        console.log('[PowerUp] Speed boost (cosmetic)');
        break;
    }
  }

  private updateBulletArray(bullets: Bullet[], isLocal: boolean): Bullet[] {
    const tiles = this.mapStore.tiles();
    const tileSize = this.mapStore.tileSize();
    const remotePlayers = isLocal ? this.playersStore.remotePlayers() : [];

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

      if (isLocal) {
        for (const remotePlayer of remotePlayers) {
          if (this.collisionService.checkBulletTankCollision(
            bullet.position.x, bullet.position.y,
            remotePlayer.position.x, remotePlayer.position.y
          )) {
            bullet.active = false;
            const damage = 25;
            this.gameStore.incrementScore(100);
            this.gameService.reportCollision(remotePlayer.id, damage);
            break;
          }
        }
        if (!bullet.active) continue;
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

    const theme = this.mapStore.currentTheme();
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const mapLogicalSize = CANVAS_WIDTH;
    const scale = Math.floor(Math.min(canvasW, canvasH) * 0.92 / mapLogicalSize * 10) / 10;
    const scaledMapSize = mapLogicalSize * scale;

    const offsetX = Math.floor((canvasW - scaledMapSize) / 2);
    const offsetY = Math.floor((canvasH - scaledMapSize) / 2);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    this.renderingService.drawMap(ctx, this.mapStore.tiles(), this.mapStore.tileSize(), theme);

    for (const pu of this.mqttStore.activePowerUps().filter((p) => p.active)) {
      this.drawPowerUp(ctx, pu);
    }

    for (const player of this.playersStore.remotePlayers()) {
      this.renderingService.drawRemoteTank(ctx, player, theme);
    }

    this.renderingService.drawLocalTank(ctx, this.tank, theme);
    this.renderingService.drawBullets(ctx, this.bullets, theme.bullet);
    this.renderingService.drawBullets(ctx, this.remoteBullets, theme.bullet);

    ctx.restore();

    this.drawHUD(ctx, theme);
  }

  private drawHUD(ctx: CanvasRenderingContext2D, theme: MapTheme): void {
    const health = this.gameStore.health();
    const score = this.gameStore.score();
    const ammo = this.gameStore.ammunition();
    const status = this.gameStore.playerStatus();

    ctx.save();

    const barW = 150;
    const barH = 14;
    const barX = 10;
    const barY = 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    const hpColor = health > 60 ? '#00cc44' : health > 30 ? '#ffaa00' : '#cc0000';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, (health / 100) * barW, barH);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${health}`, barX + 4, barY + 11);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Score: ${score}`, barX, barY + 32);
    ctx.fillText(`Ammo: ${ammo}`, barX, barY + 48);

    if (status === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU DIED', ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.fillStyle = '#aaa';
      ctx.font = '18px monospace';
      ctx.fillText(`Final Score: ${score}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 40);
    }

    ctx.restore();
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpEvent): void {
    const color = this.POWERUP_COLORS[pu.type] ?? '#ffffff';
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2, POWERUP_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.type[0].toUpperCase(), pu.x + POWERUP_SIZE / 2, pu.y + POWERUP_SIZE / 2);
    ctx.restore();
  }
}

