export type PowerUpType = 'ammo' | 'health' | 'speed';

export interface PowerUpEvent {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  roomId: string;
  timestamp: number;
}

export interface CollisionEvent {
  attackerId: string;
  victimId: string;
  roomId: string;
  damage: number;
  timestamp: number;
}

export interface GameEndEvent {
  roomId: string;
  winnerId: string;
  winnerName: string;
  timestamp: number;
}

export interface ChatMqttEvent {
  roomId: string;
  sender: string;
  message: string;
  timestamp: number;
}

export interface PowerUpCollectedEvent {
  powerUpId: string;
  collectorId: string;
  roomId: string;
  timestamp: number;
}

export type MqttEventType =
  | 'powerup_spawned'
  | 'powerup_collected'
  | 'collision'
  | 'game_end'
  | 'chat';

// Medición de latencia para benchmarking
export interface LatencySample {
  topic: string;
  sentAt: number;
  receivedAt: number;
  latencyMs: number;
}
