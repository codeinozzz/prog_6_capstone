import { Routes } from '@angular/router';
import { Game } from './features/game/game';

export const routes: Routes = [
  { path: '', redirectTo: 'game', pathMatch: 'full' },
  { path: 'game', component: Game }
];
