import { inject } from '@angular/core';
import { Router } from '@angular/router';
const authenticated = () =>
  localStorage.getItem('auth_token') ? true : inject(Router).createUrlTree(['/login']);
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'waiting-room',
    canActivate: [authenticated],
    loadComponent: () =>
      import('./features/waiting-room/waiting-room.component').then((m) => m.WaitingRoomComponent),
  },
  {
    path: 'game',
    canActivate: [authenticated],
    loadComponent: () => import('./features/game/game').then((m) => m.Game),
  },
  {
    path: 'profile',
    canActivate: [authenticated],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'ranking',
    loadComponent: () => import('./features/ranking/ranking').then((m) => m.Ranking),
  },
  { path: '**', redirectTo: 'login' },
];
