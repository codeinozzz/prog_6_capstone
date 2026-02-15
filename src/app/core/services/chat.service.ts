import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly messageSubject = new Subject<ChatMessage>();
  private socket: WebSocket | null = null;

  private readonly CHAT_SOCKET_URL = 'ws://localhost:3000';

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.CHAT_SOCKET_URL);
    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  sendMessage(message: ChatMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  onMessage(): Observable<ChatMessage> {
    return this.messageSubject.asObservable();
  }

  private handleMessage(payload: string): void {
    try {
      const parsed = JSON.parse(payload) as ChatMessage;
      if (parsed?.text) {
        this.messageSubject.next(parsed);
        return;
      }
    } catch {

    }

    this.messageSubject.next({
      sender: 'Server',
      text: payload,
      timestamp: Date.now()
    });
  }
}
