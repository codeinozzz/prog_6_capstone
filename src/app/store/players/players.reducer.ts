import { createReducer, on } from '@ngrx/store';
import * as PlayersActions from './players.actions';
import { initialState } from './players.state';

export const playersReducer = createReducer(
  initialState,

  // Connection handlers
  on(PlayersActions.connectionSuccess, (state, { playerId }) => ({
    ...state,
    isConnected: true,
    localPlayerId: playerId,
    error: null,
    players: {
      ...state.players,
      [playerId]: {
        id: playerId,
        name: 'Local Player',
        position: { x: 250, y: 250 },
        direction: 'up' as const,
        isLocal: true,
        lastUpdated: Date.now()
      }
    }
  })),

  on(PlayersActions.connectionFailure, (state, { error }) => ({
    ...state,
    isConnected: false,
    error
  })),

  on(PlayersActions.disconnectFromHub, () => initialState),

  // Movement handlers
  on(PlayersActions.updatePlayerPosition, (state, { playerId, position, direction }) => {
    const player = state.players[playerId];
    const isLocal = playerId === state.localPlayerId;

    if (!player) {
      return {
        ...state,
        players: {
          ...state.players,
          [playerId]: {
            id: playerId,
            name: isLocal ? 'Local Player' : 'Remote Player',
            position,
            direction: direction as 'up' | 'down' | 'left' | 'right',
            isLocal,
            lastUpdated: Date.now()
          }
        }
      };
    }

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          position,
          direction: direction as 'up' | 'down' | 'left' | 'right',
          lastUpdated: Date.now()
        }
      }
    };
  })
);
