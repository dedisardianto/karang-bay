// KARANG BAY — boot, main loop, screens and saves.
// Fixed-step updates (60 Hz), canvas rendering every animation frame,
// localStorage saves, and the ?shot= / ?seed= staging hooks.

const Main = {
  SAVE_KEY: 'karangbay-save-v1',
  canvas: null,
  ctx: null,
  screen: 'title',
  seed: 1,
  shot: null,
  save: null,
  prevMissionIndex: 0,
  prevHealth: CFG.MAX_HEALTH,
  lastTime: 0,
  accumulator: 0,

  boot() {
    const params = new URLSearchParams(window.location.search);
    this.seed = parseInt(params.get('seed') || '1', 10) || 1;
    this.shot = params.get('shot');
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    Input.init(this.canvas);
    this.save = this.loadSave();
    City.build(this.seed);
    World.reset(this.seed, {
      cash: 0,
      missionIndex: 0,
      bestCash: this.save ? this.save.best : 0,
    });
    this.prevMissionIndex = 0;
    this.prevHealth = CFG.MAX_HEALTH;
    if (this.shot) {
      this.screen = Shots.apply(this.shot);
      if (this.screen === 'play') {
        this.prevMissionIndex = World.missionIndex;
      }
    } else {
      this.screen = 'title';
    }
    // Debug/testing hook: the live world, for automated playtests.
    window.KB = {
      world: World,
      city: City,
      config: CFG,
      screen: () => this.screen,
      version: 'karang-bay-fix-1',
    };
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  },

  // ---- saves --------------------------------------------------------------

  loadSave() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.best !== 'number') return null;
      return data;
    } catch (err) {
      return null;
    }
  },

  saveExists() {
    return !!this.save;
  },

  writeSave() {
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify({
        best: World.bestCash,
        cash: World.cash,
        missionIndex: Math.min(World.missionIndex, CFG.MISSIONS.length - 1),
      }));
      this.save = this.loadSave();
    } catch (err) {
      // Storage may be unavailable; the game plays on regardless.
    }
  },

  clearSave() {
    try {
      localStorage.removeItem(this.SAVE_KEY);
    } catch (err) {
      // Ignore.
    }
    this.save = null;
  },

  // ---- flow ---------------------------------------------------------------

  startGame(fresh) {
    if (fresh || !this.save) {
      World.reset(this.seed, { cash: 0, missionIndex: 0, bestCash: World.bestCash });
    } else {
      World.reset(this.seed, {
        cash: this.save.cash || 0,
        missionIndex: this.save.missionIndex || 0,
        bestCash: this.save.best || 0,
      });
    }
    this.prevMissionIndex = World.missionIndex;
    this.prevHealth = CFG.MAX_HEALTH;
    this.screen = 'play';
    AudioSys.unlock();
  },

  frame(now) {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.handleKeys();
    if (this.screen === 'play') {
      this.accumulator += dt;
      const step = 1 / 60;
      let guard = 0;
      while (this.accumulator >= step && guard < 5) {
        World.update(step);
        this.accumulator -= step;
        guard++;
      }
      this.afterUpdate();
    }
    AudioSys.update(dt, World.player.speed, !World.player.onFoot, World.wanted);
    Render.draw(this.ctx, this.screen);
    Input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  },

  afterUpdate() {
    const p = World.player;
    // Crash / hit feedback.
    if (p.health < this.prevHealth) AudioSys.thud();
    this.prevHealth = p.health;
    // Mission progress: jingle + save on completion.
    if (World.missionIndex > this.prevMissionIndex) {
      AudioSys.jingle();
      this.prevMissionIndex = World.missionIndex;
      this.writeSave();
    }
    // Busted / wasted screens.
    if (World.screenEvent === 'busted') {
      World.screenEvent = null;
      AudioSys.busted();
      this.writeSave();
      this.screen = 'busted';
    } else if (World.screenEvent === 'wasted') {
      World.screenEvent = null;
      AudioSys.busted();
      this.writeSave();
      this.screen = 'wasted';
    }
    // Victory.
    if (World.victory && this.screen === 'play') {
      AudioSys.jingle();
      this.writeSave();
      this.screen = 'victory';
    }
  },

  handleKeys() {
    // First gesture unlocks audio.
    if (Input.anyKey) AudioSys.unlock();
    if (Input.wasPressed('KeyM')) {
      const muted = AudioSys.toggleMute();
      if (this.screen === 'play') World.showMessage(muted ? 'Sound off (M to turn on)' : 'Sound on', 1.5);
    }
    if (this.screen === 'title') {
      if (Input.wasPressed('Enter') || Input.click) {
        this.startGame(false);
      } else if (Input.wasPressed('KeyC')) {
        this.clearSave();
        this.startGame(true);
      }
      return;
    }
    if (this.screen === 'play') {
      if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) {
        this.screen = 'pause';
      } else if (Input.wasPressed('KeyR')) {
        World.failMission('Mission restarted.');
      }
      return;
    }
    if (this.screen === 'pause') {
      if (Input.wasPressed('KeyP') || Input.wasPressed('Escape') || Input.wasPressed('Enter')) {
        this.screen = 'play';
      }
      return;
    }
    if (this.screen === 'busted' || this.screen === 'wasted') {
      if (Input.wasPressed('Enter') || Input.click) {
        this.screen = 'play';
      }
      return;
    }
    if (this.screen === 'victory') {
      if (Input.wasPressed('Enter') || Input.click) {
        this.clearSave();
        this.startGame(true);
      }
    }
  },
};

window.addEventListener('DOMContentLoaded', () => Main.boot());
