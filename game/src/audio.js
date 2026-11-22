// KARANG BAY — sound, WebAudio oscillators only.
// No audio files: an engine hum, a two-tone siren, pickup blips, crash
// thuds, punches and a mission jingle, all synthesized. M mutes.

const AudioSys = {
  ctx: null,
  master: null,
  engineOsc: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenHigh: false,
  sirenTimer: 0,
  muted: false,
  unlocked: false,

  // Create the context on the first user gesture (browsers require it).
  unlock() {
    if (this.unlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      // Engine hum: a low sawtooth whose pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: a square wave toggling between two tones.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.unlocked = true;
    } catch (err) {
      this.ctx = null;
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.value = this.muted ? 0 : 0.5;
    }
    return this.muted;
  },

  // Called every frame: engine pitch from speed, siren while wanted.
  update(dt, speed, driving, wanted) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const target = driving ? 0.05 + Math.min(0.1, Math.abs(speed) / 520 * 0.09) : 0;
    this.engineGain.gain.value += (target - this.engineGain.gain.value) * 0.2;
    this.engineOsc.frequency.value = 52 + Math.abs(speed) * 0.16;
    if (wanted > 0) {
      this.sirenGain.gain.value = 0.045;
      this.sirenTimer += dt;
      if (this.sirenTimer > 0.42) {
        this.sirenTimer = 0;
        this.sirenHigh = !this.sirenHigh;
        this.sirenOsc.frequency.value = this.sirenHigh ? 950 : 720;
      }
    } else {
      this.sirenGain.gain.value = 0;
    }
  },

  // One short beep: frequency, seconds, wave type, volume.
  beep(freq, dur, type, vol, when) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + (when || 0);
      const osc = this.ctx.createOscillator();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.16, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (err) {
      // Sound is decorative; never let it break the game.
    }
  },

  // A low thud: a sine that falls fast in pitch.
  thud() {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t0);
      osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.18);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.4, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    } catch (err) {
      // Ignore audio errors.
    }
  },

  blip() {
    this.beep(880, 0.09, 'square', 0.14);
    this.beep(1320, 0.12, 'square', 0.1, 0.08);
  },

  punch() {
    this.beep(190, 0.08, 'sawtooth', 0.2);
  },

  jingle() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.beep(n, 0.16, 'triangle', 0.18, i * 0.11));
  },

  busted() {
    const notes = [392, 311, 233];
    notes.forEach((n, i) => this.beep(n, 0.22, 'sawtooth', 0.16, i * 0.16));
  },
};
