// KARANG BAY — all tuning numbers and colours live here, in one place.
// The world is a fixed 3200 by 2400 map. The camera shows a 1280 by 720 slice
// of it and scales that slice to the browser window, so no value below cares
// about the size of the screen it runs on.

export const FIELD = { width: 1280, height: 720 };
export const CITY = { width: 3200, height: 2400 };

/** One fixed simulation step, in seconds: 60 updates a second at any display rate. */
export const STEP = 1 / 60;

/** The city grid: road centrelines (vertical x, horizontal y) and road width. */
export const ROADS = {
  vertical: [400, 1000, 1600, 2200, 2800],
  horizontal: [400, 950, 1500, 2050],
  width: 92,
  sidewalk: 26,
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 265,
  health: 100,
  regenPerSecond: 2.5,
  punchRange: 46,
  punchDamage: 34,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 64,
  width: 32,
  accel: 420,
  brake: 620,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 170,
  steerRate: 2.6,
  drag: 0.55,
  handbrakeDrag: 2.6,
  enterRange: 78,
};

export const TRAFFIC = { count: 14, speed: 150, speedJitter: 55, spawnGap: 3.2 };
export const PARKED = { count: 9 };
export const PEDS = { count: 22, speed: 55, fleeSpeed: 130 };

export const POLICE = {
  maxCars: 4,
  maxOfficers: 2,
  carSpeed: 470,
  officerSpeed: 205,
  ramDamage: 4,
  bustRange: 30,
  spawnDistance: 700,
};

export const WANTED = { max: 5, decaySeconds: 20, decayDistance: 420 };

export const MISSIONS = [
  {
    name: 'First Delivery',
    brief: 'Pak Darma: pick up the package at PASAR, deliver it to PELABUHAN. Fast.',
    reward: 50_000,
    timeLimit: 100,
  },
  {
    name: 'Borrowed Wheels',
    brief: 'Pak Darma: the blue sedan near PERUMAHAN is "borrowed". Bring it to the garage in KAMPUNG.',
    reward: 75_000,
    timeLimit: 130,
  },
  {
    name: 'Heat Wave',
    brief: 'Pak Darma: the cops are hot. Survive wanted 3 for 45 seconds — or reach the hideout.',
    reward: 100_000,
    timeLimit: 90,
  },
  {
    name: 'Debt Collection',
    brief: 'Pak Darma: Budi owes me. Find him at the park, collect — then lose the cops.',
    reward: 125_000,
    timeLimit: 150,
  },
  {
    name: 'The Last Bridge',
    brief: 'Pak Darma: one last run. Wanted 4 — drive across JEMBATAN and out of Karang Bay.',
    reward: 250_000,
    timeLimit: 120,
  },
];

export const PALETTE = {
  backdrop: '#0d1420',
  water: '#14425e',
  waterDeep: '#0e3049',
  sand: '#c9a86a',
  grass: '#3f7a44',
  park: '#2f6b35',
  road: '#3a3f4a',
  roadLine: '#d8c25a',
  sidewalk: '#8a8f98',
  plaza: '#b09a6d',
  building: '#e8dcc3',
  building2: '#d9c39a',
  building3: '#c9b18a',
  roof: '#a4503c',
  roof2: '#7a6a4f',
  market: '#e07b39',
  player: '#ffd23f',
  playerJacket: '#2f7fe0',
  carColors: ['#e5534b', '#4fc3f7', '#f2c94c', '#7bc96f', '#b07fd6', '#e07b39', '#e8e8e8'],
  police: '#1d4ed8',
  policeLight: '#ff3b30',
  policeLight2: '#3b82f6',
  ped: '#e8e8e8',
  text: '#f2f0e6',
  muted: '#b9c0c9',
  star: '#ffd23f',
  danger: '#ff5a4e',
  panel: '#1c2433',
  panelEdge: '#3a4a63',
  minimapBg: '#101820',
  marker: '#ffd23f',
  markerPolice: '#5aa2ff',
  health: '#58d68d',
  cash: '#ffd23f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** localStorage keys for the best cash and the saved run (this browser only). */
export const BEST_KEY = 'karang-bay.best';
export const SAVE_KEY = 'karang-bay.save';

/** Rupiah the way the HUD prints it: Rp 125.000. */
export function formatRp(value) {
  const whole = Math.floor(value).toString();
  return 'Rp ' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
