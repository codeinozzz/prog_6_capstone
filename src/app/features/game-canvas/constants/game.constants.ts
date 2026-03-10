export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 400;
export const TANK_SIZE = 30;
export const MOVE_SPEED = 40;
export const BULLET_SPEED = 8;
export const BULLET_RADIUS = 4;

export const THEME_COLORS = {
  desert: {
    background: '#c2955a',
    floor: '#d4a96a',
    tileStone: '#8B7355',
    tileBrick: '#CD853F',
    tileStroke: '#5C4033',
    localTankBody: '#2d6a4f',
    localTankTurret: '#1b4332',
    localTankBarrel: '#40916c',
    remoteTankBody: '#8b0000',
    remoteTankTurret: '#5c0000',
    remoteTankBarrel: '#cc0000',
    remoteTankLabel: '#ff4444',
    bullet: '#ffff00',
  },
  forest: {
    background: '#1a3a0a',
    floor: '#2d5a1b',
    tileStone: '#3b4a2a',
    tileBrick: '#4a6b1a',
    tileStroke: '#1a2a0a',
    localTankBody: '#1b4332',
    localTankTurret: '#0d2b1f',
    localTankBarrel: '#2d6a4f',
    remoteTankBody: '#6b0000',
    remoteTankTurret: '#3a0000',
    remoteTankBarrel: '#aa0000',
    remoteTankLabel: '#ff6666',
    bullet: '#ffee00',
  },
  night_city: {
    background: '#0a0a1a',
    floor: '#111130',
    tileStone: '#2a2a4a',
    tileBrick: '#4a1a4a',
    tileStroke: '#060618',
    localTankBody: '#003366',
    localTankTurret: '#001a33',
    localTankBarrel: '#0055aa',
    remoteTankBody: '#660033',
    remoteTankTurret: '#330019',
    remoteTankBarrel: '#aa0055',
    remoteTankLabel: '#ff88cc',
    bullet: '#00ffff',
  },
} as const;

export type MapTheme = typeof THEME_COLORS[keyof typeof THEME_COLORS];

export const COLORS = THEME_COLORS['desert'];

export const ROTATION_MAP: Record<string, number> = {
  up: -90,
  down: 90,
  left: 180,
  right: 0,
};
