export interface Player {
  id: string;
  name: string;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  isLocal: boolean;
  lastUpdated: number;
}
