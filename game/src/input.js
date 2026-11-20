// Keyboard and pointer input for Karang Bay. Held keys give an 8-way steering
// direction; one-shot presses (enter car, punch, pause, mute, restart) are queued
// as bit flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice.

export const ACTION_ENTER = 1; // E — enter / exit a car, pick up, interact
export const ACTION_PUNCH = 2; // Space on foot — punch; in a car — handbrake (held)
export const ACTION_PAUSE = 4; // P / Escape
export const ACTION_MUTE = 8; // M
export const ACTION_RESTART = 16; // R

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let run = false;
  let handbrake = false;
  let actions = 0;

  function press(code, event) {
    if (UP.has(code)) up = true;
    else if (DOWN.has(code)) down = true;
    else if (LEFT.has(code)) left = true;
    else if (RIGHT.has(code)) right = true;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') run = true;
    else if (ENTER.has(code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (PUNCH.has(code)) {
      handbrake = true;
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (PAUSE.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else return;
    event.preventDefault();
  }

  function release(code) {
    if (UP.has(code)) up = false;
    else if (DOWN.has(code)) down = false;
    else if (LEFT.has(code)) left = false;
    else if (RIGHT.has(code)) right = false;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') run = false;
    else if (PUNCH.has(code)) handbrake = false;
  }

  window.addEventListener('keydown', (event) => press(event.code, event));
  window.addEventListener('keyup', (event) => release(event.code));
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    run = false;
    handbrake = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_ENTER;
  });

  return {
    /** Steering as {x, y} in -1..1, normalised so diagonals are not faster. */
    steer() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** -1 for left, 1 for right, 0 for neither or both (driving steer). */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** 1 while W/Up is held (driving throttle), -1 while S/Down is held. */
    throttle() {
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    running() {
      return run;
    },
    handbrakeHeld() {
      return handbrake;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
