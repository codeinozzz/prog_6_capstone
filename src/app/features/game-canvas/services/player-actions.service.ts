import { inject, Injectable } from '@angular/core';
import { Tank } from '../../../core/models/tank.model';
import { Bullet } from '../../../core/models/bullet.model';
import { MovementEvent } from '../../../core/models/movement.model';
import { MapStore, GameStore, PlayersStore, MqttEventsStore } from '../../../store';
import { GameService } from '../../../core/services/game.service';
import { MqttService } from '../../../core/services/mqtt.service';
import { CollisionService } from './collision.service';
import { TANK_SIZE, MOVE_SPEED, BULLET_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/game.constants';
import type { PowerUpEvent } from '../../../core/models/mqtt-event.model';

@Injectable({ providedIn: 'root' })
export class PlayerActionsService {
  private readonly mapStore = inject(MapStore);
  private readonly gameStore = inject(GameStore);
  private readonly playersStore = inject(PlayersStore);
  private readonly mqttStore = inject(MqttEventsStore);
  private readonly mqttService = inject(MqttService);
  private readonly gameService = inject(GameService);
  private readonly collisionService = inject(CollisionService);

  moveTank(tank: Tank, direction: 'up' | 'down' | 'left' | 'right'): void {
    if (this.gameStore.playerStatus() === 'dead') return;

    tank.direction = direction;

    const delta = { up: { x: 0, y: -MOVE_SPEED }, down: { x: 0, y: MOVE_SPEED }, left: { x: -MOVE_SPEED, y: 0 }, right: { x: MOVE_SPEED, y: 0 } }[direction];
    const newX = tank.position.x + delta.x;
    const newY = tank.position.y + delta.y;

    if (!this.collisionService.checkTankCollision(newX, newY, this.mapStore.tiles(), this.mapStore.tileSize())) {
      tank.position.x = Math.max(0, Math.min(CANVAS_WIDTH - TANK_SIZE, newX));
      tank.position.y = Math.max(0, Math.min(CANVAS_HEIGHT - TANK_SIZE, newY));
    }
  }

  broadcastMovement(tank: Tank): void {
    const localPlayerId = this.playersStore.localPlayerId();
    if (!localPlayerId) return;

    const movement: MovementEvent = {
      playerId: localPlayerId,
      position: { x: tank.position.x, y: tank.position.y },
      direction: tank.direction,
      timestamp: Date.now()
    };

    this.playersStore.updatePlayerPosition(localPlayerId, movement.position, movement.direction);
    this.playersStore.sendPlayerMove(movement);
  }

  shoot(tank: Tank, bullets: Bullet[], counter: number): { bullets: Bullet[]; counter: number } {
    if (this.gameStore.playerStatus() === 'dead' || this.gameStore.ammunition() <= 0) {
      return { bullets, counter };
    }

    this.gameStore.decreaseAmmunition(1);

    const bulletOffset = TANK_SIZE / 2 - 3;
    let bulletX = tank.position.x + bulletOffset;
    let bulletY = tank.position.y + bulletOffset;

    switch (tank.direction) {
      case 'up':    bulletY = tank.position.y - 10; break;
      case 'down':  bulletY = tank.position.y + TANK_SIZE; break;
      case 'left':  bulletX = tank.position.x - 10; break;
      case 'right': bulletX = tank.position.x + TANK_SIZE; break;
    }

    const newBullet: Bullet = {
      id: `bullet-${++counter}`,
      position: { x: bulletX, y: bulletY },
      direction: tank.direction,
      speed: BULLET_SPEED,
      active: true
    };

    const localPlayerId = this.playersStore.localPlayerId();
    if (localPlayerId) {
      this.gameService.sendBulletFired(localPlayerId, bulletX, bulletY, tank.direction);
    }

    return { bullets: [...bullets, newBullet], counter };
  }

  checkPowerUpCollection(tank: Tank): void {
    const localId = this.playersStore.localPlayerId() ?? '';
    const roomId = localStorage.getItem('currentRoomId') ?? 'default';

    for (const pu of this.mqttStore.activePowerUps().filter(p => p.active)) {
      if (Math.abs(tank.position.x - pu.x) < TANK_SIZE && Math.abs(tank.position.y - pu.y) < TANK_SIZE) {
        this.applyPowerUp(pu);
        this.gameStore.incrementScore(25);
        this.mqttService.publishPowerUpCollected(roomId, pu.id, localId);
        this.gameService.collectPowerUp(pu.id);
        this.mqttStore.removePowerUp(pu.id);
      }
    }
  }

  applyDamage(damage: number): void {
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
        if (this.gameStore.health() >= 40) this.gameStore.setPlayerStatus('alive');
        console.log('[PowerUp] +25 health');
        break;
      case 'speed':
        console.log('[PowerUp] Speed boost (cosmetic)');
        break;
    }
  }
}
