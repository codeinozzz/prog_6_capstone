import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { vi } from 'vitest';
import { PlayersStore } from './players.store';
import { GameService } from '../../core/services/game.service';
import { Player } from '../../core/models/player.model';

describe('PlayersStore', () => {
  let store: PlayersStore;

  beforeEach(() => {
    const gameServiceStub = {
      connect: vi.fn(),
      onPlayerMove: vi.fn(() => EMPTY),
      sendPlayerMove: vi.fn(),
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
});
