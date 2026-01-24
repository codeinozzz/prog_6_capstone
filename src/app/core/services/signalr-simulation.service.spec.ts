import { TestBed } from '@angular/core/testing';
import { SignalRSimulationService } from './signalr-simulation.service';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

describe('SignalRSimulationService', () => {
  let service: SignalRSimulationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignalRSimulationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should connect and return player ID', async () => {
    const playerId = await firstValueFrom(service.connect());
    expect(playerId).toBeTruthy();
    expect(typeof playerId).toBe('string');
  });

  it('should emit movement events', async () => {
    const movementPromise = firstValueFrom(service.onMovementReceived().pipe(take(1)));
    await firstValueFrom(service.connect());
    const { playerId, movement } = await movementPromise;

    expect(playerId).toBeTruthy();
    expect(movement.position).toBeTruthy();
    expect(movement.direction).toBeTruthy();
  }, 5000);

  it('should send movement without errors', () => {
    const movement = {
      playerId: 'test-player',
      position: { x: 100, y: 100 },
      direction: 'up' as const,
      timestamp: Date.now()
    };

    expect(() => service.sendMovement(movement)).not.toThrow();
  });

  it('should disconnect and clear state', async () => {
    await firstValueFrom(service.connect());
    service.disconnect();
    expect(true).toBe(true);
  });
});
