const KEY_MAP = {
  w: "w",
  a: "a",
  s: "s",
  d: "d",
  arrowup: "arrowup",
  arrowdown: "arrowdown",
  arrowleft: "arrowleft",
  arrowright: "arrowright",
};

export function createInputState() {
  return {
    keys: new Set(),
  };
}

export function bindInput(input) {
  window.addEventListener("keydown", (e) => {
    const key = KEY_MAP[e.key.toLowerCase()];
    if (!key) return;
    e.preventDefault();
    input.keys.add(key);
  });

  window.addEventListener("keyup", (e) => {
    const key = KEY_MAP[e.key.toLowerCase()];
    if (!key) return;
    input.keys.delete(key);
  });
}

export function getBodyVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.has("w")) y -= 1;
  if (keys.has("s")) y += 1;
  if (keys.has("a")) x -= 1;
  if (keys.has("d")) x += 1;

  if (x === 0 && y === 0) return null;

  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

export function getHeadVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.has("arrowup")) y -= 1;
  if (keys.has("arrowdown")) y += 1;
  if (keys.has("arrowleft")) x -= 1;
  if (keys.has("arrowright")) x += 1;

  if (x === 0 && y === 0) return null;

  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}
