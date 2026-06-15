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
};

export const DOOR_WALLS = ["north", "east", "south", "west"];

export const TILE_SIZE = 64;
export const WALL_THICKNESS = 16;

export const DIRECTIONS = {
  north: { dx: 0, dy: -1, opposite: "south" },
  east: { dx: 1, dy: 0, opposite: "west" },
  south: { dx: 0, dy: 1, opposite: "north" },
  west: { dx: -1, dy: 0, opposite: "east" },
};
