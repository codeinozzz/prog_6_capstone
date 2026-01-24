import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import * as PlayersActions from '../../store/players/players.actions';
import * as PlayersSelectors from '../../store/players/players.selectors';
import { Player } from '../../core/models/player.model';
import { MovementEvent } from '../../core/models/movement.model';

@Component({
  selector: 'app-tank-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tank-container.component.html',
  styleUrls: ['./tank-container.component.scss']
})
export class TankContainerComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly destroy$ = new Subject<void>();
  private localPlayer: Player | null = null;
  private isConnected = false;

  readonly localPlayer$: Observable<Player | null> = this.store.select(PlayersSelectors.selectLocalPlayer);
  readonly isConnected$: Observable<boolean> = this.store.select(PlayersSelectors.selectIsConnected);

  ngOnInit(): void {
    this.store.dispatch(PlayersActions.connectToHub());
    console.log('[Tank Container] Connecting to SignalR hub');

    this.localPlayer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(player => {
        this.localPlayer = player;
      });

    this.isConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isConnected => {
        this.isConnected = isConnected;
      });
  }

  ngOnDestroy(): void {
    this.store.dispatch(PlayersActions.disconnectFromHub());
    this.destroy$.next();
    this.destroy$.complete();
    console.log('[Tank Container] Disconnected from hub');
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isConnected || !this.localPlayer) return;

    const keyMap: { [key: string]: 'up' | 'down' | 'left' | 'right' } = {
      ArrowUp: 'up',
      w: 'up',
      W: 'up',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right'
    };

    const direction = keyMap[event.key];
    if (!direction) return;

    event.preventDefault();
    this.moveLocalPlayer(direction);
  }

  private moveLocalPlayer(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.localPlayer) return;

    const moveDistance = 20;
    const newPosition = { ...this.localPlayer.position };

    switch (direction) {
      case 'up':
        newPosition.y = Math.max(0, newPosition.y - moveDistance);
        break;
      case 'down':
        newPosition.y = Math.min(500, newPosition.y + moveDistance);
        break;
      case 'left':
        newPosition.x = Math.max(0, newPosition.x - moveDistance);
        break;
      case 'right':
        newPosition.x = Math.min(500, newPosition.x + moveDistance);
        break;
    }

    this.store.dispatch(
      PlayersActions.updatePlayerPosition({
        playerId: this.localPlayer.id,
        position: newPosition,
        direction
      })
    );

    const movement: MovementEvent = {
      playerId: this.localPlayer.id,
      position: newPosition,
      direction,
      timestamp: Date.now()
    };
    this.store.dispatch(PlayersActions.sendMovement({ movement }));
  }
}
