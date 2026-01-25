import { Component, EventEmitter, OnDestroy, OnInit, Output, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../../core/models/player.model';
import { PlayersStore } from '../../store/players/players.store';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss']
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private readonly playersStore = inject(PlayersStore);
  private readonly knownPlayerIds = new Set<string>();

  readonly players = this.playersStore.playersList;

  @Output() playerJoined = new EventEmitter<Player>();

  constructor() {
    effect(() => {
      const players = this.players();
      for (const player of players) {
        if (!this.knownPlayerIds.has(player.id)) {
          this.knownPlayerIds.add(player.id);
          this.playerJoined.emit(player);
        }
      }
    });
  }

  ngOnInit(): void {
    this.playersStore.connect();
  }

  ngOnDestroy(): void {
    this.playersStore.disconnect();
    this.knownPlayerIds.clear();
  }
}
