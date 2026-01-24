import { createAction, props } from '@ngrx/store';
import { MovementEvent } from '../../core/models/movement.model';

export const connectToHub = createAction('[Players] Connect To Hub');

export const connectionSuccess = createAction(
  '[Players] Connection Success',
  props<{ playerId: string }>()
);

export const connectionFailure = createAction(
  '[Players] Connection Failure',
  props<{ error: string }>()
);

export const disconnectFromHub = createAction('[Players] Disconnect From Hub');

export const sendMovement = createAction(
  '[Players] Send Movement',
  props<{ movement: MovementEvent }>()
);

export const updatePlayerPosition = createAction(
  '[Players] Update Player Position',
  props<{ playerId: string; position: { x: number; y: number }; direction: string }>()
);
