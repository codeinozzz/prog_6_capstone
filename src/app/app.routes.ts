import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  { path: 'waiting-room', loadComponent: () => import('./features/waiting-room/waiting-room.component').then(m => m.WaitingRoomComponent) },
  { path: 'game', loadComponent: () => import('./features/game/game').then(m => m.Game) }
];
