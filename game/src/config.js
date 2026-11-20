// KARANG BAY — every tuning number and colour in one place.
// The city is a fixed 3200x2400 world; the camera shows a 1280x720 window of it
// and scales to the browser window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };
export const CITY = { width: 3200, height: 2400 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Road centrelines of the city grid (vertical x, horizontal y) and road width. */
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
    reward: 50000,
    timeLimit: 100,
  },
  {
    name: 'Borrowed Wheels',
    brief: 'Pak Darma: the blue sedan near PERUMAHAN is "borrowed". Bring it to the garage in KAMPUNG.',
    reward: 75000,
    timeLimit: 130,
  },
  {
    name: 'Heat Wave',
    brief: 'Pak Darma: the cops are hot. Survive wanted 3 for 45 seconds — or reach the hideout.',
    reward: 100000,
    timeLimit: 90,
  },
  {
    name: 'Debt Collection',
    brief: 'Pak Darma: Budi owes me. Find him at the park, collect — then lose the cops.',
    reward: 125000,
    timeLimit: 150,
  },
  {
    name: 'The Last Bridge',
    brief: 'Pak Darma: one last run. Wanted 4 — drive across JEMBATAN and out of Karang Bay.',
    reward: 250000,
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

/** Where the best cash and the saved run are kept between visits (this browser only). */
export const BEST_KEY = 'karang-bay.best';
export const SAVE_KEY = 'karang-bay.save';

/** Format rupiah the way the HUD shows it: Rp 125.000. */
export function formatRp(value) {
  return 'Rp ' + Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
