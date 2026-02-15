export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 400;
export const TANK_SIZE = 30;
export const MOVE_SPEED = 40;
export const BULLET_SPEED = 8;
export const BULLET_RADIUS = 4;

export const COLORS = {
  background: '#000000',

  localTankBody: '#2d6a4f',
  localTankTurret: '#1b4332',
  localTankBarrel: '#40916c',

  remoteTankBody: '#8b0000',
  remoteTankTurret: '#5c0000',
  remoteTankBarrel: '#cc0000',
  remoteTankLabel: '#ff4444',

  tileStone: '#404040',
  tileBrick: '#8B4513',
  tileStroke: '#222222',

  bullet: '#ffff00',
} as const;

export const ROTATION_MAP: Record<string, number> = {
  up: -90,
  down: 90,
  left: 180,
  right: 0,
};
