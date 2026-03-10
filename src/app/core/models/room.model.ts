export interface RoomResponse {
  id: number;
  roomName: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  mapName?: string;
}

