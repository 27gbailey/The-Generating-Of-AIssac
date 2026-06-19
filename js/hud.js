import { MAX_HEART_CONTAINERS, FLOOR_GRID_SIZE } from "./constants.js";
import { heartSlotState } from "./stats.js";
import { drawItemSprite, getItem } from "./items.js";

const MAP_PADDING = 12;
const MAP_CELL = 10;
const ITEMS_PER_ROW = 3;
const ITEM_SLOT_SIZE = 40;

const HEART_SVG = {
  full: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
  unowned: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
  soul: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
};

let heartsEl = null;
let pennyEl = null;
let keyEl = null;
let bombEl = null;
let itemBarEl = null;
let pickupBannerEl = null;
let pickupNameEl = null;
let pickupFlavorEl = null;

let pickupBannerTimer = 0;
const PICKUP_BANNER_DURATION = 4.2;

export function initStatsHud() {
  heartsEl = document.getElementById("hearts-grid");
  pennyEl = document.getElementById("penny-count");
  keyEl = document.getElementById("key-count");
  bombEl = document.getElementById("bomb-count");

  if (!heartsEl) return;

  heartsEl.innerHTML = "";
  for (let i = 0; i < MAX_HEART_CONTAINERS; i++) {
    const slot = document.createElement("div");
    slot.className = "heart-slot";
    slot.dataset.slot = String(i);
    heartsEl.appendChild(slot);
  }
}

export function initItemHud() {
  itemBarEl = document.getElementById("item-bar");
  pickupBannerEl = document.getElementById("item-pickup-banner");
  pickupNameEl = document.getElementById("item-pickup-name");
  pickupFlavorEl = document.getElementById("item-pickup-flavor");
}

export function showItemPickup(item) {
  if (!item || !pickupBannerEl) return;
  if (pickupNameEl) pickupNameEl.textContent = item.name;
  if (pickupFlavorEl) pickupFlavorEl.textContent = item.flavorText;
  pickupBannerEl.classList.remove("hidden");
  pickupBannerTimer = PICKUP_BANNER_DURATION;
}

export function tickItemPickupBanner(dt) {
  if (pickupBannerTimer <= 0 || !pickupBannerEl) return;
  pickupBannerTimer -= dt;
  if (pickupBannerTimer <= 0) {
    pickupBannerEl.classList.add("hidden");
  }
}

export function updateItemBar(itemIds = []) {
  if (!itemBarEl) return;

  itemBarEl.innerHTML = "";
  if (!itemIds.length) {
    itemBarEl.classList.add("empty");
    return;
  }

  itemBarEl.classList.remove("empty");

  for (let i = 0; i < itemIds.length; i++) {
    const slot = document.createElement("div");
    slot.className = "item-slot";
    const meta = getItem(itemIds[i]);
    slot.title = meta ? `${meta.name} — ${meta.flavorText}` : itemIds[i];

    const canvas = document.createElement("canvas");
    canvas.width = ITEM_SLOT_SIZE;
    canvas.height = ITEM_SLOT_SIZE;
    canvas.className = "item-slot-canvas";
    const ctx = canvas.getContext("2d");
    drawItemSprite(ctx, ITEM_SLOT_SIZE / 2, ITEM_SLOT_SIZE / 2 + 2, ITEM_SLOT_SIZE - 8, itemIds[i]);

    slot.appendChild(canvas);
    itemBarEl.appendChild(slot);
  }

  const rows = Math.ceil(itemIds.length / ITEMS_PER_ROW);
  itemBarEl.style.gridTemplateRows = `repeat(${rows}, ${ITEM_SLOT_SIZE}px)`;
}

/** Vertical offset for item bar (below minimap). */
export function getItemBarTop() {
  const mapHeight = FLOOR_GRID_SIZE * MAP_CELL;
  return MAP_PADDING + mapHeight + 28;
}

function renderHeartSlot(slotEl, state, slotIndex) {
  slotEl.className = `heart-slot heart-${state}`;

  if (state === "half") {
    slotEl.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="half-${slotIndex}"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><path clip-path="url(#half-${slotIndex})" fill="currentColor" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s7.2-4.6 9.4-8.8c1.8-2.8 0-6.2-3.6-6.8-1.9-.3-3.7.5-4.8 2-1.1-1.5-2.9-2.3-4.8-2-3.6.6-5.4 4-3.6 7 2.2 4.2 9.4 8.8 9.4 8.8z"/></svg>`;
    return;
  }

  if (state === "soul_half") {
    slotEl.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="soul-half-${slotIndex}"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><path clip-path="url(#soul-half-${slotIndex})" fill="currentColor" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s7.2-4.6 9.4-8.8c1.8-2.8 0-6.2-3.6-6.8-1.9-.3-3.7.5-4.8 2-1.1-1.5-2.9-2.3-4.8-2-3.6.6-5.4 4-3.6 7 2.2 4.2 9.4 8.8 9.4 8.8z"/></svg>`;
    return;
  }

  const svgKey =
    state === "full"
      ? "full"
      : state === "soul_full"
        ? "soul"
        : state === "empty"
          ? "empty"
          : "unowned";
  slotEl.innerHTML = HEART_SVG[svgKey];
}

export function updateStatsHud(stats) {
  if (!stats || !heartsEl) return;

  const slots = heartsEl.querySelectorAll(".heart-slot");
  slots.forEach((slotEl, index) => {
    renderHeartSlot(slotEl, heartSlotState(stats, index), index);
  });

  if (pennyEl) pennyEl.textContent = String(stats.pennies);
  if (keyEl) keyEl.textContent = String(stats.keys);
  if (bombEl) bombEl.textContent = String(stats.bombs);
}

export function updateRoomHud({ roomName, roomId, gx, gy }) {
  const roomNameEl = document.getElementById("room-name");
  const roomIdEl = document.getElementById("room-id");
  if (roomNameEl) roomNameEl.textContent = `${roomName} (${gx}, ${gy})`;
  if (roomIdEl) roomIdEl.textContent = roomId;
}
