import { Injectable } from '@angular/core';
import { TileType } from '../../../core/models/map.model';
import { Tank } from '../../../core/models/tank.model';
import { Bullet } from '../../../core/models/bullet.model';
import { Player } from '../../../core/models/player.model';
import type { PowerUpEvent } from '../../../core/models/mqtt-event.model';
import {
  TANK_SIZE, BULLET_RADIUS,
  MapTheme, COLORS, ROTATION_MAP
} from '../constants/game.constants';

const POWERUP_SIZE = 20;
const POWERUP_COLORS: Record<string, string> = { ammo: '#ffcc00', health: '#00cc44', speed: '#00aaff' };

export interface HudData {
  health: number;
  score: number;
  ammo: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class RenderingService {
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

  drawHUD(ctx: CanvasRenderingContext2D, hud: HudData): void {
    ctx.save();

    const barW = 150, barH = 14, barX = 10, barY = 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hud.health > 60 ? '#00cc44' : hud.health > 30 ? '#ffaa00' : '#cc0000';
    ctx.fillRect(barX, barY, (hud.health / 100) * barW, barH);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${hud.health}`, barX + 4, barY + 11);

    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Score: ${hud.score}`, barX, barY + 32);
    ctx.fillText(`Ammo: ${hud.ammo}`, barX, barY + 48);

    if (hud.status === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU DIED', ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.fillStyle = '#aaa';
      ctx.font = '18px monospace';
      ctx.fillText(`Final Score: ${hud.score}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 40);
    }

    ctx.restore();
  }

  drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpEvent): void {
    const color = POWERUP_COLORS[pu.type] ?? '#ffffff';
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
