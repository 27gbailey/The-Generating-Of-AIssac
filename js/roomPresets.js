import {
  BLOCKING_TILES,
  DOOR_CLEARANCE,
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
} from "./constants.js";
import { createEmptyGrid, decodeRoomId, encodeRoomId } from "./roomId.js";

function place(grid, x, y, code) {
  if (x >= 0 && x < ROOM_WIDTH && y >= 0 && y < ROOM_HEIGHT) {
    grid[y][x] = code;
  }
}

function scatterRocks(grid, coords) {
  for (const [x, y] of coords) place(grid, x, y, TILE.ROCK);
  return grid;
}

const LAYOUT_BUILDERS = {
  empty: () => createEmptyGrid(),

  single_center: () => scatterRocks(createEmptyGrid(), [[6, 3]]),

  corner_rocks: () =>
    scatterRocks(createEmptyGrid(), [
      [2, 1], [10, 1], [2, 5], [10, 5],
    ]),

  north_arc: () =>
    scatterRocks(createEmptyGrid(), [
      [3, 1], [4, 2], [6, 1], [8, 2], [9, 1],
    ]),

  south_arc: () =>
    scatterRocks(createEmptyGrid(), [
      [3, 5], [4, 4], [6, 5], [8, 4], [9, 5],
    ]),

  side_pillars: () =>
    scatterRocks(createEmptyGrid(), [
      [2, 2], [2, 4], [10, 2], [10, 4],
    ]),

  cross_plus: () =>
    scatterRocks(createEmptyGrid(), [
      [6, 1], [6, 2], [6, 4], [6, 5],
      [4, 3], [5, 3], [7, 3], [8, 3],
    ]),

  scattered_a: () =>
    scatterRocks(createEmptyGrid(), [
      [3, 2], [8, 1], [5, 4], [9, 5], [2, 4],
    ]),

  scattered_b: () =>
    scatterRocks(createEmptyGrid(), [
      [4, 1], [7, 2], [3, 5], [10, 4], [8, 5],
    ]),

  u_shape: () =>
    scatterRocks(createEmptyGrid(), [
      [4, 2], [4, 3], [4, 4], [8, 2], [8, 3], [8, 4], [5, 4], [6, 4], [7, 4],
    ]),

  center_island: () =>
    scatterRocks(createEmptyGrid(), [
      [5, 2], [6, 2], [7, 2], [5, 3], [7, 3], [5, 4], [6, 4], [7, 4],
    ]),

  twin_rocks: () => scatterRocks(createEmptyGrid(), [[4, 3], [8, 3]]),

  diagonal_pair: () => scatterRocks(createEmptyGrid(), [[3, 2], [9, 4]]),

  north_wall: () =>
    scatterRocks(createEmptyGrid(), [
      [2, 1], [3, 1], [4, 1], [8, 1], [9, 1], [10, 1],
    ]),

  south_wall: () =>
    scatterRocks(createEmptyGrid(), [
      [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
    ]),

  alcove: () =>
    scatterRocks(createEmptyGrid(), [
      [1, 2], [1, 3], [1, 4], [11, 2], [11, 3], [11, 4],
    ]),

  zigzag: () =>
    scatterRocks(createEmptyGrid(), [
      [3, 1], [5, 2], [7, 3], [5, 4], [3, 5],
    ]),

  sparse_ring: () =>
    scatterRocks(createEmptyGrid(), [
      [5, 1], [7, 1], [9, 3], [7, 5], [5, 5], [3, 3],
    ]),

  rock_cluster: () =>
    scatterRocks(createEmptyGrid(), [
      [5, 2], [6, 2], [7, 2], [6, 3], [6, 4],
    ]),

  hallway_blocks: () =>
    scatterRocks(createEmptyGrid(), [
      [3, 3], [9, 3], [3, 2], [9, 4],
    ]),

  boss_chamber: () => {
    const grid = createEmptyGrid();
    const bloodCoords = [
      [1, 0], [2, 0], [10, 0], [11, 0], [0, 1], [12, 1],
      [1, 6], [11, 6], [0, 5], [12, 5], [2, 6], [10, 6],
      [3, 1], [9, 1], [4, 5], [8, 5], [5, 0], [7, 6],
      [2, 3], [10, 3], [6, 1], [6, 5], [3, 3], [9, 3],
      [4, 2], [8, 4], [5, 2], [7, 4], [1, 4], [11, 2],
      [2, 2], [10, 4], [4, 4], [8, 2], [6, 6], [6, 0],
    ];
    for (const [x, y] of bloodCoords) place(grid, x, y, TILE.BLOOD);
    place(grid, 6, 3, TILE.ROCK);
    return grid;
  },
};

export const BOSS_PRESET = "boss_chamber";

export const ROOM_PRESET_POOL = Object.keys(LAYOUT_BUILDERS).filter(
  (id) => id !== BOSS_PRESET
);

export const ROOM_PRESETS = Object.fromEntries(
  Object.entries(LAYOUT_BUILDERS).map(([id, buildGrid]) => [
    id,
    {
      id,
      name: id === BOSS_PRESET ? "Boss Chamber" : formatPresetName(id),
      isBoss: id === BOSS_PRESET,
      buildGrid,
      baseRoomId: encodeRoomId(buildGrid(), {
        north: false,
        east: false,
        south: false,
        west: false,
      }),
    },
  ])
);

function formatPresetName(id) {
  return id
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function getBlockedWalls(grid) {
  const blocked = { north: false, east: false, south: false, west: false };
  for (const wall of DOOR_WALLS) {
    for (const tile of DOOR_CLEARANCE[wall]) {
      const code = grid[tile.y][tile.x];
      if (BLOCKING_TILES.has(code)) {
        blocked[wall] = true;
        break;
      }
    }
  }
  return blocked;
}

export function wallsConflictWithNeighbors(blocked, neighborWalls) {
  for (const wall of neighborWalls) {
    if (blocked[wall]) return true;
  }
  return false;
}

export function pickPresetForCell(rand, requiredWalls, excludeBoss = true) {
  const pool = excludeBoss
    ? ROOM_PRESET_POOL.filter((id) => {
        const grid = ROOM_PRESETS[id].buildGrid();
        const blocked = getBlockedWalls(grid);
        return !wallsConflictWithNeighbors(blocked, requiredWalls);
      })
    : [BOSS_PRESET];

  if (pool.length === 0) return "empty";

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled[0];
}

export function buildRoomFromPreset(presetId, doors) {
  const preset = ROOM_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown room preset "${presetId}".`);
  }

  const roomId = encodeRoomId(preset.buildGrid(), doors);
  const room = decodeRoomId(roomId);
  return {
    ...room,
    presetId,
    isBoss: preset.isBoss,
    blockedWalls: getBlockedWalls(room.grid),
  };
}

export function getRoomCatalogEntry(presetId = "empty") {
  return ROOM_PRESETS[presetId] ?? { name: "Unknown Room" };
}

export function listAllPresetIds() {
  return Object.keys(ROOM_PRESETS);
}
