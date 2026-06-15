import { MAX_HEART_CONTAINERS } from "./constants.js";
import { heartSlotState } from "./stats.js";

const HEART_SVG = {
  full: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
  unowned: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/></svg>`,
};

let heartsEl = null;
let pennyEl = null;
let keyEl = null;
let bombEl = null;

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

function renderHeartSlot(slotEl, state, slotIndex) {
  slotEl.className = `heart-slot heart-${state}`;

  if (state === "half") {
    slotEl.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="half-${slotIndex}"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><path clip-path="url(#half-${slotIndex})" fill="currentColor" d="M12 21s-7.2-4.6-9.4-8.8C.8 9.2 2.6 5.8 6.2 5.2c1.9-.3 3.7.5 4.8 2 1.1-1.5 2.9-2.3 4.8-2 3.6.6 5.4 4 3.6 7-2.2 4.2-9.4 8.8-9.4 8.8z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s7.2-4.6 9.4-8.8c1.8-2.8 0-6.2-3.6-6.8-1.9-.3-3.7.5-4.8 2-1.1-1.5-2.9-2.3-4.8-2-3.6.6-5.4 4-3.6 7 2.2 4.2 9.4 8.8 9.4 8.8z"/></svg>`;
    return;
  }

  const svgKey = state === "full" ? "full" : state === "empty" ? "empty" : "unowned";
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
