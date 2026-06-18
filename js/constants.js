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
  RED_CAMPFIRE: "07",
  POT: "08",
  BLUE_ROCK: "09",
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

export const EXPLOSION_RADIUS_X = 84;
export const EXPLOSION_RADIUS_Y = 78;
export const EXPLOSION_KNOCKBACK = 480;

/** Larger corner radius for drawing objects (hitbox stays square-ish). */
export const OBJECT_VISUAL_RADIUS = 22;

export const MAX_HEART_CONTAINERS = 12;
export const START_HEART_CONTAINERS = 3;
export const START_BOMBS = 1;

export const BARREL_HITS_TO_DESTROY = 3;

export const CAMPFIRE_HITS_TO_EXTINGUISH = 8;
export const CAMPFIRE_DAMAGE = 1;
/** Burn hitbox covers nearly the full tile (visual flame is larger). */
export const CAMPFIRE_FIRE_RADIUS = TILE_SIZE / 2 - 2;
export const BLOOD_TEAR_DAMAGE = 1;

export const TEAR_DAMAGE = 3.5;
export const ENEMY_CONTACT_DAMAGE = 1;
export const HORF_HP = 20;
export const GAPER_HP = 20;
export const DIP_HP = 10;

export const PICKUP_PENNY_RADIUS = 12;
export const PICKUP_KEY_RADIUS = 13;
export const PICKUP_BOMB_RADIUS = 12;
export const PICKUP_HALF_HEART_RADIUS = 13;
export const PICKUP_FULL_HEART_RADIUS = 14;
export const PICKUP_COLLECT_EXTRA = 14;
export const CHEST_RADIUS = 28;

export const EXPLOSION_DAMAGE = 2;
export const INVINCIBILITY_DURATION = 0.5;

/** Collision / damage hitbox centered on Isaac's chest. */
export const CHEST_OFFSET_Y = 12;
export const BODY_RADIUS = 11;
export const HEAD_RADIUS = 11;

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

export const BLOCKING_TILES = new Set([
  TILE.ROCK, TILE.BLUE_ROCK, TILE.WALL, TILE.POOP, TILE.BARREL, TILE.POT,
]);

/** Chance for a rock tile to become a blue rock when rooms are built. */
export const BLUE_ROCK_REPLACE_CHANCE = 0.28;
/** Chance for a rock tile to become a pot instead (after blue rock roll). */
export const POT_REPLACE_CHANCE = 0.14;

/** Explosion reach multiplier when testing locked-door breaks. */
export const DOOR_BREAK_RADIUS_SCALE = 1.35;
