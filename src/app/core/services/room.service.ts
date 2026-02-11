import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoomResponse } from '../models/room.model';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly API_URL = 'http://localhost:5174/api/room';
  private http = inject(HttpClient);

  getRooms(): Observable<RoomResponse[]> {
    return this.http.get<RoomResponse[]>(this.API_URL);
  }

  createRoom(roomName: string, mapName: string): Observable<RoomResponse> {
    return this.http.post<RoomResponse>(this.API_URL, { roomName, mapName });
  }

  joinRoom(roomId: number): Observable<any> {
    return this.http.put(`${this.API_URL}/${roomId}/join`, {});
  }

  deleteRoom(roomId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${roomId}`);
  }
}
