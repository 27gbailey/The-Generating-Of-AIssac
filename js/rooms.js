import { TILE } from "./constants.js";
import { createEmptyGrid, encodeRoomId } from "./roomId.js";

function buildStarterRoomId() {
  const grid = createEmptyGrid(TILE.FLOOR);

  grid[3][6] = TILE.ROCK;

  return encodeRoomId(grid, {
    north: false,
    east: true,
    south: true,
    west: false,
  });
}

export const STARTER_ROOM_ID = buildStarterRoomId();

export const ROOM_CATALOG = {
  [STARTER_ROOM_ID]: {
    name: "Starter Room",
    description: "A simple room with floor tiles, one rock, and doors on the east and south walls.",
  },
};

export function getRoomCatalogEntry(roomId) {
  return ROOM_CATALOG[roomId] ?? null;
}

export function listRoomIds() {
  return Object.keys(ROOM_CATALOG);
}
