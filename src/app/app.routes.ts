import { Routes } from '@angular/router';
import { TankContainerComponent } from './features/tank/tank-container.component';
import { WaitingRoomComponent } from './features/waiting-room/waiting-room.component';

export const routes: Routes = [
  { path: '', component: WaitingRoomComponent },
  { path: 'tank', component: TankContainerComponent }
];
