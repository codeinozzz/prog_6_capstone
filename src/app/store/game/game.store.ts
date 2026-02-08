import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';


export interface GameState {
  health: number;
  score: number;
  ammunition: number;
  playerStatus: 'alive' | 'injured' | 'dead' ;

}

const initialState: GameState = {
  health: 100,
  score: 0,
  ammunition: 30,
  playerStatus: 'alive'
};

export const GameStore = signalStore(

  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({

    incrementScore: (points: number) => {

      patchState(store, { score: store.score() + points });
    },

    decreaseHealth: (damage: number) => {

      const newHealth = Math.max(0, store.health() - damage)
      patchState(store, { health: newHealth });
    },

    decreaseAmmunition: (amount: number) => {
      const newAmmunition = Math.max(0, store.ammunition() - amount);
      patchState(store, { ammunition: newAmmunition });
    },

    resetGame: () => {
      patchState(store, initialState)
    },

    setPlayerStatus:(status: 'alive' | 'injured' | 'dead')=>{
      patchState(store, {playerStatus:status})
    }

  }))
);
