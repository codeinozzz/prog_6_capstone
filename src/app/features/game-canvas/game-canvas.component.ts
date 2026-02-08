import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapStore, GameStore, PlayersStore } from '../../store';
import { Tank } from '../../core/models/tank.model';
import { Bullet } from '../../core/models/bullet.model';
import { MovementEvent } from '../../core/models/movement.model';
import { Player } from '../../core/models/player.model';

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

  private readonly canvasWidth = 400;
  private readonly canvasHeight = 400;
  private readonly tankSize = 30;
  private readonly moveSpeed = 40;
  private readonly bulletSpeed = 8;

  private animationId: number | null = null;

  tank: Tank = {
    id: 'player-1',
    position: { x: 40, y: 40 },
    direction: 'right',
    health: 100,
    isActive: true
  };

  bullets: Bullet[] = [];
  private bulletIdCounter = 0;

  ngOnInit(): void {
    this.playersStore.connect();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    this.startGameLoop();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.playersStore.disconnect();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const directionMap: { [key: string]: 'up' | 'down' | 'left' | 'right' } = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right'
    };

    const direction = directionMap[event.key];
    if (direction) {
      event.preventDefault();
      this.moveTank(direction);
      return;
    }

    if (event.key === ' ' || event.key === 'Space') {
      event.preventDefault();
      this.shoot();
    }
  }

  private moveTank(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.tank.direction = direction;

    const deltaMap = {
      up: { x: 0, y: -this.moveSpeed },
      down: { x: 0, y: this.moveSpeed },
      left: { x: -this.moveSpeed, y: 0 },
      right: { x: this.moveSpeed, y: 0 }
    };

    const delta = deltaMap[direction];
    const newX = this.tank.position.x + delta.x;
    const newY = this.tank.position.y + delta.y;

    if (!this.checkCollision(newX, newY)) {
      this.tank.position.x = Math.max(0, Math.min(this.canvasWidth - this.tankSize, newX));
      this.tank.position.y = Math.max(0, Math.min(this.canvasHeight - this.tankSize, newY));
    }

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

  private checkCollision(x: number, y: number): boolean {
    const tiles = this.mapStore.tiles();
    const tileSize = this.mapStore.tileSize();

    const corners = [
      { x: x, y: y },
      { x: x + this.tankSize - 1, y: y },
      { x: x, y: y + this.tankSize - 1 },
      { x: x + this.tankSize - 1, y: y + this.tankSize - 1 }
    ];

    for (const corner of corners) {
      const tileX = Math.floor(corner.x / tileSize);
      const tileY = Math.floor(corner.y / tileSize);

      if (tileY >= 0 && tileY < tiles.length && tileX >= 0 && tileX < tiles[0].length) {
        const tileType = tiles[tileY][tileX];
        if (tileType === 1 || tileType === 2) {
          return true;
        }
      }
    }
    return false;
  }

  private shoot(): void {
    if (this.gameStore.ammunition() <= 0) return;

    this.gameStore.decreaseAmmunition(1);

    const bulletOffset = this.tankSize / 2 - 3;
    let bulletX = this.tank.position.x + bulletOffset;
    let bulletY = this.tank.position.y + bulletOffset;

    switch (this.tank.direction) {
      case 'up':
        bulletY = this.tank.position.y - 10;
        break;
      case 'down':
        bulletY = this.tank.position.y + this.tankSize;
        break;
      case 'left':
        bulletX = this.tank.position.x - 10;
        break;
      case 'right':
        bulletX = this.tank.position.x + this.tankSize;
        break;
    }

    const bullet: Bullet = {
      id: `bullet-${++this.bulletIdCounter}`,
      position: { x: bulletX, y: bulletY },
      direction: this.tank.direction,
      speed: this.bulletSpeed,
      active: true
    };

    this.bullets.push(bullet);
  }

  private updateBullets(): void {
    const tiles = this.mapStore.tiles();
    const tileSize = this.mapStore.tileSize();

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      switch (bullet.direction) {
        case 'up':
          bullet.position.y -= bullet.speed;
          break;
        case 'down':
          bullet.position.y += bullet.speed;
          break;
        case 'left':
          bullet.position.x -= bullet.speed;
          break;
        case 'right':
          bullet.position.x += bullet.speed;
          break;
      }

      if (bullet.position.x < 0 || bullet.position.x > this.canvasWidth ||
          bullet.position.y < 0 || bullet.position.y > this.canvasHeight) {
        bullet.active = false;
        continue;
      }

      const tileX = Math.floor(bullet.position.x / tileSize);
      const tileY = Math.floor(bullet.position.y / tileSize);

      if (tileY >= 0 && tileY < tiles.length && tileX >= 0 && tileX < tiles[0].length) {
        const tileType = tiles[tileY][tileX];
        if (tileType === 2) {
          this.mapStore.destroyTile(tileX, tileY);
          this.gameStore.incrementScore(10);
          bullet.active = false;
        } else if (tileType === 1) {
          bullet.active = false;
        }
      }
    }

    this.bullets = this.bullets.filter(b => b.active);
  }

  private startGameLoop(): void {
    const loop = () => {
      this.updateBullets();
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawMap(ctx);
    this.drawRemotePlayers(ctx);
    this.drawTank(ctx);
    this.drawBullets(ctx);
  }

  private drawMap(ctx: CanvasRenderingContext2D): void {
    const tiles = this.mapStore.tiles();
    const tileSize = this.mapStore.tileSize();

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tileType = tiles[y][x];
        if (tileType === 0) continue;

        if (tileType === 1) {
          ctx.fillStyle = '#404040';
        } else if (tileType === 2) {
          ctx.fillStyle = '#8B4513';
        }

        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        ctx.strokeStyle = '#222222';
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  private drawRemotePlayers(ctx: CanvasRenderingContext2D): void {
    const remotePlayers = this.playersStore.remotePlayers();
    for (const player of remotePlayers) {
      this.drawRemoteTank(ctx, player);
    }
  }

  private drawRemoteTank(ctx: CanvasRenderingContext2D, player: Player): void {
    const { x, y } = player.position;
    const size = this.tankSize;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    const rotationMap = { up: -90, down: 90, left: 180, right: 0 };
    const angle = (rotationMap[player.direction] * Math.PI) / 180;
    ctx.rotate(angle);

    ctx.fillStyle = '#8b0000';
    ctx.fillRect(-size / 2, -size / 2.5, size, size / 1.25);

    ctx.fillStyle = '#5c0000';
    ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

    ctx.fillStyle = '#cc0000';
    ctx.fillRect(size / 4, -3, size / 2.5, 6);

    ctx.restore();

    ctx.fillStyle = '#ff4444';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, centerX, y - 5);
  }

  private drawTank(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.tank.position;
    const size = this.tankSize;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    const rotationMap = { up: -90, down: 90, left: 180, right: 0 };
    const angle = (rotationMap[this.tank.direction] * Math.PI) / 180;
    ctx.rotate(angle);

    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(-size / 2, -size / 2.5, size, size / 1.25);

    ctx.fillStyle = '#1b4332';
    ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

    ctx.fillStyle = '#40916c';
    ctx.fillRect(size / 4, -3, size / 2.5, 6);

    ctx.restore();
  }

  private drawBullets(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ffff00';
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
