import { FLOOR_GRID_SIZE } from "./constants.js";
import { listRoomCells } from "./dungeon.js";

const MAP_PADDING = 12;
const MAP_CELL = 10;

export function drawMinimap(ctx, canvas, dungeon, currentGx, currentGy) {
  const mapWidth = FLOOR_GRID_SIZE * MAP_CELL;
  const mapHeight = FLOOR_GRID_SIZE * MAP_CELL;
  const x = canvas.width - mapWidth - MAP_PADDING;
  const y = MAP_PADDING;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.fillRect(x - 8, y - 8, mapWidth + 16, mapHeight + 16);
  ctx.strokeRect(x - 8, y - 8, mapWidth + 16, mapHeight + 16);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Map", x, y - 14);

  for (const cell of listRoomCells(dungeon)) {
    const key = `${cell.gx},${cell.gy}`;
    const visited = dungeon.visited.has(key);
    const isCurrent = cell.gx === currentGx && cell.gy === currentGy;

    let fill = "rgba(60, 50, 45, 0.35)";
    if (visited) fill = "rgba(90, 75, 60, 0.85)";
    if (cell.isBoss) fill = visited ? "rgba(120, 30, 30, 0.95)" : "rgba(90, 20, 20, 0.7)";
    if (cell.isStart) fill = "rgba(120, 90, 70, 0.9)";
    if (isCurrent) fill = "rgba(180, 140, 90, 1)";

    ctx.fillStyle = fill;
    ctx.fillRect(
      x + cell.gx * MAP_CELL + 1,
      y + cell.gy * MAP_CELL + 1,
      MAP_CELL - 2,
      MAP_CELL - 2
    );
  }

  ctx.restore();
}
