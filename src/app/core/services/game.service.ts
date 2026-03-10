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
  private readonly playerDiedSubject = new Subject<{ victimId: string; victimName: string; killerId: string; killerName: string }>();
  private readonly playerHitSubject = new Subject<{ attackerId: string; damage: number }>();
  private readonly initialPowerUpsSubject = new Subject<any[]>();

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

  setRoom(roomId: string): void {
    this.connection.invoke('SetRoom', roomId)
      .catch(err => console.error('[SignalR] SetRoom error:', err));
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

  collectPowerUp(powerUpId: string): void {
    this.connection.invoke('CollectPowerUp', powerUpId)
      .catch(err => console.error('[SignalR] CollectPowerUp error:', err));
  }

  reportCollision(victimId: string, damage: number): void {
    this.connection.invoke('ReportCollision', victimId, damage)
      .catch(err => console.error('[SignalR] ReportCollision error:', err));
  }

  endGame(winnerId: string, winnerName: string, finalScore = 0): void {
    this.connection.invoke('EndGame', winnerId, winnerName, finalScore)
      .catch(err => console.error('[SignalR] EndGame error:', err));
  }

  playerDied(victimId: string, victimName: string, killerId: string, killerName: string): void {
    this.connection.invoke('PlayerDied', victimId, victimName, killerId, killerName)
      .catch(err => console.error('[SignalR] PlayerDied error:', err));
  }

  submitScore(playerName: string, points: number): void {
    this.connection.invoke('SubmitScore', playerName, points)
      .catch(err => console.error('[SignalR] SubmitScore error:', err));
  }

  onPlayerDied(): Observable<{ victimId: string; victimName: string; killerId: string; killerName: string }> {
    return this.playerDiedSubject.asObservable();
  }

  onPlayerHit(): Observable<{ attackerId: string; damage: number }> {
    return this.playerHitSubject.asObservable();
  }

  onRoomHistory(): Observable<any[]> {
    return new Observable(observer => {
      this.connection.on('RoomHistory', (history: any[]) => observer.next(history));
    });
  }

  onGameOver(): Observable<{ winnerId: string; winnerName: string }> {
    return new Observable(observer => {
      this.connection.on('GameOver', (winnerId: string, winnerName: string) => {
        observer.next({ winnerId, winnerName });
      });
    });
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

  onInitialPowerUps(): Observable<any[]> {
    return this.initialPowerUpsSubject.asObservable();
  }

  getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  onConnectionLost(): Observable<void> {
    return new Observable(observer => {
      this.connection.onclose(() => observer.next());
    });
  }

  onReconnected(): Observable<string | null> {
    return new Observable(observer => {
      this.connection.onreconnected((connectionId) => observer.next(connectionId ?? null));
    });
  }

  private registerHandlers(): void {
    this.connection.onclose((error) => {
      this.connectionSubject.next(false);
      this.localPlayerId = null;
      if (error) console.error('[SignalR] Connection closed with error:', error);
      else console.log('[SignalR] Connection closed');
    });

    this.connection.onreconnected((connectionId) => {
      this.localPlayerId = connectionId ?? this.localPlayerId;
      this.connectionSubject.next(true);
      console.log('[SignalR] Reconnected with ID:', this.localPlayerId);
    });

    this.connection.onreconnecting((error) => {
      this.connectionSubject.next(false);
      console.warn('[SignalR] Reconnecting...', error?.message ?? '');
    });

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

    this.connection.on('PlayerDied', (victimId: string, victimName: string, killerId: string, killerName: string) => {
      console.log(`[SignalR] PlayerDied: ${victimName} killed by ${killerName}`);
      this.playerDiedSubject.next({ victimId, victimName, killerId, killerName });
    });

    this.connection.on('PlayerHit', (attackerId: string, damage: number) => {
      console.log(`[SignalR] PlayerHit: ${damage} damage from ${attackerId}`);
      this.playerHitSubject.next({ attackerId, damage });
    });

    this.connection.on('InitialPowerUps', (powerUps: any[]) => {
      console.log(`[SignalR] InitialPowerUps received:`, powerUps);
      this.initialPowerUpsSubject.next(powerUps);
    });
  }
}
