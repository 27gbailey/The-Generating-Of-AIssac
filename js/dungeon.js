import {
  DIRECTIONS,
  DOOR_WALLS,
  FLOOR_GRID_SIZE,
  TILE_SIZE,
} from "./constants.js";
import { createRoomFromDoors } from "./rooms.js";
import { getPlayAreaSize } from "./roomSpace.js";

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

export function generateDungeon(seed = Date.now()) {
  const rand = mulberry32(seed);
  const cells = {};
  const startX = Math.floor(FLOOR_GRID_SIZE / 2);
  const startY = Math.floor(FLOOR_GRID_SIZE / 2);
  const queue = [`${startX},${startY}`];
  cells[`${startX},${startY}`] = { gx: startX, gy: startY, isStart: true };

  const targetRooms = 26 + Math.floor(rand() * 14);

  while (queue.length > 0 && Object.keys(cells).length < targetRooms) {
    const key = queue.splice(Math.floor(rand() * queue.length), 1)[0];
    const [gx, gy] = key.split(",").map(Number);
    const options = shuffle(DOOR_WALLS, rand);

    for (const wall of options) {
      if (Object.keys(cells).length >= targetRooms) break;

      const { dx, dy } = DIRECTIONS[wall];
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= FLOOR_GRID_SIZE || ny >= FLOOR_GRID_SIZE) continue;

      const nKey = `${nx},${ny}`;
      if (cells[nKey]) continue;

      if (rand() < 0.62 || Object.keys(cells).length < 8) {
        cells[nKey] = { gx: nx, gy: ny, isStart: false };
        queue.push(nKey);
      }
    }
  }

  const rooms = {};
  for (const cell of Object.values(cells)) {
    const doors = doorsForCell(cells, cell.gx, cell.gy);
    rooms[`${cell.gx},${cell.gy}`] = {
      ...cell,
      doors,
      room: createRoomFromDoors(doors, cell.gx, cell.gy, seed),
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

function inDoorGap(wall, x, y, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const half = TILE_SIZE;

  switch (wall) {
    case "north":
    case "south":
      return x >= centerX - half && x <= centerX + half;
    case "west":
    case "east":
      return y >= centerY - half && y <= centerY + half;
    default:
      return false;
  }
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
    if (!inDoorGap(check.wall, player.x, player.y, width, height)) continue;

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
