import { Component } from '@angular/core';
import { PlayerHub } from '../player-hub/player-hub';
import { GameCanvasComponent } from '../game-canvas/game-canvas.component';

@Component({
  selector: 'app-game',
  imports: [PlayerHub, GameCanvasComponent],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game {}
