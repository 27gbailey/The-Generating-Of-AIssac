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
  POOP: "04",
  BARREL: "05",
  CAMPFIRE: "06",
};

export const DOOR_WALLS = ["north", "east", "south", "west"];

export const TILE_SIZE = 64;
export const WALL_THICKNESS = 28;

/** Shared object hitbox (rocks, poop, barrels). */
export const OBJECT_HITBOX_INSET = 3;
export const OBJECT_HITBOX_RADIUS = 5;

/** @deprecated use OBJECT_HITBOX_* */
export const ROCK_HITBOX_INSET = OBJECT_HITBOX_INSET;
/** @deprecated use OBJECT_HITBOX_* */
export const ROCK_HITBOX_RADIUS = OBJECT_HITBOX_RADIUS;

export const POOP_HITS_TO_DESTROY = 4;

export const BOMB_RADIUS = 14;
export const BOMB_FUSE = 2.6;
export const BOMB_MAX_PER_ROOM = 3;
export const BOMB_PLACE_COOLDOWN = 0.45;

export const EXPLOSION_RADIUS_X = 102;
export const EXPLOSION_RADIUS_Y = 96;
export const EXPLOSION_KNOCKBACK = 480;

/** Larger corner radius for drawing objects (hitbox stays square-ish). */
export const OBJECT_VISUAL_RADIUS = 22;

export const MAX_HEART_CONTAINERS = 12;
export const START_HEART_CONTAINERS = 3;
export const START_BOMBS = 1;

export const BARREL_HITS_TO_DESTROY = 3;

export const CAMPFIRE_HITS_TO_EXTINGUISH = 8;
export const CAMPFIRE_DAMAGE = 1;

export const PICKUP_PENNY_RADIUS = 12;
export const PICKUP_KEY_RADIUS = 13;
export const PICKUP_BOMB_RADIUS = 12;
export const PICKUP_HALF_HEART_RADIUS = 13;
export const PICKUP_FULL_HEART_RADIUS = 14;
export const PICKUP_COLLECT_EXTRA = 14;
export const CHEST_RADIUS = 28;

export const EXPLOSION_DAMAGE = 2;
export const INVINCIBILITY_DURATION = 0.5;

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

export const BLOCKING_TILES = new Set([TILE.ROCK, TILE.WALL, TILE.POOP, TILE.BARREL]);
