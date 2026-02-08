import { Component, inject } from '@angular/core';
import { GameStore } from '../../store';

@Component({
  selector: 'app-player-hub',
  imports: [],
  templateUrl: './player-hub.html',
  styleUrl: './player-hub.scss',
})
export class PlayerHub {
  private readonly gameStore = inject(GameStore);
  
  readonly health = this.gameStore.health;
  readonly score = this.gameStore.score;
  readonly ammunition = this.gameStore.ammunition;
  readonly playerStatus = this.gameStore.playerStatus;
}
