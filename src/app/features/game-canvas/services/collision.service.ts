import { Injectable } from '@angular/core';
import { TileType } from '../../../core/models/map.model';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TANK_SIZE } from '../constants/game.constants';

@Injectable({ providedIn: 'root' })
export class CollisionService {
  checkTankCollision(x: number, y: number, tiles: TileType[][], tileSize: number): boolean {
    const corners = [
      { x, y },
      { x: x + TANK_SIZE - 1, y },
      { x, y: y + TANK_SIZE - 1 },
      { x: x + TANK_SIZE - 1, y: y + TANK_SIZE - 1 },
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

  checkBulletTileCollision(
    x: number, y: number, tiles: TileType[][], tileSize: number
  ): { hit: boolean; tileX: number; tileY: number; tileType: TileType } {
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);

    if (tileY >= 0 && tileY < tiles.length && tileX >= 0 && tileX < tiles[0].length) {
      const tileType = tiles[tileY][tileX];
      if (tileType === 1 || tileType === 2) {
        return { hit: true, tileX, tileY, tileType };
      }
    }
    return { hit: false, tileX, tileY, tileType: 0 };
  }

  isOutOfBounds(x: number, y: number): boolean {
    return x < 0 || x > CANVAS_WIDTH || y < 0 || y > CANVAS_HEIGHT;
  }
}
