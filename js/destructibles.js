import { POOP_HITS_TO_DESTROY, TILE } from "./constants.js";
import { destroyBlueRock, isBlueRockSolid } from "./blueRock.js";
import { destroyPot, isPotSolid } from "./pot.js";

export function initDestroyedRocks(grid, existing = null) {
  if (existing) return existing;
  return new Set();
}

export function isRockSolid(room, tx, ty) {
  if (room.grid[ty]?.[tx] !== TILE.ROCK) return false;
  return !room.destroyedRocks?.has(`${tx},${ty}`);
}

export function destroyRock(room, tx, ty) {
  const code = room.grid[ty]?.[tx];
  if (code === TILE.ROCK) {
    if (!room.destroyedRocks) room.destroyedRocks = new Set();
    room.destroyedRocks.add(`${tx},${ty}`);
    return true;
  }
  if (code === TILE.BLUE_ROCK) {
    return destroyBlueRock(room, tx, ty);
  }
  return false;
}

export function destroyPoopInstant(room, tx, ty) {
  const key = `${tx},${ty}`;
  const state = room.poopStates?.[key];
  if (!state || state.destroyed) return;
  state.hits = POOP_HITS_TO_DESTROY;
  state.destroyed = true;
}

export { isBlueRockSolid, isPotSolid, destroyPot, destroyBlueRock };
