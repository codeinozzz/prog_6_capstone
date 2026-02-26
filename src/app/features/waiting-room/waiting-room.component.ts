import { Component, EventEmitter, OnDestroy, OnInit, Output, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Player } from '../../core/models/player.model';
import { PlayersStore } from '../../store/players/players.store';
import { RoomService } from '../../core/services/room.service';
import { RoomResponse } from '../../core/models/room.model';
import { MqttEventsStore } from '../../store/mqtt/mqtt-events.store';
import { GameService } from '../../core/services/game.service';

interface RoomHistoryEvent {
  type: string;
  roomId: string;
  payload: string;
  timestamp: number;
}

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
  private readonly mqttStore = inject(MqttEventsStore);
  private readonly gameService = inject(GameService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly knownPlayerIds = new Set<string>();

  readonly players = this.playersStore.playersList;
  readonly localPlayer = this.playersStore.localPlayer;
  readonly chatMessages = this.playersStore.chatMessages;

  rooms: RoomResponse[] = [];
  newRoomName = '';
  selectedMap = 'desert';
  errorMessage = '';
  messageText = '';
  loading = false;

  currentRoom: RoomResponse | null = null;
  isHost = false;
  roomHistory: RoomHistoryEvent[] = [];
  private isNavigatingToGame = false;

  private gameStartedSub: Subscription | null = null;
  private historySub: Subscription | null = null;

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

    this.gameStartedSub = this.playersStore.onGameStarted().subscribe((mapName) => {
      this.isNavigatingToGame = true;
      this.router.navigate(['/game'], { queryParams: { map: mapName } });
    });

    // Escuchar historial enviado por SignalR cuando el jugador se une
    this.historySub = this.gameService.onRoomHistory().subscribe((history) => {
      this.roomHistory = history ?? [];
    });
  }

  ngOnDestroy(): void {
    this.gameStartedSub?.unsubscribe();
    this.historySub?.unsubscribe();

    if (this.currentRoom && !this.isNavigatingToGame) {
      this.roomService.leaveRoom(this.currentRoom.id).subscribe();
      this.playersStore.leaveRoom();
      this.mqttStore.disconnect();
    }

    if (!this.isNavigatingToGame) {
      this.playersStore.disconnect();
    }
    this.knownPlayerIds.clear();
  }

  loadRooms(): void {
    this.roomService.getRooms().subscribe({
      next: (rooms) => this.rooms = rooms,
      error: () => this.errorMessage = 'Error loading rooms'
    });
  }

  createRoom(): void {
    if (!this.newRoomName.trim() || this.loading) return;
    this.loading = true;

    this.roomService.createRoom(this.newRoomName, this.selectedMap).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (room) => {
        this.rooms = [...this.rooms, room];
        this.currentRoom = room;
        this.isHost = true;
        this.newRoomName = '';
        localStorage.setItem('currentRoomId', room.id.toString());
        this.loadRoomHistory(room.id.toString());
        this.mqttStore.connectToRoom(room.id.toString());
      },
      error: () => this.errorMessage = 'Error creating room'
    });
  }

  joinRoom(room: RoomResponse): void {
    if (this.loading) return;
    this.loading = true;

    this.roomService.joinRoom(room.id).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => {
        this.currentRoom = room;
        this.isHost = false;
        localStorage.setItem('currentRoomId', room.id.toString());
        this.loadRoomHistory(room.id.toString());
        this.mqttStore.connectToRoom(room.id.toString());
      },
      error: (err) => {
        if (err.status === 409) {
          this.errorMessage = 'Room full or unavailable';
        } else if (err.status === 401) {
          this.errorMessage = 'Authentication required';
        } else {
          this.errorMessage = 'Error joining room';
        }
      }
    });
  }

  leaveRoom(): void {
    if (this.currentRoom) {
      this.roomService.leaveRoom(this.currentRoom.id).subscribe({
        next: () => this.loadRooms(),
        error: () => this.loadRooms()
      });
      this.playersStore.leaveRoom();
      this.mqttStore.disconnect();
    }
    this.currentRoom = null;
    this.isHost = false;
    this.roomHistory = [];
  }

  startGame(): void {
    if (!this.currentRoom) return;
    const mapName = this.currentRoom.mapName ?? this.selectedMap;
    this.playersStore.startGame(mapName);
  }

  deleteRoom(roomId: number): void {
    if (this.loading) return;
    this.loading = true;

    this.roomService.deleteRoom(roomId).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => this.rooms = this.rooms.filter(r => r.id !== roomId),
      error: () => this.errorMessage = 'Error deleting room'
    });
  }

  sendMessage(): void {
    const trimmedMessage = this.messageText.trim();
    if (!trimmedMessage) return;

    const senderName = this.localPlayer()?.name ?? 'Player';
    this.playersStore.sendChatMessage(senderName, trimmedMessage);
    this.messageText = '';
  }

  /** Cargar historial de Redis para la sala */
  private loadRoomHistory(roomId: string): void {
    this.http.get<RoomHistoryEvent[]>(`http://localhost:5174/api/history/${roomId}?count=20`)
      .subscribe({
        next: (events) => this.roomHistory = events,
        error: () => console.warn('[History] Redis not available')
      });
  }

  /** Formatea el payload del historial para mostrar */
  formatHistoryPayload(event: RoomHistoryEvent): string {
    try {
      const obj = JSON.parse(event.payload);
      switch (event.type) {
        case 'chat': return `${obj.sender}: ${obj.message}`;
        case 'powerup_spawned': return `Power-up ${obj.type} at (${Math.round(obj.x)}, ${Math.round(obj.y)})`;
        case 'powerup_collected': return `${obj.collectorName ?? 'Player'} collected power-up`;
        case 'collision': return `Collision: ${obj.damage} damage`;
        case 'game_end': return `Game over! Winner: ${obj.winnerName}`;
        default: return event.payload.slice(0, 60);
      }
    } catch {
      return event.payload.slice(0, 60);
    }
  }
}
