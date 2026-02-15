import { TestBed } from '@angular/core/testing';
import { EMPTY, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { PlayersStore } from './players.store';
import { GameService } from '../../core/services/game.service';
import { Player } from '../../core/models/player.model';
import { ChatMessage } from '../../core/models/chat-message.model';

describe('PlayersStore', () => {
  let store: InstanceType<typeof PlayersStore>;
  let chatSubject: Subject<ChatMessage>;
  let playerJoinedSubject: Subject<{ playerId: string; playerName: string }>;
  let playerLeftSubject: Subject<string>;

  beforeEach(() => {
    chatSubject = new Subject();
    playerJoinedSubject = new Subject();
    playerLeftSubject = new Subject();

    const gameServiceStub = {
      connect: vi.fn().mockReturnValue(of('local-player-id')),
      onPlayerMove: vi.fn(() => EMPTY),
      onChatMessage: vi.fn(() => chatSubject.asObservable()),
      onPlayerJoined: vi.fn(() => playerJoinedSubject.asObservable()),
      onPlayerLeft: vi.fn(() => playerLeftSubject.asObservable()),
      sendPlayerMove: vi.fn(),
      sendChatMessage: vi.fn(),
      joinGame: vi.fn(),
      disconnect: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PlayersStore,
        { provide: GameService, useValue: gameServiceStub }
      ]
    });

    store = TestBed.inject(PlayersStore);
  });

  it('should add a player', () => {
    const player: Player = {
      id: 'player-1',
      name: 'Player 1',
      position: { x: 10, y: 20 },
      direction: 'up',
      isLocal: false,
      lastUpdated: Date.now()
    };

    store.addPlayer(player);
    expect(store.players()).toEqual({ [player.id]: player });
  });

  it('should update player position', () => {
    const player: Player = {
      id: 'player-2',
      name: 'Player 2',
      position: { x: 0, y: 0 },
      direction: 'up',
      isLocal: false,
      lastUpdated: Date.now()
    };

    store.addPlayer(player);
    store.updatePlayerPosition(player.id, { x: 40, y: 50 }, 'right');

    const updatedPlayer = store.players()[player.id];
    expect(updatedPlayer.position).toEqual({ x: 40, y: 50 });
    expect(updatedPlayer.direction).toBe('right');
  });

  it('should remove a player', () => {
    const player: Player = {
      id: 'player-3',
      name: 'Player 3',
      position: { x: 5, y: 5 },
      direction: 'down',
      isLocal: false,
      lastUpdated: Date.now()
    };

    store.addPlayer(player);
    store.removePlayer(player.id);

    expect(store.players()[player.id]).toBeUndefined();
  });

  it('should connect and set local player', () => {
    store.connect();

    expect(store.isConnected()).toBe(true);
    expect(store.localPlayerId()).toBe('local-player-id');
    expect(store.players()['local-player-id']).toBeDefined();
    expect(store.players()['local-player-id'].isLocal).toBe(true);
  });

  it('should compute remote players excluding local', () => {
    store.connect();

    store.addPlayer({
      id: 'remote-1',
      name: 'Remote',
      position: { x: 0, y: 0 },
      direction: 'up',
      isLocal: false,
      lastUpdated: Date.now()
    });

    expect(store.remotePlayers().length).toBe(1);
    expect(store.remotePlayers()[0].id).toBe('remote-1');
  });

  it('should add chat message via sendChatMessage', () => {
    store.sendChatMessage('Player1', 'Hello world');

    expect(store.chatMessages().length).toBe(1);
    expect(store.chatMessages()[0].sender).toBe('Player1');
    expect(store.chatMessages()[0].text).toBe('Hello world');
  });

  it('should receive chat messages from SignalR', () => {
    store.connect();
    chatSubject.next({ sender: 'Remote', text: 'Hi there', timestamp: Date.now() });

    expect(store.chatMessages().some(m => m.sender === 'Remote')).toBe(true);
  });

  it('should add player on PlayerJoined event', () => {
    store.connect();
    playerJoinedSubject.next({ playerId: 'joined-player', playerName: 'NewPlayer' });

    expect(store.players()['joined-player']).toBeDefined();
    expect(store.players()['joined-player'].name).toBe('NewPlayer');
  });

  it('should remove player on PlayerLeft event', () => {
    store.connect();
    store.addPlayer({
      id: 'leaving-player',
      name: 'Leaver',
      position: { x: 0, y: 0 },
      direction: 'up',
      isLocal: false,
      lastUpdated: Date.now()
    });

    playerLeftSubject.next('leaving-player');
    expect(store.players()['leaving-player']).toBeUndefined();
  });

  it('should disconnect and reset state', () => {
    store.connect();
    store.disconnect();

    expect(store.isConnected()).toBe(false);
    expect(store.localPlayerId()).toBeNull();
    expect(store.playersList().length).toBe(0);
    expect(store.chatMessages().length).toBe(0);
  });
});
