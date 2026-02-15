import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PlayerHub } from '../player-hub/player-hub';
import { GameCanvasComponent } from '../game-canvas/game-canvas.component';
import { PlayersStore, MapStore } from '../../store';

@Component({
  selector: 'app-game',
  imports: [CommonModule, FormsModule, PlayerHub, GameCanvasComponent],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit {
  private readonly playersStore = inject(PlayersStore);
  private readonly mapStore = inject(MapStore);
  private readonly route = inject(ActivatedRoute);

  readonly chatMessages = this.playersStore.chatMessages;
  readonly localPlayer = this.playersStore.localPlayer;
  readonly remotePlayers = this.playersStore.remotePlayers;
  readonly isConnected = this.playersStore.isConnected;

  messageText = '';

  ngOnInit(): void {
    const mapName = this.route.snapshot.queryParamMap.get('map') ?? 'desert';
    this.mapStore.loadMap(mapName);
  }

  sendMessage(): void {
    const trimmed = this.messageText.trim();
    if (!trimmed) return;

    const sender = this.localPlayer()?.name ?? 'Player';
    this.playersStore.sendChatMessage(sender, trimmed);
    this.messageText = '';
  }
}
