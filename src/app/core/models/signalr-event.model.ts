export enum SignalREventType {
  PlayerJoined = 'PlayerJoined',
  PlayerLeft = 'PlayerLeft',
  MovementUpdate = 'MovementUpdate',
  ConnectionEstablished = 'ConnectionEstablished'
}

export interface SignalREvent<T = any> {
  type: SignalREventType;
  payload: T;
  timestamp: number;
}
