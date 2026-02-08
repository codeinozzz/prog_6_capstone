export interface RoomResponse {
  id: number;
  roomName: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
}

export interface CreateRoomRequest {
  roomName: string;
  mapName: string;
}
