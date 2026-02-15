import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GameService } from './game.service';
import { Subject } from 'rxjs';
import { MovementEvent } from '../models/movement.model';
import { ChatMessage } from '../models/chat-message.model';

class MockHubConnection {
  connectionId = 'mock-connection-id';
  state = 'Connected';
  handlers: Record<string, Function> = {};

  start = vi.fn().mockResolvedValue(undefined);
  stop = vi.fn().mockResolvedValue(undefined);
  invoke = vi.fn().mockResolvedValue(undefined);

  on(event: string, handler: Function): void {
    this.handlers[event] = handler;
  }

  triggerEvent(event: string, ...args: any[]): void {
    this.handlers[event]?.(...args);
  }
}

let mockHubConnection: MockHubConnection;

vi.mock('@microsoft/signalr', () => {
  return {
    HubConnectionBuilder: class {
      withUrl() { return this; }
      withAutomaticReconnect() { return this; }
      build() {
        mockHubConnection = new MockHubConnection();
        return mockHubConnection;
      }
    },
    HubConnectionState: { Connected: 'Connected' }
  };
});

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register SignalR event handlers on construction', () => {
    expect(mockHubConnection.handlers['ReceivePlayerMove']).toBeDefined();
    expect(mockHubConnection.handlers['ReceiveChatMessage']).toBeDefined();
    expect(mockHubConnection.handlers['PlayerJoined']).toBeDefined();
    expect(mockHubConnection.handlers['PlayerLeft']).toBeDefined();
    expect(mockHubConnection.handlers['ConnectionEstablished']).toBeDefined();
  });

  it('should connect and return player ID', async () => {
    const playerId = await new Promise<string>((resolve) => {
      service.connect().subscribe({ next: (id) => resolve(id) });
    });

    expect(playerId).toBe('mock-connection-id');
    expect(mockHubConnection.start).toHaveBeenCalled();
  });

  it('should invoke SendPlayerMove on hub', () => {
    const movement: MovementEvent = {
      playerId: 'test-player',
      position: { x: 100, y: 100 },
      direction: 'up',
      timestamp: Date.now()
    };

    service.sendPlayerMove(movement);
    expect(mockHubConnection.invoke).toHaveBeenCalledWith(
      'SendPlayerMove',
      'test-player',
      expect.objectContaining({ position: { x: 100, y: 100 }, direction: 'up' })
    );
  });

  it('should invoke SendChatMessage on hub', () => {
    service.sendChatMessage('Player1', 'Hello');
    expect(mockHubConnection.invoke).toHaveBeenCalledWith('SendChatMessage', 'Player1', 'Hello');
  });

  it('should invoke JoinGame on hub', () => {
    service.joinGame('player-1', 'TestPlayer');
    expect(mockHubConnection.invoke).toHaveBeenCalledWith('JoinGame', 'player-1', 'TestPlayer');
  });

  it('should emit movement events when ReceivePlayerMove fires', async () => {
    const movePromise = new Promise<{ playerId: string; movement: MovementEvent }>((resolve) => {
      service.onPlayerMove().subscribe({ next: (data) => resolve(data) });
    });

    mockHubConnection.triggerEvent('ReceivePlayerMove', 'remote-1', {
      position: { x: 50, y: 50 },
      direction: 'left',
      timestamp: Date.now()
    });

    const result = await movePromise;
    expect(result.playerId).toBe('remote-1');
    expect(result.movement.position).toEqual({ x: 50, y: 50 });
  });

  it('should emit chat messages when ReceiveChatMessage fires', async () => {
    const chatPromise = new Promise<ChatMessage>((resolve) => {
      service.onChatMessage().subscribe({ next: (msg) => resolve(msg) });
    });

    mockHubConnection.triggerEvent('ReceiveChatMessage', 'Sender', 'Hello world');

    const result = await chatPromise;
    expect(result.sender).toBe('Sender');
    expect(result.text).toBe('Hello world');
  });

  it('should disconnect and stop connection', () => {
    service.disconnect();
    expect(mockHubConnection.stop).toHaveBeenCalled();
    expect(service.getLocalPlayerId()).toBeNull();
  });
});
