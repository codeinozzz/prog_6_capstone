import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, EMPTY } from 'rxjs';
import { PlayersEffects } from './players.effects';
import { SignalRSimulationService } from '../../core/services/signalr-simulation.service';
import * as PlayersActions from './players.actions';
import { vi } from 'vitest';
import { firstValueFrom } from 'rxjs';

describe('PlayersEffects', () => {
  let actions$: Observable<any>;
  let effects: PlayersEffects;
  let signalRService: any;

  beforeEach(() => {
    const signalRServiceSpy = {
      connect: vi.fn(),
      sendMovement: vi.fn(),
      onMovementReceived: vi.fn(() => EMPTY),
      disconnect: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PlayersEffects,
        provideMockActions(() => actions$),
        { provide: SignalRSimulationService, useValue: signalRServiceSpy }
      ]
    });

    effects = TestBed.inject(PlayersEffects);
    signalRService = TestBed.inject(SignalRSimulationService);
  });

  it('should connect to hub and return success action', async () => {
    const playerId = 'test-player-123';
    signalRService.connect.mockReturnValue(of(playerId));

    actions$ = of(PlayersActions.connectToHub());

    const action = await firstValueFrom(effects.connectToHub$);
    expect(action).toEqual(PlayersActions.connectionSuccess({ playerId }));
  });

  it('should handle connection failure', async () => {
    signalRService.connect.mockReturnValue(
      throwError(() => new Error('Connection failed'))
    );

    actions$ = of(PlayersActions.connectToHub());

    const action = await firstValueFrom(effects.connectToHub$);
    expect(action.type).toBe(PlayersActions.connectionFailure.type);
  });
});
