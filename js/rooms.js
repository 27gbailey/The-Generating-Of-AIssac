import { TILE } from "./constants.js";
import { createEmptyGrid, decodeRoomId, encodeRoomId } from "./roomId.js";

export const DEFAULT_PRESET = "empty";

export const ROOM_PRESETS = {
  empty: {
    name: "Empty Room",
    buildGrid() {
      return createEmptyGrid(TILE.FLOOR);
    },
  },
};

export function buildRoomFromPreset(presetId, doors) {
  const preset = ROOM_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown room preset "${presetId}".`);
  }

  const roomId = encodeRoomId(preset.buildGrid(), doors);
  const room = decodeRoomId(roomId);
  return { ...room, presetId };
}

export function getRoomCatalogEntry(presetId = DEFAULT_PRESET) {
  return ROOM_PRESETS[presetId] ?? { name: "Unknown Room" };
}

export function getPresetRoomId(presetId, doors) {
  const preset = ROOM_PRESETS[presetId];
  return encodeRoomId(preset.buildGrid(), doors);
}
