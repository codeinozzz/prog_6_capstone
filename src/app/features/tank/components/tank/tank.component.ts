import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../../../../core/models/player.model';

@Component({
  selector: 'app-tank',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tank.component.html',
  styleUrls: ['./tank.component.scss']
})
export class TankComponent {
  @Input({ required: true }) player!: Player;
  @Input() isLocal = false;

  @HostBinding('style.left.px')
  get left(): number {
    return this.player.position.x;
  }

  @HostBinding('style.top.px')
  get top(): number {
    return this.player.position.y;
  }
}
