import { TILE } from "./constants.js";
import { createEmptyGrid, decodeRoomId, encodeRoomId } from "./roomId.js";

function hashSeed(gx, gy, seed) {
  return ((gx * 73856093) ^ (gy * 19349663) ^ seed) >>> 0;
}

function scatterRocks(grid, gx, gy, seed) {
  const h = hashSeed(gx, gy, seed);
  const count = h % 4;

  for (let i = 0; i < count; i++) {
    const tx = 1 + ((h >> (i * 3)) % (grid[0].length - 2));
    const ty = 1 + ((h >> (i * 5 + 2)) % (grid.length - 2));
    if (grid[ty][tx] === TILE.FLOOR) {
      grid[ty][tx] = TILE.ROCK;
    }
  }
}

export function createRoomFromDoors(doors, gx, gy, seed = 1) {
  const grid = createEmptyGrid(TILE.FLOOR);
  scatterRocks(grid, gx, gy, seed);
  const roomId = encodeRoomId(grid, doors);
  return decodeRoomId(roomId);
}

export function getRoomCatalogEntry() {
  return { name: "Dungeon Room" };
}
