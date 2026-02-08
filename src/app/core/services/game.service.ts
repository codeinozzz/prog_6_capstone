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
  private readonly playerJoinedSubject = new Subject<{ playerId: string; playerName: string }>();
  private readonly playerLeftSubject = new Subject<string>();

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
    console.log(`[SignalR] SendPlayerMove at ${sendTimestamp}`);
    this.connection.invoke('SendPlayerMove', movement.playerId, {
      position: movement.position,
      direction: movement.direction,
      timestamp: sendTimestamp
    }).catch(err => console.error('[SignalR] SendPlayerMove error:', err));
  }

  sendChatMessage(sender: string, message: string): void {
    const sendTimestamp = Date.now();
    console.log(`[SignalR] SendChatMessage at ${sendTimestamp}`);
    this.connection.invoke('SendChatMessage', sender, message)
      .catch(err => console.error('[SignalR] SendChatMessage error:', err));
  }

  joinGame(playerId: string, playerName: string): void {
    this.connection.invoke('JoinGame', playerId, playerName)
      .catch(err => console.error('[SignalR] JoinGame error:', err));
  }

  onPlayerMove(): Observable<{ playerId: string; movement: MovementEvent }> {
    return this.movementSubject.asObservable();
  }

  onChatMessage(): Observable<ChatMessage> {
    return this.chatSubject.asObservable();
  }

  onPlayerJoined(): Observable<{ playerId: string; playerName: string }> {
    return this.playerJoinedSubject.asObservable();
  }

  onPlayerLeft(): Observable<string> {
    return this.playerLeftSubject.asObservable();
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
      console.log(`[SignalR] ReceiveChatMessage from ${sender} at ${receiveTimestamp}`);
      this.chatSubject.next({ sender, text: message, timestamp: receiveTimestamp });
    });

    this.connection.on('PlayerJoined', (playerId: string, playerName: string) => {
      console.log(`[SignalR] PlayerJoined: ${playerName} (${playerId})`);
      this.playerJoinedSubject.next({ playerId, playerName });
    });

    this.connection.on('PlayerLeft', (connectionId: string) => {
      console.log(`[SignalR] PlayerLeft: ${connectionId}`);
      this.playerLeftSubject.next(connectionId);
    });

    this.connection.on('ConnectionEstablished', (connectionId: string) => {
      this.localPlayerId = connectionId;
      console.log(`[SignalR] ConnectionEstablished: ${connectionId}`);
    });
  }
}
