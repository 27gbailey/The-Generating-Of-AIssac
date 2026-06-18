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

function normalizePickups(raw = []) {
  return raw.map((entry) => {
    if (Array.isArray(entry)) {
      const [type, x, y] = entry;
      return { type, x, y };
    }
    return entry;
  });
}

function buildLayout({
  rocks = [],
  poops = [],
  blood = [],
  barrels = [],
  campfires = [],
  redCampfires = [],
  pickups = [],
  skipPerimeter = false,
  perimeter = "normal",
} = {}) {
  const grid = createEmptyGrid();
  for (const [x, y] of rocks) place(grid, x, y, TILE.ROCK);
  for (const [x, y] of poops) place(grid, x, y, TILE.POOP);
  for (const [x, y] of blood) place(grid, x, y, TILE.BLOOD);
  for (const [x, y] of barrels) place(grid, x, y, TILE.BARREL);
  for (const [x, y] of campfires) place(grid, x, y, TILE.CAMPFIRE);
  for (const [x, y] of redCampfires) place(grid, x, y, TILE.RED_CAMPFIRE);
  if (!skipPerimeter) applyPerimeterRing(grid, perimeter);
  return { grid, pickups: normalizePickups(pickups) };
}

const DOOR_TILES = new Set(
  DOOR_CLEARANCE.north
    .concat(DOOR_CLEARANCE.south, DOOR_CLEARANCE.west, DOOR_CLEARANCE.east)
    .map(({ x, y }) => `${x},${y}`)
);

function isDoorTile(x, y) {
  return DOOR_TILES.has(`${x},${y}`);
}

/** Outermost playable tiles — flush against the walls. */
const ORGANIZED_EDGE_SLOTS = [
  [0, 0], [12, 0], [0, 6], [12, 6],
  [3, 0], [9, 0], [3, 6], [9, 6],
  [0, 1], [0, 5], [12, 1], [12, 5],
  [1, 0], [11, 0], [1, 6], [11, 6],
  [6, 0], [6, 6], [0, 2], [12, 4],
];

const PERIMETER_COUNTS = { sparse: 2, normal: 4, dense: 8 };

/** Organized edge accents on the wall-adjacent ring (not the inner ring). */
function applyPerimeterRing(grid, density = "normal") {
  const maxCount = PERIMETER_COUNTS[density] ?? PERIMETER_COUNTS.normal;
  const types = [TILE.ROCK, TILE.ROCK, TILE.POOP, TILE.CAMPFIRE, TILE.ROCK, TILE.CAMPFIRE, TILE.POOP, TILE.ROCK];

  let placed = 0;
  for (let i = 0; i < ORGANIZED_EDGE_SLOTS.length && placed < maxCount; i++) {
    const [x, y] = ORGANIZED_EDGE_SLOTS[i];
    if (isDoorTile(x, y)) continue;
    if (grid[y][x] !== TILE.FLOOR) continue;
    place(grid, x, y, types[placed % types.length]);
    placed++;
  }
}

