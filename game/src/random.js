// Seeded random numbers (mulberry32) plus small helpers.
// The city, traffic and pedestrians all come from one seed, so a given
// ?seed= always builds the same Karang Bay.

// mulberry32: a tiny deterministic PRNG. seed is any 32-bit integer.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small RNG object built on mulberry32.
function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    // Float in [0, 1).
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // True with probability p (0..1).
    chance(p) {
      return next() < p;
    },
    // One element of an array, uniformly.
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // A shuffled copy of an array (Fisher-Yates).
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}

// Clamp a number into [min, max].
function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Linear interpolation between a and b.
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Distance between two points.
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle from (x1, y1) to (x2, y2).
function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Wrap an angle into [-PI, PI].
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Format an amount of rupiah as "Rp 125.000".
function formatRp(n) {
  const s = String(Math.round(n));
  let out = '';
  let rest = s;
  while (rest.length > 3) {
    out = '.' + rest.slice(-3) + out;
    rest = rest.slice(0, -3);
  }
  return 'Rp ' + rest + out;
}

// Format seconds as "1:25".
function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}
