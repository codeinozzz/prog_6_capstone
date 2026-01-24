export interface MovementEvent {
  playerId: string;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  timestamp: number;
}
