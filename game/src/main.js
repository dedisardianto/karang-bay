// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between seven screens: title,
// play, paused, busted, wasted, mission complete and victory. Progress (cash +
// mission) is saved to localStorage so a run can continue; the best cash is
// kept separately.
//
// ?seed=N fixes the city and traffic. ?shot=start|play|chase|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import {
  createWorld, EVENT_BUSTED, EVENT_CRASH, EVENT_HIT_PED, EVENT_MISSION, EVENT_PICKUP,
  EVENT_PUNCH, EVENT_STEAL, EVENT_VICTORY, EVENT_WASTED,
} from './world.js';
import {
  ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_RESTART, createInput,
} from './input.js';
import {
  createRenderer, SCREEN_BUSTED, SCREEN_MISSION, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_TITLE, SCREEN_VICTORY, SCREEN_WASTED,
} from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const city = createCity(createRandom(seed));
const world = createWorld(city, createRandom(seed + 101));
const renderer = createRenderer(canvas, city);
const audio = createAudio();

function loadBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function storeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best cash then lasts this visit only.
  }
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (!Number.isInteger(save.missionIndex) || !Number.isFinite(save.cash)) return null;
    return save;
  } catch {
    return null;
  }
}

function storeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: world.state.cash,
      missionIndex: world.state.missionIndex,
    }));
  } catch {
    // Storage can be off: the run then lasts this visit only.
  }
}

function dropSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function playShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.panelData, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function playGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = loadBest();
  let save = loadSave();
  let accumulator = 0;
  let last = performance.now();
  let time = 0;
  let victoryShown = false;

  // Debug hook for playtesting: a live read-only view of the run.
  window.__karang = {
    state: world.state,
    get screen() { return screen; },
    get best() { return best; },
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function beginFresh() {
    world.reset();
    world.state.cash = 0;
    world.state.missionIndex = 0;
    world.setupMission();
    dropSave();
    victoryShown = false;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Mission 1: First Delivery.');
  }

  function beginContinued() {
    world.reset();
    world.state.cash = save.cash;
    world.state.missionIndex = Math.min(save.missionIndex, 4);
    world.setupMission();
    victoryShown = false;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Continuing. Mission ${world.state.missionIndex + 1}.`);
  }

  function showBusted() {
    world.applyBusted();
    audio.busted();
    screen = SCREEN_BUSTED;
    storeSave();
    announce('Busted. The police caught Rian.');
  }

  function showWasted() {
    world.applyWasted();
    audio.busted();
    screen = SCREEN_WASTED;
    storeSave();
    announce('Wasted. Rian went down.');
  }

  function showMissionComplete() {
    audio.jingle();
    screen = SCREEN_MISSION;
    storeSave();
    announce(`Mission complete. Cash ${world.state.cash}.`);
  }

  function showVictory() {
    audio.victory();
    screen = SCREEN_VICTORY;
    victoryShown = true;
    if (world.state.cash > best) {
      best = world.state.cash;
      storeBest(best);
    }
    dropSave();
    announce('Victory. Rian crossed the bridge out of Karang Bay.');
  }

  function consumeActions(actions) {
    // Returns the actions this screen did not consume, for the world to use.
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Sound off.' : 'Sound on.');
      actions &= ~ACTION_MUTE;
    }
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_PUNCH | ACTION_ENTER)) {
        audio.unlock();
        if (save) beginContinued();
        else beginFresh();
      } else if (actions & ACTION_RESTART) {
        audio.unlock();
        save = null;
        beginFresh();
      }
      return 0;
    }
    if (screen === SCREEN_MISSION) {
      if (actions & (ACTION_PUNCH | ACTION_ENTER)) {
        audio.unlock();
        const won = world.advanceMission();
        if (won) showVictory();
        else {
          screen = SCREEN_PLAY;
          announce(`Mission ${world.state.missionIndex + 1}.`);
        }
      }
      return 0;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED || screen === SCREEN_VICTORY) {
      if (actions & (ACTION_PUNCH | ACTION_ENTER)) {
        audio.unlock();
        save = loadSave();
        if (screen === SCREEN_VICTORY) {
          save = null;
          beginFresh();
        } else if (save) beginContinued();
        else beginFresh();
      }
      return 0;
    }
    if (actions & ACTION_RESTART && screen === SCREEN_PLAY) {
      world.setupMission();
      announce('Mission restarted.');
      actions &= ~ACTION_RESTART;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      actions &= ~ACTION_PAUSE;
    } else if (actions & (ACTION_PAUSE | ACTION_PUNCH) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      actions &= ~(ACTION_PAUSE | ACTION_PUNCH);
    }
    return actions;
  }

  function reactToEvents(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_STEAL) audio.steal();
    if (events & EVENT_PUNCH) audio.punch();
    if (events & (EVENT_CRASH | EVENT_HIT_PED)) audio.crash();
    if (events & EVENT_BUSTED) showBusted();
    else if (events & EVENT_WASTED) showWasted();
    else if (events & EVENT_VICTORY) showMissionComplete();
    else if (events & EVENT_MISSION) showMissionComplete();
  }

  function advance(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, 0, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, input, actions, false);
    time += STEP;
    audio.engine(world.state.player.inCar ? Math.abs(world.state.player.inCar.speed) / 520 : 0, !!world.state.player.inCar);
    audio.siren(world.state.wanted, STEP);
    reactToEvents(events);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const leftover = consumeActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        advance(first ? leftover : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, { save, missionIndex: world.state.missionIndex }, time);
  }

  // Leaving the tab pauses a running game rather than letting the city move unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Karang Bay. Press Space or click to start.');
  requestAnimationFrame(tick);
}

if (shot) playShot(shot);
else playGame();
