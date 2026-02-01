export interface Bullet {
  id: string;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  active: boolean;
}
