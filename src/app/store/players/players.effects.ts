import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import * as PlayersActions from './players.actions';
import { SignalRSimulationService } from '../../core/services/signalr-simulation.service';

@Injectable()
export class PlayersEffects {
  private readonly actions$ = inject(Actions);
  private readonly signalRService = inject(SignalRSimulationService);

  connectToHub$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayersActions.connectToHub),
      switchMap(() =>
        this.signalRService.connect().pipe(
          map(playerId => PlayersActions.connectionSuccess({ playerId })),
          catchError(error => of(PlayersActions.connectionFailure({ error: error.message })))
        )
      )
    )
  );

  movementReceived$ = createEffect(() =>
    this.signalRService.onMovementReceived().pipe(
      tap(({ movement }) => {
        console.log('[SignalR] Movement received:', movement);
      }),
      map(({ playerId, movement }) =>
        PlayersActions.updatePlayerPosition({
          playerId,
          position: movement.position,
          direction: movement.direction
        })
      )
    )
  );

  sendMovement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayersActions.sendMovement),
      tap(({ movement }) => {
        this.signalRService.sendMovement(movement);
        console.log('[SignalR] Movement sent:', movement);
      })
    ),
    { dispatch: false }
  );

  disconnectFromHub$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlayersActions.disconnectFromHub),
      tap(() => {
        this.signalRService.disconnect();
      })
    ),
    { dispatch: false }
  );
}