const PRESET_LAYOUTS = {
  empty: { skipPerimeter: true },

  // Sparse organized rooms
  open_floor: { perimeter: "sparse" },
  sparse_lone_rock: { rocks: [[6, 3]], perimeter: "sparse" },
  sparse_twin: { rocks: [[5, 3], [7, 3]], perimeter: "sparse" },
  sparse_campfire: { campfires: [[6, 3]], perimeter: "sparse" },

  // Dense organized rooms
  dense_rock_row: { rocks: [[4, 3], [6, 3], [8, 3]], perimeter: "dense" },
  dense_rock_grid: {
    rocks: [[4, 2], [6, 2], [8, 2], [4, 4], [6, 4], [8, 4]],
    perimeter: "dense",
  },
  dense_poop_cross: {
    poops: [[6, 2], [6, 4], [5, 3], [7, 3]],
    perimeter: "dense",
  },
  dense_campfire_ring: {
    campfires: [[6, 3]],
    perimeter: "dense",
  },

  // Simple single-feature rooms
  single_poop: { poops: [[6, 3]] },
  single_barrel: { barrels: [[6, 3]], skipPerimeter: true },
  edge_rocks: { rocks: [[0, 2], [0, 3], [0, 4], [12, 2], [12, 3], [12, 4]] },
  edge_barrels: { barrels: [[0, 1], [12, 1], [0, 5], [12, 5]], skipPerimeter: true },
  edge_campfires: { campfires: [[0, 1], [12, 1], [0, 5], [12, 5]] },

  // Rock-focused layouts
  single_center: { rocks: [[6, 3]] },
  twin_rocks: { rocks: [[4, 3], [8, 3]] },
  diagonal_pair: { rocks: [[3, 2], [9, 4]] },
  corner_rocks: { rocks: [[0, 0], [12, 0], [0, 6], [12, 6]] },
  north_arc: { rocks: [[3, 0], [4, 0], [6, 0], [8, 0], [9, 0]] },
  south_arc: { rocks: [[3, 6], [4, 6], [6, 6], [8, 6], [9, 6]] },
  side_pillars: { rocks: [[0, 2], [0, 4], [12, 2], [12, 4]] },
  cross_plus: {
    rocks: [[6, 1], [6, 2], [6, 4], [6, 5], [4, 3], [5, 3], [7, 3], [8, 3]],
  },
  u_shape: {
    rocks: [[4, 2], [4, 3], [4, 4], [8, 2], [8, 3], [8, 4], [5, 4], [6, 4], [7, 4]],
  },
  center_island: {
    rocks: [[5, 2], [6, 2], [7, 2], [5, 3], [7, 3], [5, 4], [6, 4], [7, 4]],
  },
  north_wall: { rocks: [[2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0]] },
  south_wall: { rocks: [[2, 6], [3, 6], [4, 6], [8, 6], [9, 6], [10, 6]] },
  alcove: { rocks: [[0, 2], [0, 3], [0, 4], [12, 2], [12, 3], [12, 4]] },
  zigzag: { rocks: [[3, 1], [5, 2], [7, 3], [5, 4], [3, 5]] },
  sparse_ring: { rocks: [[5, 1], [7, 1], [9, 3], [7, 5], [5, 5], [3, 3]] },
  rock_cluster: { rocks: [[5, 2], [6, 2], [7, 2], [6, 3], [6, 4]] },
  scattered_a: { rocks: [[3, 2], [8, 1], [5, 4], [9, 5], [2, 4]] },
  scattered_b: { rocks: [[4, 1], [7, 2], [3, 5], [10, 4], [8, 5]] },
  hallway_blocks: { rocks: [[3, 3], [9, 3], [3, 2], [9, 4]] },

  // Poop-focused layouts
  poop_curtain: {
    rocks: [[2, 2], [2, 4], [10, 2], [10, 4]],
    poops: [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]],
  },
  poop_cross: {
    rocks: [[4, 2], [8, 2], [4, 4], [8, 4]],
    poops: [[6, 2], [6, 3], [6, 4], [5, 3], [7, 3]],
  },
  poop_snake: {
    rocks: [[2, 2], [10, 4], [6, 1], [6, 5]],
    poops: [[3, 2], [4, 3], [5, 2], [6, 3], [7, 2], [8, 3], [9, 2]],
  },
  toxic_airlock: {
    rocks: [[2, 2], [2, 4], [10, 2], [10, 4], [6, 2], [6, 4]],
    poops: [[4, 2], [4, 3], [4, 4], [8, 2], [8, 3], [8, 4]],
    pickups: [["key", 6, 3]],
  },
  poop_ring: {
    rocks: [[6, 3], [3, 2], [9, 4]],
    poops: [[5, 1], [7, 1], [9, 3], [7, 5], [5, 5], [3, 3]],
  },
  poop_stacks: {
    rocks: [[2, 3], [10, 3], [6, 1]],
    poops: [[4, 2], [4, 3], [8, 3], [8, 4], [6, 5]],
  },
  poop_mire: {
    rocks: [[1, 3], [11, 3], [6, 1], [6, 5]],
    poops: [[2, 2], [3, 3], [4, 4], [8, 2], [9, 3], [10, 4], [6, 3], [5, 4], [7, 2]],
  },
  poop_fork: {
    rocks: [[2, 3], [10, 3], [6, 2]],
    poops: [[4, 3], [6, 3], [8, 3], [5, 4], [7, 4], [6, 5]],
  },
  poop_diamond: {
    rocks: [[6, 1], [6, 5], [3, 3], [9, 3]],
    poops: [[6, 2], [5, 3], [7, 3], [6, 4], [4, 3], [8, 3]],
  },
  poop_corners: {
    rocks: [[6, 3], [5, 2], [7, 4]],
    poops: [[2, 1], [10, 1], [2, 5], [10, 5]],
  },
  poop_north_seal: {
    rocks: [[2, 1], [10, 1], [2, 5], [10, 5]],
    poops: [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2]],
    pickups: [["half_heart", 8, 1]],
  },

  // Clever mixed / puzzle layouts
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
  split_chamber: {
    rocks: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5]],
    poops: [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3]],
    pickups: [["penny", 10, 2], ["half_heart", 10, 3]],
  },
  barrier_blast: {
    rocks: [[4, 2], [4, 4], [8, 2], [8, 4]],
    barrels: [[5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    poops: [[6, 3]],
    pickups: [["key", 10, 3]],
  },
  chain_hall: {
    rocks: [[1, 2], [1, 4], [11, 2], [11, 4], [5, 2], [5, 4], [8, 2], [8, 4]],
    poops: [[7, 3], [8, 3], [9, 3], [10, 3]],
    barrels: [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3]],
    pickups: [["penny", 10, 2], ["penny", 10, 4]],
  },
  double_lock: {
    rocks: [[2, 2], [2, 4], [10, 2], [10, 4]],
    poops: [[4, 3], [5, 3], [6, 3]],
    barrels: [[7, 3], [8, 3], [9, 3]],
    pickups: [["half_heart", 10, 3]],
  },
  barrel_chamber: {
    rocks: [[7, 2], [7, 3], [7, 4], [8, 2], [8, 4], [9, 2], [9, 3], [9, 4], [10, 3]],
    barrels: [[8, 3]],
    poops: [[4, 2], [4, 3], [4, 4], [5, 3], [6, 3]],
    pickups: [["full_heart", 9, 3]],
  },
  barrel_diagonal: {
    rocks: [[1, 5], [11, 1], [7, 2], [3, 4], [10, 3]],
    poops: [[9, 2], [9, 3], [9, 4]],
    barrels: [[2, 4], [3, 3], [4, 2], [5, 1]],
  },
  barrel_fuse_h: {
    rocks: [[2, 2], [10, 4], [2, 4], [10, 2], [6, 2], [6, 4]],
    barrels: [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3]],
    poops: [[6, 5], [7, 5]],
    pickups: [["bomb", 10, 3]],
  },
  barrel_fuse_v: {
    rocks: [[4, 2], [8, 4], [4, 4], [8, 2], [3, 3], [9, 3]],
    barrels: [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5]],
  },
  barrel_fuse_v: {
    rocks: [[4, 2], [8, 4], [4, 4], [8, 2], [3, 3], [9, 3]],
    barrels: [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5]],
  },

  // Rock-wall puzzles — break poop / campfire / barrel to pass
  rock_wall_poop_gate: {
    rocks: [[3, 2], [4, 2], [5, 2], [7, 2], [8, 2], [9, 2], [3, 3], [4, 3], [5, 3], [7, 3], [8, 3], [9, 3]],
    poops: [[6, 2]],
  },
  rock_wall_campfire_gate: {
    rocks: [[2, 3], [3, 3], [4, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]],
    campfires: [[5, 3]],
  },
  rock_wall_barrel_gate: {
    rocks: [[3, 1], [4, 1], [5, 1], [7, 1], [8, 1], [9, 1], [3, 2], [4, 2], [5, 2], [7, 2], [8, 2], [9, 2]],
    barrels: [[6, 1]],
  },
  rock_wall_double_poop: {
    rocks: [[2, 2], [3, 2], [4, 2], [8, 2], [9, 2], [10, 2], [2, 3], [3, 3], [4, 3], [8, 3], [9, 3], [10, 3]],
    poops: [[5, 2], [7, 2]],
  },
  rock_curtain_campfire: {
    rocks: [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5]],
    campfires: [[6, 3]],
    barrels: [[6, 1]],
  },
  rock_maze_barrel_exit: {
    rocks: [[2, 2], [2, 3], [2, 4], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [10, 3], [10, 4], [9, 4], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4]],
    barrels: [[3, 3]],
    poops: [[9, 3]],
  },

  // Loot trapped behind rock rows
  loot_behind_rocks: {
    rocks: [[5, 2], [6, 2], [7, 2], [5, 3], [7, 3], [5, 4], [6, 4], [7, 4]],
    pickups: [["key", 6, 3]],
  },
  chest_rock_vault: {
    rocks: [[3, 2], [3, 3], [3, 4], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [9, 3], [9, 4]],
    pickups: [["penny", 10, 3]],
  },
  heart_rock_sanctuary: {
    rocks: [[4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [4, 2], [8, 2], [4, 3], [8, 3], [4, 4], [8, 4], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5]],
    pickups: [["half_heart", 6, 3]],
  },
  bomb_rock_cache: {
    rocks: [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3]],
    pickups: [["bomb", 8, 3]],
  },
  twin_vault_pickups: {
    rocks: [[5, 2], [6, 2], [7, 2], [5, 3], [7, 3], [5, 4], [6, 4], [7, 4]],
    pickups: [["penny", 6, 3], ["half_heart", 9, 3]],
    poops: [[6, 3]],
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

  // --- 40 additional layouts (sparse to dense) ---
  lone_barrel: { barrels: [[6, 3]] },
  lone_poop: { poops: [[6, 3]] },
  pebble_pair: { rocks: [[5, 3], [7, 3]] },
  offset_rock: { rocks: [[4, 2]] },
  quiet_corner: { rocks: [[10, 5]] },
  drip_poop: { poops: [[6, 2], [6, 4]] },
  twin_barrels: { barrels: [[4, 3], [8, 3]] },
  spare_pillar: { rocks: [[6, 2], [6, 4]] },
  lone_key_drop: { rocks: [[5, 3], [7, 3]], poops: [[6, 3]], pickups: [["key", 9, 3]] },
  penny_nook: { rocks: [[2, 3]], pickups: [["penny", 3, 3]] },

  rock_arrow: { rocks: [[6, 1], [5, 2], [6, 2], [7, 2], [6, 3]] },
  rock_chevron: { rocks: [[4, 2], [5, 1], [6, 1], [7, 1], [8, 2]] },
  rock_ladder: { rocks: [[3, 2], [3, 3], [3, 4], [9, 2], [9, 3], [9, 4]] },
  rock_hourglass: {
    rocks: [[4, 1], [5, 1], [7, 1], [8, 1], [5, 3], [7, 3], [4, 5], [5, 5], [7, 5], [8, 5]],
  },
  rock_spine: { rocks: [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [4, 3], [8, 3]] },
  rock_bowl: {
    rocks: [[4, 2], [5, 2], [7, 2], [8, 2], [4, 4], [5, 4], [7, 4], [8, 4]],
  },
  rock_shelf: { rocks: [[2, 1], [3, 1], [4, 1], [5, 1], [7, 1], [8, 1], [9, 1], [10, 1]] },
  rock_steps: { rocks: [[2, 5], [4, 4], [6, 3], [8, 2], [10, 1]] },

  poop_trip: { poops: [[5, 3], [6, 3], [7, 3]] },
  poop_pillars_v: { poops: [[4, 2], [4, 3], [4, 4], [8, 2], [8, 3], [8, 4]] },
  poop_l_shape: { poops: [[3, 2], [3, 3], [3, 4], [4, 4], [5, 4]] },
  poop_ramp: { poops: [[3, 5], [4, 4], [5, 3], [6, 2]] },
  poop_west_wall: { poops: [[2, 2], [2, 3], [2, 4], [3, 3]] },
  poop_east_wall: { poops: [[10, 2], [10, 3], [10, 4], [9, 3]] },

  barrel_triangle: { barrels: [[6, 2], [5, 4], [7, 4]] },
  barrel_scatter: { barrels: [[3, 2], [9, 4], [6, 5]] },
  barrel_north_row: { barrels: [[4, 1], [6, 1], [8, 1]] },
  barrel_south_row: { barrels: [[4, 5], [6, 5], [8, 5]] },
  barrel_cross: { barrels: [[6, 2], [5, 3], [6, 3], [7, 3], [6, 4]] },

  rock_poop_gate: {
    rocks: [[4, 2], [8, 2], [4, 4], [8, 4]],
    poops: [[5, 3], [6, 3], [7, 3]],
  },
  barrel_rock_maze: {
    rocks: [[5, 2], [7, 2], [5, 4], [7, 4]],
    barrels: [[6, 3], [3, 3], [9, 3]],
  },
  poop_barrel_cross: {
    poops: [[6, 2], [6, 4], [5, 3], [7, 3]],
    barrels: [[6, 3]],
  },
  choke_point: {
    rocks: [[5, 2], [7, 2]],
    poops: [[6, 3]],
    barrels: [[6, 4]],
  },
  west_cache: {
    rocks: [[3, 2], [3, 3], [3, 4]],
    poops: [[2, 3]],
    pickups: [["penny", 1, 3]],
  },
  east_vault: {
    rocks: [[9, 1], [9, 2], [9, 3], [9, 4], [9, 5]],
    barrels: [[10, 2], [10, 4]],
    pickups: [["key", 10, 3]],
  },
  north_loot: {
    poops: [[5, 2], [6, 2], [7, 2]],
    pickups: [["half_heart", 6, 1]],
  },
  south_stash: {
    rocks: [[4, 4], [8, 4]],
    poops: [[6, 4]],
    pickups: [["bomb", 6, 5]],
  },
  blast_corridor: {
    rocks: [[2, 2], [2, 4], [10, 2], [10, 4]],
    barrels: [[5, 3], [6, 3], [7, 3]],
  },

  gauntlet_run: {
    rocks: [[2, 2], [2, 4], [4, 3], [8, 3], [10, 2], [10, 4]],
    poops: [[6, 2], [6, 4]],
    barrels: [[6, 3]],
  },
  toxic_maze: {
    rocks: [[4, 2], [8, 2], [4, 4], [8, 4], [6, 2], [6, 4]],
    poops: [[5, 3], [6, 3], [7, 3], [5, 2], [7, 4]],
  },

  campfire_center: { campfires: [[6, 3]] },
  campfire_north: { campfires: [[6, 1]], rocks: [[5, 2], [7, 2]] },
  twin_campfires: { campfires: [[4, 3], [8, 3]] },
  campfire_puzzle: {
    campfires: [[6, 3]],
    barrels: [[5, 3], [7, 3]],
    rocks: [[6, 2]],
  },
  fire_ring: {
    campfires: [[5, 2], [7, 2], [5, 4], [7, 4]],
    rocks: [[6, 3]],
  },

  red_corner_lurker: { redCampfires: [[0, 1]] },
  red_corner_pair: { redCampfires: [[0, 0], [12, 6]] },
  red_four_corners: { redCampfires: [[0, 0], [12, 0], [0, 6], [12, 6]] },
  red_center_cluster: { redCampfires: [[5, 3], [6, 3], [7, 3]] },
  red_center_pyramid: { redCampfires: [[6, 2], [5, 3], [6, 3], [7, 3]] },
  red_mixed_corners: {
    redCampfires: [[0, 0], [12, 0], [0, 6], [12, 6]],
    campfires: [[6, 3]],
  },
  red_scatter_mixed: {
    redCampfires: [[0, 2], [12, 4], [3, 6]],
    campfires: [[6, 3], [9, 0]],
  },
  red_flank_guards: {
    redCampfires: [[0, 3], [12, 3]],
    campfires: [[6, 0], [6, 6]],
  },
  red_hell_hearth: {
    redCampfires: [[5, 2], [7, 2], [6, 3], [5, 4], [7, 4]],
    campfires: [[4, 3], [8, 3]],
  },

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
    redCampfires: [[0, 2], [12, 2], [2, 0], [10, 0]],
    skipPerimeter: true,
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
  Object.entries(LAYOUT_BUILDERS).map(([id, buildLayoutFn]) => {
    const { grid, pickups } = buildLayoutFn();
    return [
      id,
      {
        id,
        name: id === BOSS_PRESET ? "Boss Chamber" : formatPresetName(id),
        isBoss: id === BOSS_PRESET,
        buildGrid: buildLayoutFn,
        presetPickups: pickups,
        baseRoomId: encodeRoomId(grid, {
          north: false,
          east: false,
          south: false,
          west: false,
        }),
      },
    ];
  })
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
  const roll = rand();
  let group;
  if (roll < 0.22) group = PRESET_GROUPS.minimal;
  else if (roll < 0.34) group = PRESET_GROUPS.sparse;
  else if (roll < 0.52) group = PRESET_GROUPS.rocks;
  else if (roll < 0.64) group = PRESET_GROUPS.poops;
  else if (roll < 0.68) group = PRESET_GROUPS.barrels;
  else if (roll < 0.76) group = PRESET_GROUPS.campfires;
  else if (roll < 0.84) group = PRESET_GROUPS.red_campfires;
  else if (roll < 0.90) group = PRESET_GROUPS.dense;
  else if (roll < 0.94) group = PRESET_GROUPS.loot;
  else group = PRESET_GROUPS.puzzle;

  const pool = group.filter((id) => {
    if (!ROOM_PRESETS[id]) return false;
    const { grid } = ROOM_PRESETS[id].buildGrid();
    const blocked = getBlockedWalls(grid);
    return !wallsConflictWithNeighbors(blocked, requiredWalls);
  });

  if (pool.length === 0) {
    const fallback = PRESET_GROUPS.minimal.filter((id) => {
      if (!ROOM_PRESETS[id]) return false;
      const { grid } = ROOM_PRESETS[id].buildGrid();
      return !wallsConflictWithNeighbors(getBlockedWalls(grid), requiredWalls);
    });
    if (fallback.length) return fallback[Math.floor(rand() * fallback.length)];
    return "empty";
  }

  return pool[Math.floor(rand() * pool.length)];
}

