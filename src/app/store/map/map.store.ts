import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { TileType } from '../../core/models/map.model';

export interface MapState {
  tiles: TileType[][];
  tileSize: number;
}

const initialMap: TileType[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 2, 2, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const initialState: MapState = {
  tiles: initialMap,
  tileSize: 40,
};

export const MapStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    destroyTile: (x: number, y: number) => {
      const tiles = store.tiles();
      if (tiles[y] && tiles[y][x] === 2) {
        const newTiles = tiles.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((tile, colIndex) => (colIndex === x ? 0 : tile) as TileType)
            : row
        );
        patchState(store, { tiles: newTiles });
      }
    },

    resetMap: () => {
      patchState(store, { tiles: initialMap });
    },
  }))
);
