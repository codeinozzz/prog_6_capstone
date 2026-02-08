import { Component, EventEmitter, OnDestroy, OnInit, Output, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Player } from '../../core/models/player.model';
import { PlayersStore } from '../../store/players/players.store';
import { RoomService } from '../../core/services/room.service';
import { RoomResponse } from '../../core/models/room.model';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss']
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private readonly playersStore = inject(PlayersStore);
  private readonly roomService = inject(RoomService);
  private readonly knownPlayerIds = new Set<string>();

  readonly players = this.playersStore.playersList;
  readonly localPlayer = this.playersStore.localPlayer;
  readonly chatMessages = this.playersStore.chatMessages;

  rooms: RoomResponse[] = [];
  newRoomName = '';
  selectedMap = 'desert';
  errorMessage = '';
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
    this.loadRooms();
  }

  ngOnDestroy(): void {
    this.playersStore.disconnect();
    this.knownPlayerIds.clear();
  }

  loadRooms(): void {
    this.roomService.getRooms().subscribe({
      next: (rooms) => this.rooms = rooms,
      error: () => this.errorMessage = 'Error loading rooms'
    });
  }

  createRoom(): void {
    if (!this.newRoomName.trim()) return;

    this.roomService.createRoom(this.newRoomName, this.selectedMap).subscribe({
      next: (room) => {
        this.rooms.push(room);
        this.newRoomName = '';
      },
      error: () => this.errorMessage = 'Error creating room'
    });
  }

  joinRoom(roomId: number): void {
    this.roomService.joinRoom(roomId).subscribe({
      next: () => {
        this.loadRooms();
      },
      error: (err) => {
        if (err.status === 400) {
          this.errorMessage = 'Room full or unavailable';
        } else {
          this.errorMessage = 'Error joining room';
        }
      }
    });
  }

  sendMessage(): void {
    const trimmedMessage = this.messageText.trim();
    if (!trimmedMessage) return;

    const senderName = this.localPlayer()?.name ?? 'Player';
    this.playersStore.sendChatMessage(senderName, trimmedMessage);
    this.messageText = '';
  }
}
