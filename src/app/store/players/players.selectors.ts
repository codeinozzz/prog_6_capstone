import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PlayersState } from './players.state';

export const selectPlayersState = createFeatureSelector<PlayersState>('players');

export const selectAllPlayers = createSelector(
  selectPlayersState,
  (state) => Object.values(state.players)
);

export const selectLocalPlayer = createSelector(
  selectPlayersState,
  (state) => state.localPlayerId ? state.players[state.localPlayerId] : null
);

export const selectRemotePlayers = createSelector(
  selectPlayersState,
  (state) => Object.values(state.players).filter(p => !p.isLocal)
);

export const selectConnectedCount = createSelector(
  selectPlayersState,
  (state) => Object.keys(state.players).length
);

export const selectIsConnected = createSelector(
  selectPlayersState,
  (state) => state.isConnected
);

export const selectConnectionError = createSelector(
  selectPlayersState,
  (state) => state.error
);
