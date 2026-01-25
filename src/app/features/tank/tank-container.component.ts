import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovementEvent } from '../../core/models/movement.model';
import { PlayersStore } from '../../store/players/players.store';
import { GameCanvasComponent } from '../game-canvas/game-canvas.component';

@Component({
  selector: 'app-tank-container',
  standalone: true,
  imports: [CommonModule, GameCanvasComponent],
  templateUrl: './tank-container.component.html',
  styleUrls: ['./tank-container.component.scss']
})
export class TankContainerComponent implements OnInit, OnDestroy {
  private readonly playersStore = inject(PlayersStore);

  readonly localPlayer = this.playersStore.localPlayer;
  readonly isConnected = this.playersStore.isConnected;

  ngOnInit(): void {
    this.playersStore.connect();
    console.log('[Tank Container] Connecting to SignalR hub');
  }

  ngOnDestroy(): void {
    this.playersStore.disconnect();
    console.log('[Tank Container] Disconnected from hub');
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isConnected() || !this.localPlayer()) return;

    const keyMap: { [key: string]: 'up' | 'down' | 'left' | 'right' } = {
      ArrowUp: 'up',
      w: 'up',
      W: 'up',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right'
    };

    const direction = keyMap[event.key];
    if (!direction) return;

    event.preventDefault();
    this.moveLocalPlayer(direction);
  }

  private moveLocalPlayer(direction: 'up' | 'down' | 'left' | 'right'): void {
    const localPlayer = this.localPlayer();
    if (!localPlayer) return;

    const moveDistance = 20;
    const newPosition = { ...localPlayer.position };

    switch (direction) {
      case 'up':
        newPosition.y = Math.max(0, newPosition.y - moveDistance);
        break;
      case 'down':
        newPosition.y = Math.min(500, newPosition.y + moveDistance);
        break;
      case 'left':
        newPosition.x = Math.max(0, newPosition.x - moveDistance);
        break;
      case 'right':
        newPosition.x = Math.min(500, newPosition.x + moveDistance);
        break;
    }

    this.playersStore.updatePlayerPosition(localPlayer.id, newPosition, direction);

    const movement: MovementEvent = {
      playerId: localPlayer.id,
      position: newPosition,
      direction,
      timestamp: Date.now()
    };
    this.playersStore.sendPlayerMove(movement);
  }
}
