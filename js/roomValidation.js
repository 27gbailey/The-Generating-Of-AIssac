import {
  DIRECTIONS,
  DOOR_CLEARANCE,
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
} from "./constants.js";

/** Anything on a door clearance tile except open floor blocks that doorway. */
export function tileBlocksDoor(code) {
  return code !== TILE.FLOOR && code !== TILE.BLOOD;
}

export function getBlockedWalls(grid) {
  const blocked = { north: false, east: false, south: false, west: false };
  for (const wall of DOOR_WALLS) {
    for (const tile of DOOR_CLEARANCE[wall]) {
      if (tileBlocksDoor(grid[tile.y][tile.x])) {
        blocked[wall] = true;
        break;
      }
    }
  }
  return blocked;
}

function isWalkableFloor(code) {
  return code === TILE.FLOOR || code === TILE.BLOOD;
}

const TEAR_CLEARABLE = new Set([
  TILE.POOP,
  TILE.BARREL,
  TILE.CAMPFIRE,
  TILE.RED_CAMPFIRE,
]);

function floodFill(grid, startTiles, canWalk) {
  const visited = new Set();
  const queue = [...startTiles];
  for (const tile of startTiles) {
    visited.add(`${tile.x},${tile.y}`);
  }

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= ROOM_WIDTH || ny >= ROOM_HEIGHT) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (!canWalk(grid[ny][nx])) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return visited;
}

export function getDoorClearanceStartTiles(grid, walls) {
  const starts = [];
  for (const wall of walls) {
    for (const tile of DOOR_CLEARANCE[wall]) {
      if (isWalkableFloor(grid[tile.y][tile.x])) {
        starts.push(tile);
      }
    }
  }
  return starts;
}

export function getReachableFromDoors(grid, openWalls) {
  const union = new Set();
  for (const wall of openWalls) {
    const starts = getDoorClearanceStartTiles(grid, [wall]);
    if (!starts.length) continue;
    const visited = floodFill(grid, starts, isWalkableFloor);
    for (const key of visited) union.add(key);
  }
  return union;
}

export function doorsMutuallyReachable(grid, walls) {
  if (walls.length <= 1) return true;

  const starts = getDoorClearanceStartTiles(grid, [walls[0]]);
  if (!starts.length) return false;

  const visited = floodFill(grid, starts, isWalkableFloor);

  for (const wall of walls) {
    let wallReachable = false;
    for (const tile of DOOR_CLEARANCE[wall]) {
      if (visited.has(`${tile.x},${tile.y}`)) {
        wallReachable = true;
        break;
      }
    }
    if (!wallReachable) return false;
  }
  return true;
}

export function presetSupportsDoors(buildGrid, requiredWalls) {
  const { grid } = buildGrid();
  const blocked = getBlockedWalls(grid);
  for (const wall of requiredWalls) {
    if (blocked[wall]) return false;
  }
  if (!doorsMutuallyReachable(grid, requiredWalls)) return false;
  return true;
}

export function wallsConflictWithNeighbors(blocked, neighborWalls) {
  for (const wall of neighborWalls) {
    if (blocked[wall]) return true;
  }
  return false;
}

export function bothSidesBlockSharedWall(gridA, gridB, wall) {
  const blockedA = getBlockedWalls(gridA);
  const opposite = DIRECTIONS[wall].opposite;
  const blockedB = getBlockedWalls(gridB);
  return blockedA[wall] && blockedB[opposite];
}

export function isTearClearable(code) {
  return TEAR_CLEARABLE.has(code);
}

export function isSpawnReachableFromDoors(grid, openWalls, tx, ty) {
  for (const wall of openWalls) {
    const starts = getDoorClearanceStartTiles(grid, [wall]);
    if (!starts.length) continue;
    const visited = floodFill(grid, starts, isWalkableFloor);
    if (visited.has(`${tx},${ty}`)) return true;
  }
  return false;
}

/**
 * When a floor pocket is only separated from doors by tear-clearables, ensure
 * at least one tear-clearable tile sits on that boundary so enemies can be freed.
 */
export function softBarrierAllowsEnemyAccess(grid, openWalls, tx, ty) {
  if (isSpawnReachableFromDoors(grid, openWalls, tx, ty)) return true;

  for (const wall of openWalls) {
    const starts = getDoorClearanceStartTiles(grid, [wall]);
    if (!starts.length) continue;

    const floorReach = floodFill(grid, starts, isWalkableFloor);
    const softReach = floodFill(
      grid,
      starts,
      (code) => isWalkableFloor(code) || isTearClearable(code)
    );

    if (!softReach.has(`${tx},${ty}`)) continue;

    for (let y = 0; y < ROOM_HEIGHT; y++) {
      for (let x = 0; x < ROOM_WIDTH; x++) {
        if (!isTearClearable(grid[y][x])) continue;
        if (!softReach.has(`${x},${y}`)) continue;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (floorReach.has(`${nx},${ny}`)) return true;
        }
      }
    }
  }
  return false;
}
