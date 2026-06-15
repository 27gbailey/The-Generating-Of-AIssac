import { ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE, WALL_THICKNESS } from "./constants.js";

export const DOOR_SPAN = TILE_SIZE * 2;

export function getDoorCenters() {
  return {
    floorCenterX: WALL_THICKNESS + (ROOM_WIDTH * TILE_SIZE) / 2,
    floorCenterY: WALL_THICKNESS + (ROOM_HEIGHT * TILE_SIZE) / 2,
  };
}

export function getPlayAreaCenter() {
  return {
    x: (ROOM_WIDTH * TILE_SIZE) / 2,
    y: (ROOM_HEIGHT * TILE_SIZE) / 2,
  };
}

export function doorSegment(wall) {
  const { floorCenterX, floorCenterY } = getDoorCenters();
  const half = DOOR_SPAN / 2;

  switch (wall) {
    case "north":
      return { x: floorCenterX - half, y: 0, w: DOOR_SPAN, h: WALL_THICKNESS };
    case "south":
      return {
        x: floorCenterX - half,
        y: WALL_THICKNESS + ROOM_HEIGHT * TILE_SIZE,
        w: DOOR_SPAN,
        h: WALL_THICKNESS,
      };
    case "west":
      return { x: 0, y: floorCenterY - half, w: WALL_THICKNESS, h: DOOR_SPAN };
    case "east":
      return {
        x: WALL_THICKNESS + ROOM_WIDTH * TILE_SIZE,
        y: floorCenterY - half,
        w: WALL_THICKNESS,
        h: DOOR_SPAN,
      };
    default:
      return null;
  }
}

export function isInDoorGap(wall, x, y, playWidth, playHeight) {
  const center = getPlayAreaCenter();
  const half = DOOR_SPAN / 2;

  switch (wall) {
    case "north":
    case "south":
      return x >= center.x - half && x <= center.x + half;
    case "west":
    case "east":
      return y >= center.y - half && y <= center.y + half;
    default:
      return false;
  }
}
