// KARANG BAY — configuration, palette, districts and mission data.
// Original top-down 2D open-world crime game. All art, story and sound are
// original; nothing here comes from Rockstar Games or any other game.

const CFG = {
  // World size in pixels.
  WORLD_W: 3200,
  WORLD_H: 2400,

  // Canvas (logical) size.
  VIEW_W: 1280,
  VIEW_H: 720,

  // Roads: centre lines of the grid. Road half-width is 36 px.
  ROAD_HALF: 36,
  V_ROADS: [400, 1000, 1600, 2200, 2800],
  H_ROADS: [350, 900, 1450, 1950],

  // Water strips: north river and south harbour.
  RIVER_Y: 140,
  HARBOUR_Y: 2120,

  // Bridge road across the north river (the exit for the final mission).
  BRIDGE_X0: 1520,
  BRIDGE_X1: 1680,

  // Player on foot.
  WALK_SPEED: 185,
  RUN_SPEED: 295,
  PLAYER_R: 13,
  PUNCH_RANGE: 42,
  PUNCH_ARC: 1.1,

  // Driving.
  CAR_ACCEL: 420,
  CAR_BRAKE: 620,
  CAR_MAX_SPEED: 520,
  CAR_MAX_REVERSE: 170,
  CAR_TURN: 2.5,
  CAR_R: 17,

  // Traffic and pedestrians.
  TRAFFIC_COUNT: 16,
  TRAFFIC_SPEED_MIN: 62,
  TRAFFIC_SPEED_MAX: 96,
  PED_COUNT: 26,
  PED_SPEED_MIN: 34,
  PED_SPEED_MAX: 62,

  // Police.
  POLICE_CAR_SPEED: 430,
  POLICE_FOOT_SPEED: 235,
  BUST_DIST: 26,

  // Health, wanted, money.
  MAX_HEALTH: 100,
  HEALTH_REGEN: 6,
  WANTED_DECAY_SEC: 20,
  WANTED_MAX: 5,
  BUSTED_LOSS: 0.2,

  // Mission payouts in rupiah.
  PAYOUTS: [50000, 75000, 100000, 125000, 250000],

  // Mission 1 delivery timer (seconds) and mission 3 survival timer.
  DELIVERY_TIME: 100,
  SURVIVE_TIME: 45,

  // Colours: dusk harbour palette.
  COLORS: {
    water: '#0d4556',
    waterDeep: '#0a3644',
    sand: '#c9b489',
    road: '#2c2c34',
    roadLine: '#e8d44d',
    sidewalk: '#46464f',
    grass: '#3f7a44',
    park: '#4c8a4d',
    market: '#8a6b3f',
    plaza: '#7a5f38',
    building: ['#e8dcc0', '#d9c39a', '#cbb489', '#e3cfae', '#d6bd8f'],
    buildingRoof: ['#a4553f', '#7a5a8a', '#4f7a5a', '#b07a3a', '#5a7a9a'],
    bridge: '#6a6a72',
    pier: '#7a5a38',
    player: '#f2c14e',
    playerCar: '#e84a3f',
    police: '#2f6fd0',
    policeLight: '#ff3b30',
    marker: '#ffd23f',
    hudBg: 'rgba(10, 14, 20, 0.72)',
    hudText: '#f5f0dc',
    star: '#ffd23f',
    starEmpty: '#5a5a62',
  },

  // Districts with their map rectangles and label positions.
  DISTRICTS: [
    { name: 'KAMPUNG', x: 60, y: 380, w: 900, h: 1020, labelX: 480, labelY: 620 },
    { name: 'PASAR', x: 1036, y: 936, w: 528, h: 478, labelX: 1300, labelY: 1180 },
    { name: 'PERUMAHAN', x: 2236, y: 386, w: 892, h: 1528, labelX: 2680, labelY: 1100 },
    { name: 'PELABUHAN', x: 60, y: 1986, w: 3080, h: 134, labelX: 1600, labelY: 2055 },
    { name: 'JEMBATAN', x: 1400, y: 150, w: 400, h: 200, labelX: 1600, labelY: 260 },
  ],

  // Fixed points of interest on the map.
  POINTS: {
    garage: { x: 700, y: 760, label: 'Garage — Kampung' },
    pasarPickup: { x: 1300, y: 1180, label: 'Pasar pickup' },
    pelabuhanDrop: { x: 1600, y: 2030, label: 'Pelabuhan drop-off' },
    hideout: { x: 2650, y: 1700, label: 'Hideout — Perumahan' },
    parkDebtor: { x: 2500, y: 1180, label: 'Debtor — Taman Park' },
    bridgeExit: { x: 1600, y: 70, label: 'Jembatan — leave the city' },
    playerStart: { x: 700, y: 700, label: 'Rian starts here' },
  },

  // Where the marked sedan of mission 2 waits (inside the market square).
  SEDAN_SPOT: { x: 1150, y: 1350 },

  // Parked cars the player can steal (on road edges, clear of buildings).
  PARKED_SPOTS: [
    { x: 436, y: 500 }, { x: 1036, y: 700 }, { x: 2200, y: 1200 },
    { x: 1564, y: 1600 }, { x: 2800, y: 500 }, { x: 700, y: 1500 },
    { x: 1900, y: 1000 }, { x: 2400, y: 700 }, { x: 1150, y: 1750 },
    { x: 2600, y: 2050 },
  ],

  // Mission chain: name, short brief, payout index.
  MISSIONS: [
    {
      name: 'First Delivery',
      brief: 'Pick up the package at Pasar, then deliver it to Pelabuhan before time runs out.',
    },
    {
      name: 'Borrowed Wheels',
      brief: 'Steal the marked sedan and bring it to the garage in Kampung.',
    },
    {
      name: 'Heat Wave',
      brief: 'The cops are on you. Survive wanted level 3 for 45 seconds, or reach the hideout.',
    },
    {
      name: 'Debt Collection',
      brief: 'Find the debtor at Taman Park, collect what he owes, then lose the cops.',
    },
    {
      name: 'The Last Bridge',
      brief: 'Wanted level 4. Drive across the Jembatan and leave Karang Bay for good.',
    },
  ],

  // Traffic car colours (bold, flat).
  CAR_COLORS: ['#e84a3f', '#3f8ae8', '#e8a33f', '#4fae5a', '#e8e4da', '#8a5ae8', '#e86a9a', '#3fb8a8'],

  // Pedestrian shirt colours.
  PED_COLORS: ['#e8e4da', '#e8a33f', '#7ab8e8', '#c98a6a', '#9ab87a', '#d08a9a'],
};

// Freeze the tuning table so a stray write cannot change the rules mid-game.
Object.freeze(CFG.COLORS);
Object.freeze(CFG.POINTS);
Object.freeze(CFG.MISSIONS);
Object.freeze(CFG);
