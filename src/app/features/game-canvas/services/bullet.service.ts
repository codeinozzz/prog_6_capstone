import { inject, Injectable } from '@angular/core';
import { Bullet } from '../../../core/models/bullet.model';
import { CollisionService } from './collision.service';
import { MapStore, GameStore, PlayersStore } from '../../../store';
import { GameService } from '../../../core/services/game.service';

@Injectable({ providedIn: 'root' })
export class BulletService {
  private readonly mapStore = inject(MapStore);
  private readonly gameStore = inject(GameStore);
  private readonly playersStore = inject(PlayersStore);
  private readonly collisionService = inject(CollisionService);
  private readonly gameService = inject(GameService);

  update(bullets: Bullet[], isLocal: boolean): Bullet[] {
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
            this.gameStore.incrementScore(100);
            this.gameService.reportCollision(remotePlayer.id, 25);
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
}
