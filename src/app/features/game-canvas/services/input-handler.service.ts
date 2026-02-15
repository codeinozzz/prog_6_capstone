import { Injectable } from '@angular/core';

export interface InputAction {
  type: 'move' | 'shoot';
  direction?: 'up' | 'down' | 'left' | 'right';
}

const DIRECTION_MAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

@Injectable({ providedIn: 'root' })
export class InputHandlerService {
  parseKeyEvent(event: KeyboardEvent): InputAction | null {
    const direction = DIRECTION_MAP[event.key];
    if (direction) {
      return { type: 'move', direction };
    }

    if (event.key === ' ' || event.key === 'Space') {
      return { type: 'shoot' };
    }

    return null;
  }
}
