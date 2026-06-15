export const ROOM_WIDTH = 13;
export const ROOM_HEIGHT = 7;
export const TILE_CODE_LENGTH = 2;
export const DOOR_CODE_LENGTH = 4;

export const ROOM_ID_TILE_LENGTH = ROOM_WIDTH * ROOM_HEIGHT * TILE_CODE_LENGTH;
export const ROOM_ID_LENGTH = ROOM_ID_TILE_LENGTH + DOOR_CODE_LENGTH;

export const FLOOR_GRID_SIZE = 13;

export const TILE = {
  FLOOR: "00",
  WALL: "01",
  ROCK: "02",
  BLOOD: "03",
};

export const DOOR_WALLS = ["north", "east", "south", "west"];

export const TILE_SIZE = 64;
export const WALL_THICKNESS = 16;

/** Inset rock collision/visual hitbox from each tile edge (px). */
export const ROCK_HITBOX_INSET = 6;
/** Corner radius for rock hitboxes (px). */
export const ROCK_HITBOX_RADIUS = 12;

export const DIRECTIONS = {
  north: { dx: 0, dy: -1, opposite: "south" },
  east: { dx: 1, dy: 0, opposite: "west" },
  south: { dx: 0, dy: 1, opposite: "north" },
  west: { dx: -1, dy: 0, opposite: "east" },
};

export const DOOR_CLEARANCE = {
  north: [{ x: 5, y: 0 }, { x: 6, y: 0 }],
  south: [{ x: 5, y: 6 }, { x: 6, y: 6 }],
  west: [{ x: 0, y: 2 }, { x: 0, y: 3 }],
  east: [{ x: 12, y: 2 }, { x: 12, y: 3 }],
};

export const BLOCKING_TILES = new Set([TILE.ROCK, TILE.WALL]);
