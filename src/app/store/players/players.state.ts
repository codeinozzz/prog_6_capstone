import { Player } from '../../core/models/player.model';

export interface PlayersState {
  players: { [id: string]: Player };
  localPlayerId: string | null;
  isConnected: boolean;
  error: string | null;
}

export const initialState: PlayersState = {
  players: {},
  localPlayerId: null,
  isConnected: false,
  error: null
};
