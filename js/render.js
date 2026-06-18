import {
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
  WALL_THICKNESS,
} from "./constants.js";
import { doorSegment } from "./doors.js";
import { isRockSolid } from "./destructibles.js";
import { drawBarrel } from "./barrel.js";
import { drawPoop } from "./poop.js";
import { drawCampfire } from "./campfire.js";
import { drawRock3D } from "./objectDraw.js";
import {
  createRoomAmbience,
  drawRoomAmbience,
  updateRoomAmbience,
} from "./roomAmbience.js";

const TILE_COLORS = {
  [TILE.FLOOR]: "#8f8170",
  [TILE.WALL]: "#1a1410",
  [TILE.ROCK]: "#7a7a7a",
  [TILE.BLOOD]: "#5a1a1a",
};

const WALL_TOP = "#2e241c";
const WALL_FACE = "#15100c";
const DOOR_FRAME = "#4a3428";
const DOOR_INNER = "#2a1f18";
const GRID_LINE = "rgba(255, 255, 255, 0.04)";

const ambienceCache = new Map();

function roomPixelSize() {
  return {
    width: ROOM_WIDTH * TILE_SIZE + WALL_THICKNESS * 2,
    height: ROOM_HEIGHT * TILE_SIZE + WALL_THICKNESS * 2,
  };
}

function getAmbience(cellKey, dungeonSeed) {
  if (!ambienceCache.has(cellKey)) {
    const [gx, gy] = cellKey.split(",").map(Number);
    ambienceCache.set(cellKey, createRoomAmbience(gx, gy, dungeonSeed));
  }
  return ambienceCache.get(cellKey);
}

export function tickRoomAmbience(cellKey, dt, dungeonSeed) {
  const ambience = getAmbience(cellKey, dungeonSeed);
  updateRoomAmbience(ambience, dt);
  return ambience.time;
}

