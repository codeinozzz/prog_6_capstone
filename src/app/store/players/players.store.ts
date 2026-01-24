import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
import { Player } from '../../core/models/player.model';
import { MovementEvent } from '../../core/models/movement.model';
import { GameService } from '../../core/services/game.service';

export interface PlayersState {
  players: Record<string, Player>;
  localPlayerId: string | null;
  isConnected: boolean;
  error: string | null;
}

const initialState: PlayersState = {
  players: {},
  localPlayerId: null,
  isConnected: false,
  error: null
};

export const PlayersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    playersList: computed(() => Object.values(store.players())),
    localPlayer: computed(() => {
      const playerId = store.localPlayerId();
      return playerId ? store.players()[playerId] ?? null : null;
    })
  })),
  withMethods((store, gameService = inject(GameService)) => {
    let movementSubscription: Subscription | null = null;
    let connectionSubscription: Subscription | null = null;

    const addPlayer = (player: Player): void => {
      patchState(store, {
        players: {
          ...store.players(),
          [player.id]: player
        }
      });
    };

    const removePlayer = (playerId: string): void => {
      const { [playerId]: removed, ...remaining } = store.players();
      if (removed) {
        patchState(store, { players: remaining });
      }
    };

    const updatePlayerPosition = (
      playerId: string,
      position: { x: number; y: number },
      direction: Player['direction']
    ): void => {
      const player = store.players()[playerId];
      const isLocal = playerId === store.localPlayerId();

      if (!player) {
        addPlayer({
          id: playerId,
          name: isLocal ? 'Local Player' : 'Remote Player',
          position,
          direction,
          isLocal,
          lastUpdated: Date.now()
        });
        return;
      }

      patchState(store, {
        players: {
          ...store.players(),
          [playerId]: {
            ...player,
            position,
            direction,
            lastUpdated: Date.now()
          }
        }
      });
    };

    const connect = (): void => {
      if (store.isConnected()) return;

      connectionSubscription?.unsubscribe();
      connectionSubscription = gameService.connect().subscribe({
        next: (playerId) => {
          patchState(store, {
            isConnected: true,
            localPlayerId: playerId,
            error: null
          });

          addPlayer({
            id: playerId,
            name: 'Local Player',
            position: { x: 250, y: 250 },
            direction: 'up',
            isLocal: true,
            lastUpdated: Date.now()
          });
        },
        error: (error: Error) => {
          patchState(store, {
            isConnected: false,
            error: error?.message ?? 'Connection failed'
          });
        }
      });

      movementSubscription?.unsubscribe();
      movementSubscription = gameService.onPlayerMove().subscribe(({ playerId, movement }) => {
        updatePlayerPosition(playerId, movement.position, movement.direction);
      });
    };

    const disconnect = (): void => {
      movementSubscription?.unsubscribe();
      connectionSubscription?.unsubscribe();
      movementSubscription = null;
      connectionSubscription = null;
      gameService.disconnect();
      patchState(store, initialState);
    };

    const sendPlayerMove = (movement: MovementEvent): void => {
      gameService.sendPlayerMove(movement);
    };

    return {
      addPlayer,
      removePlayer,
      updatePlayerPosition,
      connect,
      disconnect,
      sendPlayerMove
    };
  })
);
