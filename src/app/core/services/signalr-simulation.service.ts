import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, interval, of } from 'rxjs';
import { map, delay, takeUntil } from 'rxjs/operators';
import { MovementEvent } from '../models/movement.model';

@Injectable({
  providedIn: 'root'
})
export class SignalRSimulationService {
  private readonly connectionSubject = new BehaviorSubject<boolean>(false);
  private readonly movementSubject = new Subject<{ playerId: string; movement: MovementEvent }>();
  private readonly destroySubject = new Subject<void>();

  private localPlayerId: string | null = null;
  private remotePlayerId = 'remote-player';
  private remotePosition = { x: 100, y: 100 };

  private readonly SIMULATION_CONFIG = {
    movementInterval: 1000
  };

  connect(): Observable<string> {
    return of(null).pipe(
      delay(500),
      map(() => {
        this.localPlayerId = this.generatePlayerId();
        this.connectionSubject.next(true);
        this.startSimulation();
        console.log('[SignalR Simulation] Connected with ID:', this.localPlayerId);
        return this.localPlayerId;
      })
    );
  }

  disconnect(): void {
    this.destroySubject.next();
    this.connectionSubject.next(false);
    console.log('[SignalR Simulation] Disconnected');
  }

  sendMovement(movement: MovementEvent): void {
    console.log('[SignalR Simulation] Sending movement:', movement);
  }

  onMovementReceived(): Observable<{ playerId: string; movement: MovementEvent }> {
    return this.movementSubject.asObservable();
  }

  private startSimulation(): void {
    interval(this.SIMULATION_CONFIG.movementInterval)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        this.generateRandomMovement();
      });
  }

  private generateRandomMovement(): void {
    const direction = this.getRandomDirection();
    const movement = this.calculateMovement(this.remotePosition, direction);

    this.remotePosition = movement;

    const movementEvent: MovementEvent = {
      playerId: this.remotePlayerId,
      position: movement,
      direction,
      timestamp: Date.now()
    };

    this.movementSubject.next({ playerId: this.remotePlayerId, movement: movementEvent });
    console.log(`[SignalR Simulation] Remote player moved ${direction}:`, movement);
  }

  private calculateMovement(
    currentPosition: { x: number; y: number },
    direction: string
  ): { x: number; y: number } {
    const moveDistance = 20;
    const newPosition = { ...currentPosition };

    switch (direction) {
      case 'up':
        newPosition.y = Math.max(0, currentPosition.y - moveDistance);
        break;
      case 'down':
        newPosition.y = Math.min(500, currentPosition.y + moveDistance);
        break;
      case 'left':
        newPosition.x = Math.max(0, currentPosition.x - moveDistance);
        break;
      case 'right':
        newPosition.x = Math.min(500, currentPosition.x + moveDistance);
        break;
    }

    return newPosition;
  }

  private getRandomDirection(): 'up' | 'down' | 'left' | 'right' {
    const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  private generatePlayerId(): string {
    return `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