function drawFloorTile(ctx, px, py) {
  ctx.fillStyle = TILE_COLORS[TILE.FLOOR];
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  const shade = ((px + py) % (TILE_SIZE * 2)) / (TILE_SIZE * 4);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.04 + shade * 0.03})`;
  ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
}

function textureBand(ctx, x, y, w, h, horizontal, wallSide) {
  ctx.fillStyle = WALL_FACE;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = WALL_TOP;
  if (horizontal) {
    ctx.fillRect(x, y, w, Math.max(4, h * 0.38));
  } else {
    ctx.fillRect(x, y, Math.max(4, w * 0.38), h);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  if (horizontal) {
    for (let i = x + 10; i < x + w; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, y + 3);
      ctx.lineTo(i, y + h - 3);
      ctx.stroke();
    }
  } else {
    for (let i = y + 10; i < y + h; i += 16) {
      ctx.beginPath();
      ctx.moveTo(x + 3, i);
      ctx.lineTo(x + w - 3, i);
      ctx.stroke();
    }
  }

  drawWallInnerShadow(ctx, x, y, w, h, horizontal, wallSide);
}

function drawWallInnerShadow(ctx, x, y, w, h, horizontal, wallSide) {
  const shadowDepth = 22;
  let grad;

  if (wallSide === "north") {
    grad = ctx.createLinearGradient(x, y + h, x, y + h + shadowDepth);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y + h, w, shadowDepth);
  } else if (wallSide === "south") {
    grad = ctx.createLinearGradient(x, y, x, y - shadowDepth);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.38)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y - shadowDepth, w, shadowDepth);
  } else if (wallSide === "west") {
    grad = ctx.createLinearGradient(x + w, y, x + w + shadowDepth, y);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x + w, y, shadowDepth, h);
  } else if (wallSide === "east") {
    grad = ctx.createLinearGradient(x, y, x - shadowDepth, y);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - shadowDepth, y, shadowDepth, h);
  }
}

function drawDoor(ctx, originX, originY, segment, wall, locked = false, broken = false) {
  const x = originX + segment.x;
  const y = originY + segment.y;

  if (broken) {
    ctx.fillStyle = "#1a1410";
    ctx.fillRect(x, y, segment.w, segment.h);
    ctx.strokeStyle = "#3a2818";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, segment.w - 2, segment.h - 2);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + segment.w - 4, y + segment.h - 4);
    ctx.moveTo(x + segment.w - 4, y + 4);
    ctx.lineTo(x + 4, y + segment.h - 4);
    ctx.stroke();
    return;
  }

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

  if (locked) {
    ctx.fillStyle = "rgba(60, 15, 15, 0.65)";
    ctx.fillRect(x + 2, y + 2, segment.w - 4, segment.h - 4);
    ctx.strokeStyle = "#8a2020";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + segment.w - 6, y + segment.h - 6);
    ctx.moveTo(x + segment.w - 6, y + 6);
    ctx.lineTo(x + 6, y + segment.h - 6);
    ctx.stroke();
  }
}

function drawWalls(ctx, originX, originY, width, height, room, isBoss = false) {
  textureBand(ctx, originX, originY, width, WALL_THICKNESS, true, "north");
  textureBand(
    ctx,
    originX,
    originY + height - WALL_THICKNESS,
    width,
    WALL_THICKNESS,
    true,
    "south"
  );
  textureBand(ctx, originX, originY, WALL_THICKNESS, height, false, "west");
  textureBand(
    ctx,
    originX + width - WALL_THICKNESS,
    originY,
    WALL_THICKNESS,
    height,
    false,
    "east"
  );

  if (isBoss) {
    ctx.fillStyle = "rgba(90, 15, 15, 0.45)";
    ctx.fillRect(originX, originY, width, WALL_THICKNESS);
    ctx.fillRect(originX, originY + height - WALL_THICKNESS, width, WALL_THICKNESS);
    ctx.fillRect(originX, originY, WALL_THICKNESS, height);
    ctx.fillRect(originX + width - WALL_THICKNESS, originY, WALL_THICKNESS, height);
  }

  for (const wall of DOOR_WALLS) {
    if (!room.doors[wall]) continue;
    const segment = doorSegment(wall);
    if (!segment) continue;
    const locked = room.doorLock?.locked && !room.doorLock?.broken?.[wall];
    const broken = room.doorLock?.broken?.[wall];
    drawDoor(ctx, originX, originY, segment, wall, locked, broken);
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
  const time = options.time ?? 0;

  ctx.fillStyle = "#120e0c";
  ctx.fillRect(originX, originY, width, height);

  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const px = floorX + x * TILE_SIZE;
      const py = floorY + y * TILE_SIZE;
      drawFloorTile(ctx, px, py);
    }
  }

  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const code = room.grid[y][x];
      const px = floorX + x * TILE_SIZE;
      const py = floorY + y * TILE_SIZE;

      if (code === TILE.BLOOD) {
        ctx.fillStyle = TILE_COLORS[TILE.BLOOD];
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = "rgba(120, 20, 20, 0.35)";
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE * 0.65, py + TILE_SIZE * 0.55, TILE_SIZE * 0.22, 0, Math.PI * 2);
        ctx.fill();
      } else if (code === TILE.ROCK) {
        if (isRockSolid(room, x, y)) {
          drawRock3D(ctx, px, py);
        }
      } else if (code === TILE.POOP) {
        const state = room.poopStates?.[`${x},${y}`] ?? { hits: 0, destroyed: false };
        drawPoop(ctx, px, py, state.hits, state.destroyed);
      } else if (code === TILE.BARREL) {
        const state = room.barrelStates?.[`${x},${y}`] ?? { hits: 0, destroyed: false };
        drawBarrel(ctx, px, py, state.hits, state.destroyed);
      } else if (code === TILE.CAMPFIRE || code === TILE.RED_CAMPFIRE) {
        const state = room.campfireStates?.[`${x},${y}`] ?? { hits: 0, extinguished: false };
        drawCampfire(ctx, px, py, state.hits, state.extinguished, time, {
          isRed: code === TILE.RED_CAMPFIRE,
          flicker: state.flicker ?? 0,
        });
      } else if (code !== TILE.FLOOR) {
        ctx.fillStyle = TILE_COLORS[code] ?? "#ff00ff";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }

      ctx.strokeStyle = GRID_LINE;
      ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  drawWalls(ctx, originX, originY, width, height, room, options.isBoss);

  if (options.cellKey && options.dungeonSeed != null) {
    const ambience = getAmbience(options.cellKey, options.dungeonSeed);
    drawRoomAmbience(ctx, ambience, floorX, floorY, floorW, floorH);
  }

  return { originX, originY, width, height, floorX, floorY, floorW, floorH };
}

export { roomPixelSize };
