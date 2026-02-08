import { Component, EventEmitter, OnDestroy, OnInit, Output, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Player } from '../../core/models/player.model';
import { PlayersStore } from '../../store/players/players.store';
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage } from '../../core/models/chat-message.model';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss']
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private readonly playersStore = inject(PlayersStore);
  private readonly chatService = inject(ChatService);
  private readonly knownPlayerIds = new Set<string>();
  private chatSubscription: Subscription | null = null;

  readonly players = this.playersStore.playersList;
  readonly localPlayer = this.playersStore.localPlayer;
  readonly messages: ChatMessage[] = [];

  messageText = '';

  @Output() playerJoined = new EventEmitter<Player>();

  constructor() {
    effect(() => {
      const players = this.players();
      for (const player of players) {
        if (!this.knownPlayerIds.has(player.id)) {
          this.knownPlayerIds.add(player.id);
          this.playerJoined.emit(player);
        }
      }
    });
  }

  ngOnInit(): void {
    this.playersStore.connect();
    this.chatService.connect();
    this.chatSubscription = this.chatService.onMessage().subscribe((message) => {
      this.messages.push(message);
    });
  }

  ngOnDestroy(): void {
    this.playersStore.disconnect();
    this.chatSubscription?.unsubscribe();
    this.chatService.disconnect();
    this.knownPlayerIds.clear();
  }

  sendMessage(): void {
    const trimmedMessage = this.messageText.trim();
    if (!trimmedMessage) return;

    const senderName = this.localPlayer()?.name ?? 'You';
    const message: ChatMessage = {
      sender: senderName,
      text: trimmedMessage,
      timestamp: Date.now()
    };

    this.messages.push(message);
    this.chatService.sendMessage(message);
    this.messageText = '';
  }
}
