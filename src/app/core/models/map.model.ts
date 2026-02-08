export type TileType = 0 | 1 | 2;

export interface MapTile {
  type: TileType;
  x: number;
  y: number;
}

export interface GameMap {
  tiles: TileType[][];
  tileSize: number;
}
