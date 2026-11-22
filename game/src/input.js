// Keyboard and mouse input.
// Tracks held keys and edge-triggered presses (cleared once per frame by the
// main loop). Also tracks clicks, so menus can be used with the mouse.

// Keys the game understands, by KeyboardEvent.code.
const GAME_KEYS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyE', 'Space', 'ShiftLeft', 'ShiftRight',
  'KeyM', 'KeyP', 'KeyR', 'Escape', 'Enter',
];

const Input = {
  // Codes currently held down.
  held: new Set(),
  // Codes pressed since the last clear (edge-triggered).
  pressed: new Set(),
  // Last mouse click position in canvas pixels (null until clicked).
  click: null,
  // Whether any game key was pressed (used to unlock audio on first input).
  anyKey: false,

  init(canvas) {
    window.addEventListener('keydown', (ev) => {
      if (GAME_KEYS.includes(ev.code)) ev.preventDefault();
      if (!ev.repeat) this.pressed.add(ev.code);
      this.held.add(ev.code);
      this.anyKey = true;
    });
    window.addEventListener('keyup', (ev) => {
      this.held.delete(ev.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });
    canvas.addEventListener('mousedown', (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * CFG.VIEW_W;
      const y = ((ev.clientY - rect.top) / rect.height) * CFG.VIEW_H;
      this.click = { x, y };
      this.anyKey = true;
    });
    // Touch: treat a tap as a click too.
    canvas.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((t.clientX - rect.left) / rect.width) * CFG.VIEW_W;
      const y = ((t.clientY - rect.top) / rect.height) * CFG.VIEW_H;
      this.click = { x, y };
      this.anyKey = true;
      ev.preventDefault();
    }, { passive: false });
  },

  // Is a code held right now?
  isDown(code) {
    return this.held.has(code);
  },

  // Was a code pressed since the last clear?
  wasPressed(code) {
    return this.pressed.has(code);
  },

  // Movement vector from WASD / arrows: {x, y} each in -1..1, or null.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.sqrt(x * x + y * y);
    return { x: x / len, y: y / len };
  },

  // True while the run key (Shift) is held.
  isRunning() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  },

  // True while the action key (E) is held or was just pressed.
  actionDown() {
    return this.isDown('KeyE') || this.wasPressed('KeyE');
  },

  // Clear edge-triggered state; called once per frame by the main loop.
  endFrame() {
    this.pressed.clear();
    this.click = null;
  },
};
