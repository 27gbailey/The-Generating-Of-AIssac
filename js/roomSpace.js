import {
  DOOR_WALLS,
  ROCK_HITBOX_INSET,
  ROCK_HITBOX_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
  WALL_THICKNESS,
} from "./constants.js";
import { isInDoorGap } from "./doors.js";
import { isBarrelSolid, barrelHitbox } from "./barrel.js";
import { isRockSolid } from "./destructibles.js";
import { findPoopHit, isPoopSolid, poopHitbox } from "./poop.js";

export function getPlayAreaSize() {
  return {
    width: ROOM_WIDTH * TILE_SIZE,
    height: ROOM_HEIGHT * TILE_SIZE,
  };
}

export function getRoomScreenLayout(offsetX, offsetY) {
  const width = ROOM_WIDTH * TILE_SIZE + WALL_THICKNESS * 2;
  const height = ROOM_HEIGHT * TILE_SIZE + WALL_THICKNESS * 2;

  return {
    originX: offsetX - width / 2,
    originY: offsetY - height / 2,
    width,
    height,
    floorX: offsetX - (ROOM_WIDTH * TILE_SIZE) / 2,
    floorY: offsetY - (ROOM_HEIGHT * TILE_SIZE) / 2,
  };
}

export function playToScreen(x, y, layout) {
  return {
    x: layout.floorX + x,
    y: layout.floorY + y,
  };
}


function isSolidTile(code, room, tx, ty) {
  if (code === TILE.WALL) return true;
  if (code === TILE.ROCK) return isRockSolid(room, tx, ty);
  if (code === TILE.POOP) return isPoopSolid(room, tx, ty);
  if (code === TILE.BARREL) return isBarrelSolid(room, tx, ty);
  return false;
}

function rockHitbox(tx, ty) {
  const inset = ROCK_HITBOX_INSET;
  return {
    left: tx * TILE_SIZE + inset,
    top: ty * TILE_SIZE + inset,
    width: TILE_SIZE - inset * 2,
    height: TILE_SIZE - inset * 2,
    radius: ROCK_HITBOX_RADIUS,
  };
}

function circleIntersectsRoundedRect(cx, cy, radius, rect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const halfW = rect.width / 2 - rect.radius;
  const halfH = rect.height / 2 - rect.radius;
  const localX = Math.abs(cx - centerX) - halfW;
  const localY = Math.abs(cy - centerY) - halfH;
  const outside = Math.hypot(Math.max(localX, 0), Math.max(localY, 0));
  return outside - rect.radius <= radius;
}

export function getTileAtPlayPos(room, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (tx < 0 || ty < 0 || tx >= ROOM_WIDTH || ty >= ROOM_HEIGHT) return null;
  return { code: room.grid[ty][tx], tx, ty };
}

function circleIntersectsTile(cx, cy, radius, tx, ty) {
  const left = tx * TILE_SIZE;
  const top = ty * TILE_SIZE;
  const nearestX = Math.max(left, Math.min(cx, left + TILE_SIZE));
  const nearestY = Math.max(top, Math.min(cy, top + TILE_SIZE));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

export function circleHitsBoundary(cx, cy, radius, room) {
  const { width, height } = getPlayAreaSize();

  if (cx - radius < 0) {
    if (!room.doors.west || !isInDoorGap("west", cx, cy, width, height)) return true;
  }
  if (cx + radius > width) {
    if (!room.doors.east || !isInDoorGap("east", cx, cy, width, height)) return true;
  }
  if (cy - radius < 0) {
    if (!room.doors.north || !isInDoorGap("north", cx, cy, width, height)) return true;
  }
  if (cy + radius > height) {
    if (!room.doors.south || !isInDoorGap("south", cx, cy, width, height)) return true;
  }

  return false;
}

export function circleHitsRoom(cx, cy, radius, room) {
  if (circleHitsBoundary(cx, cy, radius, room)) return true;

  const { width, height } = getPlayAreaSize();
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const code = room.grid[ty][tx];
      if (!isSolidTile(code, room, tx, ty)) continue;
      if (code === TILE.ROCK) {
        if (circleIntersectsRoundedRect(cx, cy, radius, rockHitbox(tx, ty))) return true;
      } else if (code === TILE.POOP) {
        if (circleIntersectsRoundedRect(cx, cy, radius, poopHitbox(tx, ty))) return true;
      } else if (code === TILE.BARREL) {
        if (circleIntersectsRoundedRect(cx, cy, radius, barrelHitbox(tx, ty))) return true;
      } else if (circleIntersectsTile(cx, cy, radius, tx, ty)) {
        return true;
      }
    }
  }

  return false;
}

export function circleHitsRoomExcluding(cx, cy, radius, room, exX, exY, exR) {
  if (circleHitsBoundary(cx, cy, radius, room)) return true;

  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const code = room.grid[ty][tx];
      if (!isSolidTile(code, room, tx, ty)) continue;

      let hit = false;
      if (code === TILE.ROCK) {
        hit = circleIntersectsRoundedRect(cx, cy, radius, rockHitbox(tx, ty));
      } else if (code === TILE.POOP) {
        hit = circleIntersectsRoundedRect(cx, cy, radius, poopHitbox(tx, ty));
      } else if (code === TILE.BARREL) {
        hit = circleIntersectsRoundedRect(cx, cy, radius, barrelHitbox(tx, ty));
      } else {
        hit = circleIntersectsTile(cx, cy, radius, tx, ty);
      }

      if (!hit) continue;

      const tileLeft = tx * TILE_SIZE;
      const tileTop = ty * TILE_SIZE;
      const nearestX = Math.max(tileLeft, Math.min(cx, tileLeft + TILE_SIZE));
      const nearestY = Math.max(tileTop, Math.min(cy, tileTop + TILE_SIZE));
      const edx = nearestX - exX;
      const edy = nearestY - exY;
      if (edx * edx + edy * edy <= exR * exR) continue;

      return true;
    }
  }

  return false;
}

export function getSpawnPosition(room) {
  const { width, height } = getPlayAreaSize();
  let x = width / 2;
  let y = height / 2;

  for (let i = 0; i < 24; i++) {
    if (!circleHitsRoom(x, y, 20, room)) return { x, y };
    x = width / 2 + (Math.random() - 0.5) * TILE_SIZE * 2;
    y = height / 2 + (Math.random() - 0.5) * TILE_SIZE * 2;
  }

  return { x: width / 2, y: height / 2 };
}

export { DOOR_WALLS, WALL_THICKNESS, findPoopHit };
