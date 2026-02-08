import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerHub } from '../player-hub/player-hub';
import { GameCanvasComponent } from '../game-canvas/game-canvas.component';
import { PlayersStore } from '../../store';

@Component({
  selector: 'app-game',
  imports: [CommonModule, FormsModule, PlayerHub, GameCanvasComponent],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game {
  private readonly playersStore = inject(PlayersStore);

  readonly chatMessages = this.playersStore.chatMessages;
  readonly localPlayer = this.playersStore.localPlayer;
  readonly remotePlayers = this.playersStore.remotePlayers;
  readonly isConnected = this.playersStore.isConnected;

  messageText = '';

  sendMessage(): void {
    const trimmed = this.messageText.trim();
    if (!trimmed) return;

    const sender = this.localPlayer()?.name ?? 'Player';
    this.playersStore.sendChatMessage(sender, trimmed);
    this.messageText = '';
  }
}
