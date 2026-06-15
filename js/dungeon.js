import {
  DIRECTIONS,
  DOOR_WALLS,
  FLOOR_GRID_SIZE,
} from "./constants.js";
import { DEFAULT_PRESET, buildRoomFromPreset } from "./rooms.js";
import { getPlayAreaSize } from "./roomSpace.js";
import { isInDoorGap } from "./doors.js";

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function doorsForCell(cells, gx, gy) {
  const doors = { north: false, east: false, south: false, west: false };
  for (const wall of DOOR_WALLS) {
    const { dx, dy } = DIRECTIONS[wall];
    doors[wall] = Boolean(cells[`${gx + dx},${gy + dy}`]);
  }
  return doors;
}

function neighborCount(cells, gx, gy) {
  let count = 0;
  for (const wall of DOOR_WALLS) {
    const { dx, dy } = DIRECTIONS[wall];
    if (cells[`${gx + dx},${gy + dy}`]) count++;
  }
  return count;
}

function expandableDirections(cells, gx, gy, rand) {
  const options = [];
  for (const wall of shuffle(DOOR_WALLS, rand)) {
    const { dx, dy } = DIRECTIONS[wall];
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= FLOOR_GRID_SIZE || ny >= FLOOR_GRID_SIZE) continue;
    if (cells[`${nx},${ny}`]) continue;
    options.push({ wall, nx, ny });
  }
  return options;
}

function pickExpansionCell(cells, rand) {
  const occupied = Object.values(cells);
  const deadEnds = occupied.filter((cell) => neighborCount(cells, cell.gx, cell.gy) === 1);
  const branchPoints = occupied.filter((cell) => {
    const count = neighborCount(cells, cell.gx, cell.gy);
    return count >= 1 && count < 4 && expandableDirections(cells, cell.gx, cell.gy, rand).length > 0;
  });

  if (deadEnds.length > 0 && rand() < 0.72) {
    return deadEnds[Math.floor(rand() * deadEnds.length)];
  }
  if (branchPoints.length > 0) {
    return branchPoints[Math.floor(rand() * branchPoints.length)];
  }
  return occupied[Math.floor(rand() * occupied.length)];
}

export function generateDungeon(seed = Date.now()) {
  const rand = mulberry32(seed);
  const cells = {};
  const startX = Math.floor(FLOOR_GRID_SIZE / 2);
  const startY = Math.floor(FLOOR_GRID_SIZE / 2);
  cells[`${startX},${startY}`] = { gx: startX, gy: startY, isStart: true };

  const targetRooms = 8 + Math.floor(rand() * 8);

  let attempts = 0;
  while (Object.keys(cells).length < targetRooms && attempts < 500) {
    attempts++;
    const cell = pickExpansionCell(cells, rand);
    const options = expandableDirections(cells, cell.gx, cell.gy, rand);
    if (options.length === 0) continue;

    const pick = options[0];
    cells[`${pick.nx},${pick.ny}`] = { gx: pick.nx, gy: pick.ny, isStart: false };
  }

  const rooms = {};
  for (const cell of Object.values(cells)) {
    const doors = doorsForCell(cells, cell.gx, cell.gy);
    rooms[`${cell.gx},${cell.gy}`] = {
      ...cell,
      doors,
      presetId: DEFAULT_PRESET,
      room: buildRoomFromPreset(DEFAULT_PRESET, doors),
    };
  }

  return {
    seed,
    rooms,
    start: { gx: startX, gy: startY },
    visited: new Set([`${startX},${startY}`]),
  };
}

export function getCurrentRoomData(dungeon, gx, gy) {
  return dungeon.rooms[`${gx},${gy}`] ?? null;
}

function inDoorGapForTransition(wall, x, y, width, height) {
  return isInDoorGap(wall, x, y, width, height);
}

export function checkDoorTransition(player, room, gx, gy, dungeon) {
  const { width, height } = getPlayAreaSize();
  const r = player.radius * 0.85;

  const checks = [
    { wall: "north", test: player.y - r <= 0, nx: gx, ny: gy - 1, entry: "south" },
    { wall: "south", test: player.y + r >= height, nx: gx, ny: gy + 1, entry: "north" },
    { wall: "west", test: player.x - r <= 0, nx: gx - 1, ny: gy, entry: "east" },
    { wall: "east", test: player.x + r >= width, nx: gx + 1, ny: gy, entry: "west" },
  ];

  for (const check of checks) {
    if (!room.doors[check.wall] || !check.test) continue;
    if (!inDoorGapForTransition(check.wall, player.x, player.y, width, height)) continue;

    const next = getCurrentRoomData(dungeon, check.nx, check.ny);
    if (!next) continue;

    return {
      gx: check.nx,
      gy: check.ny,
      entry: check.entry,
      room: next.room,
    };
  }

  return null;
}

export function entryPosition(entryWall) {
  const { width, height } = getPlayAreaSize();
  const centerX = width / 2;
  const centerY = height / 2;
  const inset = 36;

  switch (entryWall) {
    case "north":
      return { x: centerX, y: inset };
    case "south":
      return { x: centerX, y: height - inset };
    case "west":
      return { x: inset, y: centerY };
    case "east":
      return { x: width - inset, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
}

export function listRoomCells(dungeon) {
  return Object.values(dungeon.rooms);
}
