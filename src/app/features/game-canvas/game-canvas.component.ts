import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MapStore, GameStore, PlayersStore, MqttEventsStore } from '../../store';
import { Tank } from '../../core/models/tank.model';
import { Bullet } from '../../core/models/bullet.model';
import { GameService } from '../../core/services/game.service';
import { MqttService } from '../../core/services/mqtt.service';
import { InputHandlerService } from './services/input-handler.service';
import { RenderingService } from './services/rendering.service';
import { BulletService } from './services/bullet.service';
import { PlayerActionsService } from './services/player-actions.service';
import { CANVAS_WIDTH } from './constants/game.constants';

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
  private readonly renderingService = inject(RenderingService);
  private readonly bulletService = inject(BulletService);
  private readonly playerActions = inject(PlayerActionsService);

  private animationId: number | null = null;
  private readonly subs: Subscription[] = [];
  private gameEnded = false;

  private readonly SPAWN_POSITIONS = [
    { x: 40,  y: 40  },
    { x: 330, y: 330 },
    { x: 40,  y: 330 },
    { x: 330, y: 40  },
  ];

  tank: Tank = { id: 'player-local', position: { x: 40, y: 40 }, direction: 'right', health: 100, isActive: true };
  bullets: Bullet[] = [];
  remoteBullets: Bullet[] = [];
  private bulletIdCounter = 0;
  private remoteBulletIdCounter = 0;

  ngOnInit(): void {
    if (!this.playersStore.isConnected()) this.playersStore.connect();

    this.gameStore.resetGame();
    this.gameEnded = false;

    const isHost = localStorage.getItem('isHost') !== 'false';
    const spawnIndex = isHost ? 0 : Math.min(this.playersStore.remotePlayers().length, this.SPAWN_POSITIONS.length - 1);
    this.tank.position = { ...this.SPAWN_POSITIONS[spawnIndex] };

    const roomId = localStorage.getItem('currentRoomId') ?? 'default';
    this.mqttStore.connectToRoom(roomId);

    this.subs.push(
      this.gameService.onInitialPowerUps().subscribe(pus => this.mqttStore.initializePowerUps(pus)),

      this.gameService.onBulletFired().subscribe(({ x, y, direction }) => {
        this.remoteBullets.push({ id: `remote-bullet-${++this.remoteBulletIdCounter}`, position: { x, y }, direction: direction as Bullet['direction'], speed: 6, active: true });
      }),

      this.gameService.onTileDestroyed().subscribe(({ tileX, tileY }) => this.mapStore.destroyTile(tileX, tileY)),

      this.gameService.onPlayerHit().subscribe(({ damage }) => this.playerActions.applyDamage(damage)),

      this.gameService.onPlayerDied().subscribe(({ victimId }) => {
        this.playersStore.removePlayer(victimId);
        if (this.playersStore.remotePlayers().length === 0 && this.gameStore.playerStatus() !== 'dead' && !this.gameEnded) {
          this.gameEnded = true;
          this.gameService.endGame(this.playersStore.localPlayerId() ?? '', localStorage.getItem('username') ?? 'Player', this.gameStore.score());
        }
      }),

      this.mqttService.collision$.subscribe(ev => {
        if (ev.victimId === this.playersStore.localPlayerId()) this.playerActions.applyDamage(ev.damage);
      }),

      this.mqttService.gameEnd$.subscribe(ev => console.log('[MQTT] Game over! Winner:', ev.winnerName)),

      new Subscription(() => clearInterval(setInterval(() => this.mqttService.sendBenchmarkPing(roomId), 5000)))
    );
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.startGameLoop();
    this.playerActions.broadcastMovement(this.tank);
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || canvas.offsetWidth || window.innerWidth;
    canvas.height = rect.height || canvas.offsetHeight || window.innerHeight;
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.subs.forEach(s => s.unsubscribe());
    this.mqttStore.disconnect();
    console.log('[Benchmark] MQTT latency stats:', this.mqttService.getLatencyStats());
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const action = this.inputHandler.parseKeyEvent(event);
    if (!action) return;
    event.preventDefault();
    if (action.type === 'move' && action.direction) {
      this.playerActions.moveTank(this.tank, action.direction);
      this.playerActions.checkPowerUpCollection(this.tank);
      this.playerActions.broadcastMovement(this.tank);
    } else if (action.type === 'shoot') {
      const result = this.playerActions.shoot(this.tank, this.bullets, this.bulletIdCounter);
      this.bullets = result.bullets;
      this.bulletIdCounter = result.counter;
    }
  }

  private startGameLoop(): void {
    const loop = () => {
      this.bullets = this.bulletService.update(this.bullets, true);
      this.remoteBullets = this.bulletService.update(this.remoteBullets, false);
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

    const scale = Math.floor(Math.min(canvasW, canvasH) * 0.92 / CANVAS_WIDTH * 10) / 10;
    const scaledSize = CANVAS_WIDTH * scale;

    ctx.save();
    ctx.translate(Math.floor((canvasW - scaledSize) / 2), Math.floor((canvasH - scaledSize) / 2));
    ctx.scale(scale, scale);

    this.renderingService.drawMap(ctx, this.mapStore.tiles(), this.mapStore.tileSize(), theme);
    for (const pu of this.mqttStore.activePowerUps().filter(p => p.active)) this.renderingService.drawPowerUp(ctx, pu);
    for (const player of this.playersStore.remotePlayers()) this.renderingService.drawRemoteTank(ctx, player, theme);
    this.renderingService.drawLocalTank(ctx, this.tank, theme);
    this.renderingService.drawBullets(ctx, this.bullets, theme.bullet);
    this.renderingService.drawBullets(ctx, this.remoteBullets, theme.bullet);

    ctx.restore();

    this.renderingService.drawHUD(ctx, {
      health: this.gameStore.health(),
      score: this.gameStore.score(),
      ammo: this.gameStore.ammunition(),
      status: this.gameStore.playerStatus()
    });
  }
}
