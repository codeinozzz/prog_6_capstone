import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerHub } from '../player-hub/player-hub';
import { GameCanvasComponent } from '../game-canvas/game-canvas.component';
import { PlayersStore, MapStore } from '../../store';
import { GameService } from '../../core/services/game.service';

@Component({
  selector: 'app-game',
  imports: [CommonModule, FormsModule, PlayerHub, GameCanvasComponent],
  templateUrl: './game.html',
  styleUrl: './game.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Game implements OnInit, OnDestroy {
  private readonly playersStore = inject(PlayersStore);
  private readonly mapStore = inject(MapStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly chatMessages = this.playersStore.chatMessages;
  readonly localPlayer = this.playersStore.localPlayer;
  readonly remotePlayers = this.playersStore.remotePlayers;
  readonly isConnected = this.playersStore.isConnected;

  messageText = '';
  winner: { id: string; name: string } | null = null;

  private gameOverSub: Subscription | null = null;

  ngOnInit(): void {
    const mapName = this.route.snapshot.queryParamMap.get('map') ?? 'desert';
    this.mapStore.loadMap(mapName);

    this.gameOverSub = this.gameService.onGameOver().subscribe(({ winnerId, winnerName }) => {
      this.winner = { id: winnerId, name: winnerName };
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.gameOverSub?.unsubscribe();
  }

  sendMessage(): void {
    const trimmed = this.messageText.trim();
    if (!trimmed) return;

    const sender = this.localPlayer()?.name ?? 'Player';
    this.playersStore.sendChatMessage(sender, trimmed);
    this.messageText = '';
  }

  dismissWinner(): void {
    this.winner = null;
    this.gameService.leaveRoom();
    this.playersStore.disconnect();
    this.router.navigate(['/waiting-room']);
  }

  isLocalWinner(): boolean {
    return this.winner?.id === this.playersStore.localPlayerId();
  }
}