const PRESET_GROUPS = {
  minimal: [
    "empty", "single_center", "twin_rocks", "open_floor", "sparse_lone_rock",
  ],
  sparse: [
    "open_floor", "sparse_lone_rock", "sparse_twin", "sparse_campfire",
    "single_center", "single_poop",
  ],
  rocks: [
    "corner_rocks", "north_wall", "south_wall", "alcove", "side_pillars",
    "edge_rocks", "north_arc", "south_arc", "rock_cluster",
  ],
  poops: [
    "single_poop", "poop_corners", "poop_stacks", "poop_ring", "poop_cross",
  ],
  barrels: [
    "single_barrel", "barrel_triangle", "lone_barrel",
  ],
  campfires: [
    "campfire_center", "campfire_north", "twin_campfires", "edge_campfires",
  ],
  red_campfires: [
    "red_corner_lurker", "red_corner_pair", "red_four_corners", "red_center_cluster",
    "red_center_pyramid", "red_mixed_corners", "red_scatter_mixed", "red_flank_guards",
    "red_hell_hearth",
  ],
  dense: [
    "dense_rock_row", "dense_rock_grid", "dense_poop_cross", "dense_campfire_ring",
    "center_island", "cross_plus", "u_shape",
  ],
  loot: [
    "west_cache", "east_vault", "north_loot", "south_stash",
    "loot_behind_rocks", "heart_rock_sanctuary", "bomb_rock_cache", "twin_vault_pickups",
    "chest_rock_vault", "lone_key_drop", "penny_nook",
  ],
  puzzle: [
    "poop_gate", "barrier_blast", "split_chamber", "chain_hall", "choke_point",
    "campfire_puzzle", "fire_ring", "blast_corridor",
    "rock_wall_poop_gate", "rock_wall_campfire_gate", "rock_wall_barrel_gate",
    "rock_wall_double_poop", "rock_curtain_campfire", "rock_maze_barrel_exit",
    "loot_behind_rocks", "chest_rock_vault", "heart_rock_sanctuary", "bomb_rock_cache",
    "twin_vault_pickups",
    "toxic_airlock", "poop_north_seal", "barrel_chamber", "double_lock", "barrel_fuse_h",
  ],
};

export const PUZZLE_PRESET_IDS = new Set([
  ...PRESET_GROUPS.puzzle,
  ...PRESET_GROUPS.loot,
]);

export function isPuzzlePreset(presetId) {
  return PUZZLE_PRESET_IDS.has(presetId);
}

export function presetHasLayoutPickups(presetId) {
  const preset = ROOM_PRESETS[presetId];
  return (preset?.presetPickups?.length ?? 0) > 0;
}

export function buildRoomFromPreset(presetId, doors) {
  const preset = ROOM_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown room preset "${presetId}".`);
  }

  const { grid, pickups } = preset.buildGrid();
  const roomId = encodeRoomId(grid, doors);
  const room = decodeRoomId(roomId);
  return {
    ...room,
    presetId,
    isBoss: preset.isBoss,
    blockedWalls: getBlockedWalls(room.grid),
    presetPickups: pickups,
    poopStates: null,
    destroyedRocks: null,
    barrelStates: null,
    campfireStates: null,
  };
}

export function getRoomCatalogEntry(presetId = "empty") {
  return ROOM_PRESETS[presetId] ?? { name: "Unknown Room" };
}

export function listAllPresetIds() {
  return Object.keys(ROOM_PRESETS);
}
