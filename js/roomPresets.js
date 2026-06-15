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

function buildLayout({ rocks = [], poops = [], blood = [], barrels = [] } = {}) {
  const grid = createEmptyGrid();
  for (const [x, y] of rocks) place(grid, x, y, TILE.ROCK);
  for (const [x, y] of poops) place(grid, x, y, TILE.POOP);
  for (const [x, y] of blood) place(grid, x, y, TILE.BLOOD);
  for (const [x, y] of barrels) place(grid, x, y, TILE.BARREL);
  return grid;
}

const PRESET_LAYOUTS = {
  empty: {},

  // Rock-focused layouts
  single_center: { rocks: [[6, 3]] },
  twin_rocks: { rocks: [[4, 3], [8, 3]] },
  diagonal_pair: { rocks: [[3, 2], [9, 4]] },
  corner_rocks: { rocks: [[2, 1], [10, 1], [2, 5], [10, 5]] },
  north_arc: { rocks: [[3, 1], [4, 2], [6, 1], [8, 2], [9, 1]] },
  south_arc: { rocks: [[3, 5], [4, 4], [6, 5], [8, 4], [9, 5]] },
  side_pillars: { rocks: [[2, 2], [2, 4], [10, 2], [10, 4]] },
  cross_plus: {
    rocks: [[6, 1], [6, 2], [6, 4], [6, 5], [4, 3], [5, 3], [7, 3], [8, 3]],
  },
  u_shape: {
    rocks: [[4, 2], [4, 3], [4, 4], [8, 2], [8, 3], [8, 4], [5, 4], [6, 4], [7, 4]],
  },
  center_island: {
    rocks: [[5, 2], [6, 2], [7, 2], [5, 3], [7, 3], [5, 4], [6, 4], [7, 4]],
  },
  north_wall: { rocks: [[2, 1], [3, 1], [4, 1], [8, 1], [9, 1], [10, 1]] },
  south_wall: { rocks: [[2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5]] },
  alcove: { rocks: [[1, 2], [1, 3], [1, 4], [11, 2], [11, 3], [11, 4]] },
  zigzag: { rocks: [[3, 1], [5, 2], [7, 3], [5, 4], [3, 5]] },
  sparse_ring: { rocks: [[5, 1], [7, 1], [9, 3], [7, 5], [5, 5], [3, 3]] },
  rock_cluster: { rocks: [[5, 2], [6, 2], [7, 2], [6, 3], [6, 4]] },
  scattered_a: { rocks: [[3, 2], [8, 1], [5, 4], [9, 5], [2, 4]] },
  scattered_b: { rocks: [[4, 1], [7, 2], [3, 5], [10, 4], [8, 5]] },
  hallway_blocks: { rocks: [[3, 3], [9, 3], [3, 2], [9, 4]] },

  // Poop-focused layouts
  poop_lane: { poops: [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3]] },
  poop_cross: { poops: [[6, 2], [6, 3], [6, 4], [5, 3], [7, 3]] },
  poop_snake: {
    poops: [[3, 2], [4, 3], [5, 2], [6, 3], [7, 2], [8, 3], [9, 2]],
  },
  poop_scatter: { poops: [[3, 2], [8, 1], [10, 4], [2, 5], [6, 4], [4, 3]] },
  poop_ring: { poops: [[5, 1], [7, 1], [9, 3], [7, 5], [5, 5], [3, 3]] },
  poop_stacks: { poops: [[4, 2], [4, 3], [8, 3], [8, 4], [6, 5]] },
  poop_mire: {
    poops: [[2, 2], [3, 3], [4, 4], [8, 2], [9, 3], [10, 4], [6, 3], [5, 4], [7, 2]],
  },
  poop_fork: { poops: [[4, 3], [6, 3], [8, 3], [5, 4], [7, 4], [6, 5]] },
  poop_diamond: { poops: [[6, 2], [5, 3], [7, 3], [6, 4], [4, 3], [8, 3]] },
  poop_corners: { poops: [[2, 1], [10, 1], [2, 5], [10, 5]] },

  // Clever mixed layouts
  poop_gate: {
    rocks: [[4, 2], [8, 2], [4, 4], [8, 4]],
    poops: [[6, 3]],
    barrels: [[3, 3], [9, 3]],
  },
  poop_guards: {
    rocks: [[3, 2], [3, 4], [9, 2], [9, 4]],
    poops: [[6, 3]],
    barrels: [[6, 1]],
  },
  poop_bridge: {
    rocks: [[2, 2], [10, 4]],
    poops: [[5, 3], [6, 3], [7, 3]],
    barrels: [[6, 5]],
  },
  poop_alley: {
    rocks: [[2, 2], [2, 4], [10, 2], [10, 4]],
    poops: [[5, 3], [6, 3], [7, 3], [8, 3]],
  },
  poop_teeth: {
    rocks: [[4, 2], [8, 2], [4, 4], [8, 4]],
    poops: [[5, 3], [7, 3]],
    barrels: [[6, 3]],
  },
  poop_flank: {
    rocks: [[6, 3]],
    poops: [[3, 2], [3, 4], [9, 2], [9, 4]],
    barrels: [[2, 3], [10, 3]],
  },
  poop_islands: {
    rocks: [[4, 2], [8, 4]],
    poops: [[3, 4], [9, 2], [6, 3]],
    barrels: [[6, 5]],
  },
  poop_pillars: {
    rocks: [[3, 2], [9, 2], [3, 4], [9, 4]],
    poops: [[6, 3]],
    barrels: [[1, 3], [11, 3]],
  },
  blocked_pass: {
    rocks: [[5, 2], [7, 2], [5, 4], [7, 4], [4, 3], [8, 3]],
    poops: [[6, 3]],
    barrels: [[6, 1]],
  },
  rock_poop_split: {
    rocks: [[3, 2], [3, 4], [9, 2], [9, 4]],
    poops: [[6, 1], [6, 5]],
    barrels: [[6, 3]],
  },
  poop_cluster: {
    poops: [[5, 2], [6, 2], [7, 2], [6, 3], [6, 4]],
    rocks: [[2, 3], [10, 3]],
    barrels: [[4, 4], [8, 4]],
  },
  poop_steps: {
    poops: [[3, 4], [5, 3], [7, 2], [9, 3]],
    rocks: [[6, 5], [2, 2]],
    barrels: [[8, 5]],
  },
  barrel_pair: { barrels: [[4, 3], [8, 3]] },
  barrel_corner: { barrels: [[2, 1], [10, 5], [6, 3]] },
  barrel_wall: { barrels: [[3, 2], [5, 2], [7, 2], [9, 2]] },
  barrel_rock_mix: { rocks: [[6, 3]], barrels: [[3, 3], [9, 3]] },

  boss_chamber: {
    blood: [
      [1, 0], [2, 0], [10, 0], [11, 0], [0, 1], [12, 1],
      [1, 6], [11, 6], [0, 5], [12, 5], [2, 6], [10, 6],
      [3, 1], [9, 1], [4, 5], [8, 5], [5, 0], [7, 6],
      [2, 3], [10, 3], [6, 1], [6, 5], [3, 3], [9, 3],
      [4, 2], [8, 4], [5, 2], [7, 4], [1, 4], [11, 2],
      [2, 2], [10, 4], [4, 4], [8, 2], [6, 6], [6, 0],
    ],
    rocks: [[6, 3]],
    poops: [[4, 3], [8, 3]],
    barrels: [[2, 4], [10, 4]],
  },
};

const LAYOUT_BUILDERS = Object.fromEntries(
  Object.entries(PRESET_LAYOUTS).map(([id, layout]) => [
    id,
    () => buildLayout(layout),
  ])
);

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
    poopStates: null,
    destroyedRocks: null,
    barrelStates: null,
  };
}

export function getRoomCatalogEntry(presetId = "empty") {
  return ROOM_PRESETS[presetId] ?? { name: "Unknown Room" };
}

export function listAllPresetIds() {
  return Object.keys(ROOM_PRESETS);
}
