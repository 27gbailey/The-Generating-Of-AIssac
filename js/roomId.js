import {
  DOOR_CODE_LENGTH,
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_ID_LENGTH,
  ROOM_ID_TILE_LENGTH,
  ROOM_WIDTH,
  TILE,
  TILE_CODE_LENGTH,
} from "./constants.js";

const TILE_CODES = new Set(Object.values(TILE));

function padTileCode(code) {
  return code.padStart(TILE_CODE_LENGTH, "0").slice(-TILE_CODE_LENGTH);
}

export function createEmptyGrid(fillCode = TILE.FLOOR) {
  const code = padTileCode(fillCode);
  return Array.from({ length: ROOM_HEIGHT }, () =>
    Array.from({ length: ROOM_WIDTH }, () => code)
  );
}

export function encodeRoomId(grid, doors) {
  if (grid.length !== ROOM_HEIGHT || grid.some((row) => row.length !== ROOM_WIDTH)) {
    throw new Error(`Room grid must be ${ROOM_WIDTH}x${ROOM_HEIGHT}.`);
  }

  const tilePart = grid.flat().map(padTileCode).join("");
  const doorPart = DOOR_WALLS.map((wall) => (doors[wall] ? "1" : "0")).join("");

  return tilePart + doorPart;
}

export function decodeRoomId(roomId) {
  if (roomId.length !== ROOM_ID_LENGTH) {
    throw new Error(`Room ID must be ${ROOM_ID_LENGTH} characters. Received ${roomId.length}.`);
  }

  const tilePart = roomId.slice(0, ROOM_ID_TILE_LENGTH);
  const doorPart = roomId.slice(ROOM_ID_TILE_LENGTH);

  const grid = [];
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const index = (y * ROOM_WIDTH + x) * TILE_CODE_LENGTH;
      const code = tilePart.slice(index, index + TILE_CODE_LENGTH);
      if (!TILE_CODES.has(code)) {
        throw new Error(`Unknown tile code "${code}" at (${x}, ${y}).`);
      }
      row.push(code);
    }
    grid.push(row);
  }

  const doors = {};
  for (let i = 0; i < DOOR_CODE_LENGTH; i++) {
    doors[DOOR_WALLS[i]] = doorPart[i] === "1";
  }

  return { grid, doors, roomId };
}

export function getTileAt(room, x, y) {
  if (x < 0 || y < 0 || x >= ROOM_WIDTH || y >= ROOM_HEIGHT) return null;
  return room.grid[y][x];
}
