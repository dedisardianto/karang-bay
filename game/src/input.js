// Keyboard and pointer input for Karang Bay. Keys held down give an 8-way
// steering direction; single presses (enter a car, punch, pause, mute, restart)
// are queued as bit flags and collected once by the loop, so a press that lands
// between two frames is never lost and never counted twice.

export const ACTION_ENTER = 1; // E — enter or exit a car, pick up, interact
export const ACTION_PUNCH = 2; // Space on foot — punch; in a car — handbrake (held)
export const ACTION_PAUSE = 4; // P / Escape
export const ACTION_MUTE = 8; // M
export const ACTION_RESTART = 16; // R

const KEY_UP = new Set(['ArrowUp', 'KeyW']);
const KEY_DOWN = new Set(['ArrowDown', 'KeyS']);
const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);
const KEY_ENTER = new Set(['KeyE']);
const KEY_PUNCH = new Set(['Space']);
const KEY_PAUSE = new Set(['KeyP', 'Escape']);
const KEY_MUTE = new Set(['KeyM']);
const KEY_RESTART = new Set(['KeyR']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let run = false;
  let handbrake = false;
  let queued = 0;

  function queueOnce(code, flag, event) {
    if (!event.repeat) queued |= flag;
  }

  function onKeyDown(code, event) {
    if (KEY_UP.has(code)) up = true;
    else if (KEY_DOWN.has(code)) down = true;
    else if (KEY_LEFT.has(code)) left = true;
    else if (KEY_RIGHT.has(code)) right = true;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') run = true;
    else if (KEY_ENTER.has(code)) queueOnce(code, ACTION_ENTER, event);
    else if (KEY_PUNCH.has(code)) {
      handbrake = true;
      queueOnce(code, ACTION_PUNCH, event);
    } else if (KEY_PAUSE.has(code)) queueOnce(code, ACTION_PAUSE, event);
    else if (KEY_MUTE.has(code)) queueOnce(code, ACTION_MUTE, event);
    else if (KEY_RESTART.has(code)) queueOnce(code, ACTION_RESTART, event);
    else return;
    event.preventDefault();
  }

  function onKeyUp(code) {
    if (KEY_UP.has(code)) up = false;
    else if (KEY_DOWN.has(code)) down = false;
    else if (KEY_LEFT.has(code)) left = false;
    else if (KEY_RIGHT.has(code)) right = false;
    else if (code === 'ShiftLeft' || code === 'ShiftRight') run = false;
    else if (KEY_PUNCH.has(code)) handbrake = false;
  }

  function releaseAll() {
    up = false;
    down = false;
    left = false;
    right = false;
    run = false;
    handbrake = false;
  }

  window.addEventListener('keydown', (event) => onKeyDown(event.code, event));
  window.addEventListener('keyup', (event) => onKeyUp(event.code));
  // A key let go while the tab is hidden never sends keyup: drop everything on blur.
  window.addEventListener('blur', releaseAll);
  target.addEventListener('pointerdown', () => {
    queued |= ACTION_ENTER;
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
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
