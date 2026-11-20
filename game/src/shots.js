// The screenshot scenes behind ?shot=start|play|chase|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (walk to the nearest car, get in, drive at the mission marker), so the
// frame is what real play looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { ACTION_ENTER } from './input.js';
import { EVENT_MISSION, EVENT_VICTORY } from './world.js';
import { SCREEN_MISSION, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 26;
const CHASE_SECONDS = 8;

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** An input the autopilot drives: walk to the nearest car, enter it, drive at the marker. */
function makeAutopilot(world) {
  let queued = 0;
  const input = {
    steer() {
      const state = world.state;
      const player = state.player;
      if (player.inCar) return { x: 0, y: 0 };
      let best = null;
      let bestD = Infinity;
      for (const car of state.cars) {
        if (!car.active || car.kind === 'traffic') continue;
        const d = Math.hypot(car.x - player.x, car.y - player.y);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      if (!best) return { x: 0, y: 0 };
      const dx = best.x - player.x;
      const dy = best.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      if (bestD < 60) queued |= ACTION_ENTER;
      return { x: dx / len, y: dy / len };
    },
    direction() {
      const state = world.state;
      const car = state.player.inCar;
      if (!car) return 0;
      const t = state.missionTarget;
      const want = Math.atan2(t.y - car.y, t.x - car.x);
      const diff = wrapAngle(want - car.angle);
      return diff > 0.12 ? 1 : diff < -0.12 ? -1 : 0;
    },
    throttle() {
      const state = world.state;
      const car = state.player.inCar;
      if (!car) return 0;
      const t = state.missionTarget;
      const want = Math.atan2(t.y - car.y, t.x - car.x);
      return Math.abs(wrapAngle(want - car.angle)) > 1.4 ? 0 : 1;
    },
    running() {
      return true;
    },
    handbrakeHeld() {
      return false;
    },
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
  return input;
}

function driveFor(world, input, seconds, onStep) {
  let events = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    events |= world.step(STEP, input, false);
    if (onStep) onStep(events);
    if (events & EVENT_VICTORY) break;
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, chase or end; any other name is
 * start) and return the screen to draw over it, the best cash to show and any
 * panel data.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'chase' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, null, true);
    return { screen: SCREEN_TITLE, best: 250000, panelData: null };
  }

  const input = makeAutopilot(world);
  if (name === 'play') {
    driveFor(world, input, DRIVE_SECONDS);
    world.state.wanted = 2;
    driveFor(world, input, CHASE_SECONDS);
    return { screen: SCREEN_PLAY, best: 125000, panelData: null };
  }

  if (name === 'chase') {
    driveFor(world, input, 14);
    world.state.wanted = 4;
    driveFor(world, input, CHASE_SECONDS);
    return { screen: SCREEN_PLAY, best: 300000, panelData: null };
  }

  // end: play mission 5 for real — drive the bridge road north to the Jembatan.
  world.state.missionIndex = 4;
  world.setupMission();
  world.state.cash = 425000;
  let events = driveFor(world, input, 45);
  if (!(events & EVENT_VICTORY)) {
    // Autopilot did not make it: put the car on the bridge approach and finish
    // the run through the real rules.
    const car = world.state.player.inCar;
    if (car) {
      car.x = 1600;
      car.y = 260;
      car.angle = -Math.PI / 2;
      car.speed = 200;
    }
    events = driveFor(world, input, 10);
  }
  if (events & EVENT_VICTORY) {
    return { screen: SCREEN_VICTORY, best: 675000, panelData: null };
  }
  return { screen: SCREEN_MISSION, best: 675000, panelData: { missionIndex: 4 } };
}
