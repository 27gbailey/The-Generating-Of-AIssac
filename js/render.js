import {
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
  WALL_THICKNESS,
} from "./constants.js";
import { doorSegment } from "./doors.js";

const TILE_COLORS = {
  [TILE.FLOOR]: "#3d2f24",
  [TILE.WALL]: "#1a1410",
  [TILE.ROCK]: "#6b6b6b",
};

const WALL_COLOR = "#0f0b08";
const DOOR_COLOR = "#5c4033";
const GRID_LINE = "rgba(255, 255, 255, 0.06)";

function roomPixelSize() {
  return {
    width: ROOM_WIDTH * TILE_SIZE + WALL_THICKNESS * 2,
    height: ROOM_HEIGHT * TILE_SIZE + WALL_THICKNESS * 2,
  };
}

function doorSegmentForWall(wall) {
  return doorSegment(wall);
}

export function drawRoom(ctx, room, offsetX, offsetY) {
  const { width, height } = roomPixelSize();
  const originX = offsetX - width / 2;
  const originY = offsetY - height / 2;

  ctx.fillStyle = "#120e0c";
  ctx.fillRect(originX, originY, width, height);

  ctx.fillStyle = WALL_COLOR;
  ctx.fillRect(originX, originY, width, height);

  ctx.fillStyle = TILE_COLORS[TILE.FLOOR];
  ctx.fillRect(
    originX + WALL_THICKNESS,
    originY + WALL_THICKNESS,
    ROOM_WIDTH * TILE_SIZE,
    ROOM_HEIGHT * TILE_SIZE
  );

  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const code = room.grid[y][x];
      const px = originX + WALL_THICKNESS + x * TILE_SIZE;
      const py = originY + WALL_THICKNESS + y * TILE_SIZE;

      if (code !== TILE.FLOOR) {
        ctx.fillStyle = TILE_COLORS[code] ?? "#ff00ff";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }

      ctx.strokeStyle = GRID_LINE;
      ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  for (const wall of DOOR_WALLS) {
    if (!room.doors[wall]) continue;
    const segment = doorSegmentForWall(wall);
    if (!segment) continue;

    ctx.fillStyle = DOOR_COLOR;
    ctx.fillRect(
      originX + segment.x,
      originY + segment.y,
      segment.w,
      segment.h
    );
  }

  return { originX, originY, width, height };
}

export { roomPixelSize };
