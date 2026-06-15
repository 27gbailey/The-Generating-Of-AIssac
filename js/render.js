import {
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
  WALL_THICKNESS,
} from "./constants.js";
import { doorSegment } from "./doors.js";
import {
  createRoomAmbience,
  drawRoomAmbience,
  updateRoomAmbience,
} from "./roomAmbience.js";

const TILE_COLORS = {
  [TILE.FLOOR]: "#3d2f24",
  [TILE.WALL]: "#1a1410",
  [TILE.ROCK]: "#6b6b6b",
};

const WALL_TOP = "#2e241c";
const WALL_FACE = "#15100c";
const WALL_SHADOW = "#0a0705";
const DOOR_FRAME = "#4a3428";
const DOOR_INNER = "#2a1f18";
const GRID_LINE = "rgba(255, 255, 255, 0.05)";

const ambienceCache = new Map();

function roomPixelSize() {
  return {
    width: ROOM_WIDTH * TILE_SIZE + WALL_THICKNESS * 2,
    height: ROOM_HEIGHT * TILE_SIZE + WALL_THICKNESS * 2,
  };
}

function getAmbience(room, cellKey, dungeonSeed) {
  if (!ambienceCache.has(cellKey)) {
    const [gx, gy] = cellKey.split(",").map(Number);
    ambienceCache.set(cellKey, createRoomAmbience(gx, gy, dungeonSeed));
  }
  return ambienceCache.get(cellKey);
}

export function tickRoomAmbience(cellKey, dt, dungeonSeed) {
  const ambience = ambienceCache.get(cellKey);
  if (ambience) updateRoomAmbience(ambience, dt);
}

function textureBand(ctx, x, y, w, h, horizontal) {
  ctx.fillStyle = WALL_FACE;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = WALL_TOP;
  if (horizontal) {
    ctx.fillRect(x, y, w, Math.max(3, h * 0.35));
  } else {
    ctx.fillRect(x, y, Math.max(3, w * 0.35), h);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  if (horizontal) {
    for (let i = x + 8; i < x + w; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, y + 2);
      ctx.lineTo(i, y + h - 2);
      ctx.stroke();
    }
  } else {
    for (let i = y + 8; i < y + h; i += 14) {
      ctx.beginPath();
      ctx.moveTo(x + 2, i);
      ctx.lineTo(x + w - 2, i);
      ctx.stroke();
    }
  }
}

function drawDoor(ctx, originX, originY, segment, wall) {
  const x = originX + segment.x;
  const y = originY + segment.y;

  ctx.fillStyle = DOOR_INNER;
  ctx.fillRect(x, y, segment.w, segment.h);

  ctx.strokeStyle = DOOR_FRAME;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, segment.w - 2, segment.h - 2);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  if (wall === "north" || wall === "south") {
    ctx.beginPath();
    ctx.moveTo(x + segment.w * 0.35, y + 2);
    ctx.lineTo(x + segment.w * 0.35, y + segment.h - 2);
    ctx.moveTo(x + segment.w * 0.65, y + 2);
    ctx.lineTo(x + segment.w * 0.65, y + segment.h - 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + segment.h * 0.35);
    ctx.lineTo(x + segment.w - 2, y + segment.h * 0.35);
    ctx.moveTo(x + 2, y + segment.h * 0.65);
    ctx.lineTo(x + segment.w - 2, y + segment.h * 0.65);
    ctx.stroke();
  }
}

function drawWalls(ctx, originX, originY, width, height, room) {
  const floorX = originX + WALL_THICKNESS;
  const floorY = originY + WALL_THICKNESS;
  const floorW = ROOM_WIDTH * TILE_SIZE;
  const floorH = ROOM_HEIGHT * TILE_SIZE;

  ctx.fillStyle = WALL_SHADOW;
  ctx.fillRect(originX, originY, width, height);

  textureBand(ctx, originX, originY, width, WALL_THICKNESS, true);
  textureBand(ctx, originX, originY + height - WALL_THICKNESS, width, WALL_THICKNESS, true);
  textureBand(ctx, originX, originY, WALL_THICKNESS, height, false);
  textureBand(ctx, originX + width - WALL_THICKNESS, originY, WALL_THICKNESS, height, false);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(floorX, floorY + floorH - 3, floorW, 3);
  ctx.fillRect(floorX + floorW - 3, floorY, 3, floorH);

  for (const wall of DOOR_WALLS) {
    if (!room.doors[wall]) continue;
    const segment = doorSegment(wall);
    if (!segment) continue;
    drawDoor(ctx, originX, originY, segment, wall);
  }
}

export function drawRoom(ctx, room, offsetX, offsetY, options = {}) {
  const { width, height } = roomPixelSize();
  const originX = offsetX - width / 2;
  const originY = offsetY - height / 2;
  const floorX = originX + WALL_THICKNESS;
  const floorY = originY + WALL_THICKNESS;
  const floorW = ROOM_WIDTH * TILE_SIZE;
  const floorH = ROOM_HEIGHT * TILE_SIZE;

  ctx.fillStyle = "#120e0c";
  ctx.fillRect(originX, originY, width, height);

  ctx.fillStyle = TILE_COLORS[TILE.FLOOR];
  ctx.fillRect(floorX, floorY, floorW, floorH);

  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const code = room.grid[y][x];
      const px = floorX + x * TILE_SIZE;
      const py = floorY + y * TILE_SIZE;

      if (code !== TILE.FLOOR) {
        ctx.fillStyle = TILE_COLORS[code] ?? "#ff00ff";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }

      ctx.strokeStyle = GRID_LINE;
      ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  if (options.cellKey && options.dungeonSeed != null) {
    const ambience = getAmbience(room, options.cellKey, options.dungeonSeed);
    drawRoomAmbience(ctx, ambience, floorX, floorY, floorW, floorH);
  }

  drawWalls(ctx, originX, originY, width, height, room);

  return { originX, originY, width, height, floorX, floorY, floorW, floorH };
}

export { roomPixelSize };
