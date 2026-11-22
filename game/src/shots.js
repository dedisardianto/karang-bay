// KARANG BAY — staged scenes for screenshots.
// ?shot=start shows the title, ?shot=play a mid-mission drive, ?shot=chase
// a police chase at wanted 3, ?shot=end the victory screen. Each scene is
// a real, running game state — the world keeps moving after the stage is set.

const Shots = {
  // Apply a staged scene to a freshly reset world. Returns the screen the
  // game should open on.
  apply(name) {
    if (name === 'start') {
      return 'title';
    }
    if (name === 'play') {
      // Mid-mission 1: Rian driving east on the y=900 road toward Pelabuhan.
      World.reset(World.seed, { cash: 50000, missionIndex: 0 });
      const p = World.player;
      const car = World.cars.find((c) => c.parked && !c.police);
      if (car) {
        car.parked = false;
        car.player = true;
        p.car = car;
        p.onFoot = false;
        p.x = car.x;
        p.y = car.y;
        p.angle = car.angle;
      }
      p.x = 1200;
      p.y = 900;
      if (p.car) {
        p.car.x = 1200;
        p.car.y = 900;
        p.car.angle = 0;
        // Fast enough to still be moving when the screenshot is taken.
        p.car.speed = 480;
      }
      World.mission.phase = 'deliver';
      World.mission.timer = 82;
      World.mission.target = { x: CFG.POINTS.pelabuhanDrop.x, y: CFG.POINTS.pelabuhanDrop.y, label: 'Deliver to Pelabuhan — before the timer!' };
      World.showMessage('Package picked up! Deliver it to Pelabuhan.', 6);
      return 'play';
    }
    if (name === 'chase') {
      // Mission 3: wanted 3, police cars closing in on Rian's car.
      World.reset(World.seed, { cash: 125000, missionIndex: 2 });
      const p = World.player;
      const car = World.cars.find((c) => c.parked && !c.police);
      if (car) {
        car.parked = false;
        car.player = true;
        p.car = car;
        p.onFoot = false;
        p.x = car.x;
        p.y = car.y;
        p.angle = car.angle;
      }
      p.x = 1500;
      p.y = 900;
      if (p.car) {
        p.car.x = 1500;
        p.car.y = 900;
        p.car.angle = 0;
        p.car.speed = 300;
      }
      World.setWanted(3);
      World.mission.timer = 31;
      for (let i = 0; i < 3; i++) {
        World.spawnPoliceCar();
      }
      // Pull the police in close so the chase reads in one frame.
      // All three spots are on roads, so the police can actually move.
      const cops = World.cars.filter((c) => c.police);
      const spots = [
        { x: 1200, y: 900 }, { x: 1800, y: 900 }, { x: 1600, y: 1150 },
      ];
      cops.forEach((cop, i) => {
        const s = spots[i % spots.length];
        cop.x = s.x;
        cop.y = s.y;
        cop.speed = 300;
      });
      World.showMessage('Heat Wave — survive wanted level 3!', 6);
      return 'play';
    }
    if (name === 'end') {
      // Victory: all five missions done, the full payout in hand.
      World.reset(World.seed, { cash: 600000, missionIndex: 5 });
      World.victory = true;
      World.mission = null;
      World.cash = 600000;
      World.bestCash = 600000;
      return 'victory';
    }
    return 'title';
  },
};
