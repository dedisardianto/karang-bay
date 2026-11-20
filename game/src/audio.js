// Sound for Karang Bay, made only from WebAudio oscillators — no audio files.
// Engine hum follows the car's speed, the police siren is a two-tone wail, and
// pickups, crashes, punches and mission jingles are short envelopes.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, duration, type, volume, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function startSiren() {
    if (!ensure() || sirenOsc) return;
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 660;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
  }

  function stopSiren() {
    if (!sirenOsc) return;
    try {
      sirenGain.gain.value = 0;
      sirenOsc.stop();
    } catch {
      // Already stopped.
    }
    sirenOsc = null;
    sirenGain = null;
  }

  return {
    unlock,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (muted && engineGain) engineGain.gain.value = 0;
      if (muted) stopSiren();
    },
    isMuted() {
      return muted;
    },
    /** Called every frame while driving: speed 0..1 sets the hum. */
    engine(speed, driving) {
      if (!ensure() || muted) return;
      if (!driving) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      startEngine();
      engineOsc.frequency.value = 55 + speed * 130;
      engineGain.gain.value = 0.05 + speed * 0.06;
    },
    /** Called every frame: wails while the player is wanted, silent otherwise. */
    siren(wanted, dt) {
      if (!ensure() || muted) {
        if (muted) stopSiren();
        return;
      }
      if (wanted <= 0) {
        stopSiren();
        return;
      }
      startSiren();
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 0.42;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.value = sirenHigh ? 880 : 660;
      }
      sirenGain.gain.value = 0.045;
    },
    pickup() {
      blip(660, 0.16, 'sine', 0.22, 990);
    },
    coin() {
      blip(880, 0.1, 'sine', 0.16, 1320);
    },
    punch() {
      blip(160, 0.12, 'square', 0.2, 70);
    },
    crash() {
      blip(90, 0.22, 'sawtooth', 0.28, 45);
    },
    steal() {
      blip(440, 0.12, 'square', 0.18, 330);
      setTimeout(() => blip(330, 0.14, 'square', 0.18, 220), 90);
    },
    busted() {
      blip(392, 0.3, 'sawtooth', 0.22, 196);
      setTimeout(() => blip(196, 0.5, 'sawtooth', 0.22, 98), 240);
    },
    jingle() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, index) => {
        setTimeout(() => blip(freq, 0.22, 'sine', 0.2), index * 110);
      });
    },
    victory() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, index) => {
        setTimeout(() => blip(freq, 0.3, 'triangle', 0.22), index * 130);
      });
    },
  };
}
