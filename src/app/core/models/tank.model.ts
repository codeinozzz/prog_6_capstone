export interface Tank {
  id: string;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  health: number;
  isActive: boolean;
}
