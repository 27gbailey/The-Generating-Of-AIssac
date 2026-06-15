import { decodeRoomId } from "./roomId.js";
import { STARTER_ROOM_ID, getRoomCatalogEntry } from "./rooms.js";
import { drawRoom } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const roomNameEl = document.getElementById("room-name");
const roomIdEl = document.getElementById("room-id");

let currentRoom = decodeRoomId(STARTER_ROOM_ID);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updateHud() {
  const entry = getRoomCatalogEntry(currentRoom.roomId);
  roomNameEl.textContent = entry?.name ?? "Unknown Room";
  roomIdEl.textContent = currentRoom.roomId;
}

function draw() {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRoom(ctx, currentRoom, canvas.width / 2, canvas.height / 2);
}

window.addEventListener("resize", () => {
  resize();
  draw();
});

resize();
updateHud();
draw();
