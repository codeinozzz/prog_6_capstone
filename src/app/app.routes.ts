import { Routes } from '@angular/router';
import { Game } from './features/game/game';
import { LoginComponent } from './features/login/login.component';
import { WaitingRoomComponent } from './features/waiting-room/waiting-room.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'waiting-room', component: WaitingRoomComponent },
  { path: 'game', component: Game }
];
