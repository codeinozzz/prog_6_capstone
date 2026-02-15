import { Injectable } from '@angular/core';
import { TileType } from '../../../core/models/map.model';
import { Tank } from '../../../core/models/tank.model';
import { Bullet } from '../../../core/models/bullet.model';
import { Player } from '../../../core/models/player.model';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, TANK_SIZE, BULLET_RADIUS,
  COLORS, ROTATION_MAP
} from '../constants/game.constants';

@Injectable({ providedIn: 'root' })
export class RenderingService {
  clearCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawMap(ctx: CanvasRenderingContext2D, tiles: TileType[][], tileSize: number): void {
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tileType = tiles[y][x];
        if (tileType === 0) continue;

        ctx.fillStyle = tileType === 1 ? COLORS.tileStone : COLORS.tileBrick;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        ctx.strokeStyle = COLORS.tileStroke;
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  drawLocalTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
    this.drawTankShape(
      ctx, tank.position.x, tank.position.y, tank.direction,
      COLORS.localTankBody, COLORS.localTankTurret, COLORS.localTankBarrel
    );
  }

  drawRemoteTank(ctx: CanvasRenderingContext2D, player: Player): void {
    this.drawTankShape(
      ctx, player.position.x, player.position.y, player.direction,
      COLORS.remoteTankBody, COLORS.remoteTankTurret, COLORS.remoteTankBarrel
    );

    const centerX = player.position.x + TANK_SIZE / 2;
    ctx.fillStyle = COLORS.remoteTankLabel;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, centerX, player.position.y - 5);
  }

  drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[], color = COLORS.bullet): void {
    ctx.fillStyle = color;
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTankShape(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    direction: string,
    bodyColor: string, turretColor: string, barrelColor: string
  ): void {
    const size = TANK_SIZE;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    const angle = ((ROTATION_MAP[direction] ?? 0) * Math.PI) / 180;
    ctx.rotate(angle);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-size / 2, -size / 2.5, size, size / 1.25);

    ctx.fillStyle = turretColor;
    ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

    ctx.fillStyle = barrelColor;
    ctx.fillRect(size / 4, -3, size / 2.5, 6);

    ctx.restore();
  }
}
