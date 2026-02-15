import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, from } from 'rxjs';
import { map } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { MovementEvent } from '../models/movement.model';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private connection: signalR.HubConnection;

  private readonly connectionSubject = new BehaviorSubject<boolean>(false);
  private readonly movementSubject = new Subject<{ playerId: string; movement: MovementEvent }>();
  private readonly chatSubject = new Subject<ChatMessage>();
  private readonly playerJoinedSubject = new Subject<{ playerId: string; playerName: string; x: number; y: number }>();
  private readonly playerLeftSubject = new Subject<string>();
  private readonly gameStartedSubject = new Subject<string>();
  private readonly existingPlayersSubject = new Subject<{ playerId: string; playerName: string; x: number; y: number }[]>();
  private readonly bulletFiredSubject = new Subject<{ playerId: string; x: number; y: number; direction: string }>();
  private readonly tileDestroyedSubject = new Subject<{ tileX: number; tileY: number }>();

  private localPlayerId: string | null = null;

  private readonly HUB_URL = 'http://localhost:5174/gamehub';

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL)
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();
  }

  connect(): Observable<string> {
    return from(this.connection.start()).pipe(
      map(() => {
        this.localPlayerId = this.connection.connectionId ?? `player-${Date.now()}`;
        this.connectionSubject.next(true);
        console.log('[SignalR] Connected with ID:', this.localPlayerId);
        return this.localPlayerId;
      })
    );
  }

  disconnect(): void {
    this.connection.stop();
    this.connectionSubject.next(false);
    this.localPlayerId = null;
    console.log('[SignalR] Disconnected');
  }

  sendPlayerMove(movement: MovementEvent): void {
    const sendTimestamp = Date.now();
    this.connection.invoke('SendPlayerMove', movement.playerId, {
      position: movement.position,
      direction: movement.direction,
      timestamp: sendTimestamp
    }).catch(err => console.error('[SignalR] SendPlayerMove error:', err));
  }

  sendChatMessage(sender: string, message: string): void {
    this.connection.invoke('SendChatMessage', sender, message)
      .catch(err => console.error('[SignalR] SendChatMessage error:', err));
  }

  joinGame(playerId: string, playerName: string, roomId?: string, x = 0, y = 0): void {
    this.connection.invoke('JoinGame', playerId, playerName, roomId ?? '', x, y)
      .catch(err => console.error('[SignalR] JoinGame error:', err));
  }

  leaveRoom(): void {
    this.connection.invoke('LeaveRoom')
      .catch(err => console.error('[SignalR] LeaveRoom error:', err));
  }

  startGame(mapName: string): void {
    this.connection.invoke('StartGame', mapName)
      .catch(err => console.error('[SignalR] StartGame error:', err));
  }

  sendBulletFired(playerId: string, x: number, y: number, direction: string): void {
    this.connection.invoke('BulletFired', playerId, x, y, direction)
      .catch(err => console.error('[SignalR] BulletFired error:', err));
  }

  sendTileDestroyed(tileX: number, tileY: number): void {
    this.connection.invoke('TileDestroyed', tileX, tileY)
      .catch(err => console.error('[SignalR] TileDestroyed error:', err));
  }

  onGameStarted(): Observable<string> {
    return this.gameStartedSubject.asObservable();
  }

  onPlayerMove(): Observable<{ playerId: string; movement: MovementEvent }> {
    return this.movementSubject.asObservable();
  }

  onChatMessage(): Observable<ChatMessage> {
    return this.chatSubject.asObservable();
  }

  onPlayerJoined(): Observable<{ playerId: string; playerName: string; x: number; y: number }> {
    return this.playerJoinedSubject.asObservable();
  }

  onPlayerLeft(): Observable<string> {
    return this.playerLeftSubject.asObservable();
  }

  onExistingPlayers(): Observable<{ playerId: string; playerName: string; x: number; y: number }[]> {
    return this.existingPlayersSubject.asObservable();
  }

  onBulletFired(): Observable<{ playerId: string; x: number; y: number; direction: string }> {
    return this.bulletFiredSubject.asObservable();
  }

  onTileDestroyed(): Observable<{ tileX: number; tileY: number }> {
    return this.tileDestroyedSubject.asObservable();
  }

  getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  private registerHandlers(): void {
    this.connection.on('ReceivePlayerMove', (playerId: string, movement: any) => {
      const receiveTimestamp = Date.now();
      const latency = receiveTimestamp - (movement.timestamp ?? receiveTimestamp);
      console.log(`[SignalR] ReceivePlayerMove from ${playerId} | latency: ${latency}ms`);

      const movementEvent: MovementEvent = {
        playerId,
        position: movement.position,
        direction: movement.direction,
        timestamp: movement.timestamp
      };
      this.movementSubject.next({ playerId, movement: movementEvent });
    });

    this.connection.on('ReceiveChatMessage', (sender: string, message: string) => {
      const receiveTimestamp = Date.now();
      this.chatSubject.next({ sender, text: message, timestamp: receiveTimestamp });
    });

    this.connection.on('PlayerJoined', (playerId: string, playerName: string, x: number, y: number) => {
      console.log(`[SignalR] PlayerJoined: ${playerName} (${playerId}) at (${x}, ${y})`);
      this.playerJoinedSubject.next({ playerId, playerName, x, y });
    });

    this.connection.on('PlayerLeft', (connectionId: string) => {
      console.log(`[SignalR] PlayerLeft: ${connectionId}`);
      this.playerLeftSubject.next(connectionId);
    });

    this.connection.on('ConnectionEstablished', (connectionId: string) => {
      this.localPlayerId = connectionId;
      console.log(`[SignalR] ConnectionEstablished: ${connectionId}`);
    });

    this.connection.on('GameStarted', (mapName: string) => {
      console.log(`[SignalR] GameStarted with map: ${mapName}`);
      this.gameStartedSubject.next(mapName);
    });

    this.connection.on('ExistingPlayers', (players: any[]) => {
      console.log(`[SignalR] ExistingPlayers:`, players);
      this.existingPlayersSubject.next(players);
    });

    this.connection.on('BulletFired', (playerId: string, x: number, y: number, direction: string) => {
      this.bulletFiredSubject.next({ playerId, x, y, direction });
    });

    this.connection.on('TileDestroyed', (tileX: number, tileY: number) => {
      this.tileDestroyedSubject.next({ tileX, tileY });
    });
  }
}
