import { Injectable } from '@angular/core';
import { TileType } from '../../../core/models/map.model';
import { Tank } from '../../../core/models/tank.model';
import { Bullet } from '../../../core/models/bullet.model';
import { Player } from '../../../core/models/player.model';
import {
  TANK_SIZE, BULLET_RADIUS,
  MapTheme, COLORS, ROTATION_MAP
} from '../constants/game.constants';

@Injectable({ providedIn: 'root' })
export class RenderingService {
  clearCanvas(ctx: CanvasRenderingContext2D, theme: MapTheme = COLORS): void {
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  drawMap(ctx: CanvasRenderingContext2D, tiles: TileType[][], tileSize: number, theme: MapTheme = COLORS): void {
    const mapW = (tiles[0]?.length ?? 10) * tileSize;
    const mapH = tiles.length * tileSize;

    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, mapW, mapH);

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tileType = tiles[y][x];
        if (tileType === 0) continue;

        ctx.fillStyle = tileType === 1 ? theme.tileStone : theme.tileBrick;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        ctx.strokeStyle = theme.tileStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  drawLocalTank(ctx: CanvasRenderingContext2D, tank: Tank, theme: MapTheme = COLORS): void {
    this.drawTankShape(
      ctx, tank.position.x, tank.position.y, tank.direction,
      theme.localTankBody, theme.localTankTurret, theme.localTankBarrel
    );
  }

  drawRemoteTank(ctx: CanvasRenderingContext2D, player: Player, theme: MapTheme = COLORS): void {
    this.drawTankShape(
      ctx, player.position.x, player.position.y, player.direction,
      theme.remoteTankBody, theme.remoteTankTurret, theme.remoteTankBarrel
    );

    const centerX = player.position.x + TANK_SIZE / 2;
    ctx.fillStyle = theme.remoteTankLabel;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, centerX, player.position.y - 5);
  }

  drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[], color: string = COLORS.bullet): void {
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
