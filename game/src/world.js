// KARANG BAY — world state and rules.
// Player (on foot / driving), traffic, pedestrians, police, the wanted
// system, health, cash and the five chained missions. Pure rules, fixed
// step, no rendering and no sound here.

const World = {
  seed: 1,
  rng: null,
  time: 0,
  // Player state.
  player: null,
  // All cars: traffic, parked, police and the player's car.
  cars: [],
  // Pedestrians walking the city.
  peds: [],
  // On-foot police officers chasing the player.
  officers: [],
  // The debtor of mission 4 (a special pedestrian at Taman Park).
  debtor: null,
  // The marked sedan of mission 2.
  markedCar: null,
  // Wanted level 0..5, and seconds since the last crime.
  wanted: 0,
  calmTimer: 0,
  // Cash (rupiah) earned this run.
  cash: 0,
  bestCash: 0,
  // Mission state.
  missionIndex: 0,
  mission: null,
  victory: false,
  // Floating message line + its remaining seconds.
  message: '',
  messageTimer: 0,
  // Run statistics.
  stats: { busted: 0, wasted: 0, carsStolen: 0, pedsHit: 0 },
  // Set to 'busted' or 'wasted' when the player is caught or knocked out;
  // the main loop consumes it to switch screens.
  screenEvent: null,
  // Damage cooldowns (per source, seconds).
  damageCooldown: 0,

  reset(seed, opts) {
    opts = opts || {};
    this.seed = seed;
    this.rng = makeRng(seed * 7919 + 13);
    this.time = 0;
    this.wanted = 0;
    this.calmTimer = 0;
    this.cash = opts.cash || 0;
    this.bestCash = opts.bestCash || 0;
    this.missionIndex = opts.missionIndex || 0;
    this.victory = false;
    this.message = '';
    this.messageTimer = 0;
    this.stats = { busted: 0, wasted: 0, carsStolen: 0, pedsHit: 0 };
    this.damageCooldown = 0;
    this.debtor = null;
    this.markedCar = null;

    const start = CFG.POINTS.playerStart;
    this.player = {
      x: start.x, y: start.y, angle: -Math.PI / 2, speed: 0,
      health: CFG.MAX_HEALTH, onFoot: true, car: null,
      punchTimer: 0, punchHit: false,
    };
    this.cars = [];
    this.peds = [];
    this.officers = [];
    this.spawnTraffic();
    this.spawnPeds();
    this.spawnParkedCars();
    this.startMission(this.missionIndex);
  },

  // ---- spawning -----------------------------------------------------------

  spawnTraffic() {
    const longRoads = City.roads.filter((r) => r.w > 500 || r.h > 500);
    for (let i = 0; i < CFG.TRAFFIC_COUNT; i++) {
      const road = this.rng.pick(longRoads);
      const axis = road.axis;
      const dir = this.rng.chance(0.5) ? 1 : -1;
      const car = {
        x: axis === 'v' ? road.x + road.w / 2 + this.rng.range(-14, 14) : this.rng.range(road.x + 20, road.x + road.w - 20),
        y: axis === 'h' ? road.y + road.h / 2 + this.rng.range(-14, 14) : this.rng.range(road.y + 20, road.y + road.h - 20),
        angle: axis === 'v' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
        speed: this.rng.range(CFG.TRAFFIC_SPEED_MIN, CFG.TRAFFIC_SPEED_MAX),
        cruise: 0,
        color: this.rng.pick(CFG.CAR_COLORS),
        axis, dir, parked: false, police: false, player: false, driver: true,
      };
      car.cruise = car.speed;
      this.cars.push(car);
    }
  },

  spawnParkedCars() {
    // Parked cars along the roads, stealable with E.
    for (const s of CFG.PARKED_SPOTS) {
      this.cars.push({
        x: s.x, y: s.y, angle: this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
        speed: 0, cruise: 0, color: this.rng.pick(CFG.CAR_COLORS),
        axis: 'v', dir: 1, parked: true, police: false, player: false, driver: false,
      });
    }
  },

  spawnPeds() {
    for (let i = 0; i < CFG.PED_COUNT; i++) {
      const p = City.randomLandPoint(this.rng);
      this.peds.push({
        x: p.x, y: p.y, angle: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(CFG.PED_SPEED_MIN, CFG.PED_SPEED_MAX),
        color: this.rng.pick(CFG.PED_COLORS),
        state: 'walk', stateTimer: this.rng.range(2, 8), down: 0,
      });
    }
  },

  spawnPoliceCar() {
    // Spawn on a road at the map edge, some distance from the player.
    const p = this.player;
    for (let tries = 0; tries < 12; tries++) {
      const road = this.rng.pick(City.roads.filter((r) => r.w > 500 || r.h > 500));
      const x = this.rng.range(road.x + 16, road.x + road.w - 16);
      const y = this.rng.range(road.y + 16, road.y + road.h - 16);
      if (dist(x, y, p.x, p.y) < 500 || dist(x, y, p.x, p.y) > 1100) continue;
      this.cars.push({
        x, y, angle: angleTo(x, y, p.x, p.y), speed: 0, cruise: CFG.POLICE_CAR_SPEED,
        color: CFG.COLORS.police, axis: road.axis, dir: 1,
        parked: false, police: true, player: false, driver: true, ramCooldown: 0,
      });
      return;
    }
  },

  spawnOfficer() {
    const p = this.player;
    const a = this.rng.range(0, Math.PI * 2);
    const x = clamp(p.x + Math.cos(a) * 420, 60, CFG.WORLD_W - 60);
    const y = clamp(p.y + Math.sin(a) * 420, CFG.RIVER_Y + 60, CFG.HARBOUR_Y - 60);
    this.officers.push({ x, y, angle: angleTo(x, y, p.x, p.y), speed: CFG.POLICE_FOOT_SPEED, stun: 0, punchCooldown: 0 });
  },

  // ---- missions -----------------------------------------------------------

  startMission(i) {
    this.missionIndex = i;
    // Past the last mission there is nothing to start (victory scenes use this).
    if (i >= CFG.MISSIONS.length) {
      this.mission = null;
      return;
    }
    const def = CFG.MISSIONS[i];
    const P = CFG.POINTS;
    if (i === 0) {
      this.mission = { index: 0, name: def.name, brief: def.brief, phase: 'pickup', timer: 0, target: { x: P.pasarPickup.x, y: P.pasarPickup.y, label: 'Pick up the package — Pasar' } };
    } else if (i === 1) {
      // The marked sedan waits near the market.
      const sedan = {
        x: CFG.SEDAN_SPOT.x, y: CFG.SEDAN_SPOT.y, angle: 0, speed: 0, cruise: 0, color: '#e84a3f',
        axis: 'h', dir: 1, parked: true, police: false, player: false, driver: false, marked: true,
      };
      this.cars.push(sedan);
      this.markedCar = sedan;
      this.mission = { index: 1, name: def.name, brief: def.brief, phase: 'steal', timer: 0, target: { x: sedan.x, y: sedan.y, label: 'Steal the marked sedan' } };
    } else if (i === 2) {
      this.setWanted(3);
      this.mission = { index: 2, name: def.name, brief: def.brief, phase: 'survive', timer: CFG.SURVIVE_TIME, target: { x: P.hideout.x, y: P.hideout.y, label: 'Survive — or reach the hideout' } };
    } else if (i === 3) {
      this.debtor = { x: P.parkDebtor.x, y: P.parkDebtor.y, angle: 0, scared: false, paid: false };
      this.mission = { index: 3, name: def.name, brief: def.brief, phase: 'reach', timer: 0, target: { x: P.parkDebtor.x, y: P.parkDebtor.y, label: 'Find the debtor — Taman Park' } };
    } else if (i === 4) {
      this.setWanted(4);
      this.mission = { index: 4, name: def.name, brief: def.brief, phase: 'escape', timer: 0, target: { x: P.bridgeExit.x, y: P.bridgeExit.y, label: 'Cross the Jembatan — leave the city' } };
    }
    this.showMessage(def.name + ' — ' + def.brief, 5);
  },

  completeMission() {
    const payout = CFG.PAYOUTS[this.missionIndex];
    this.cash += payout;
    this.bestCash = Math.max(this.bestCash, this.cash);
    const name = this.mission.name;
    this.showMessage('Mission complete: ' + name + '  +' + formatRp(payout), 4);
    this.missionIndex++;
    this.mission = null;
    if (this.missionIndex >= CFG.MISSIONS.length) {
      this.victory = true;
      return;
    }
    this.startMission(this.missionIndex);
  },

  failMission(reason) {
    this.showMessage(reason, 4);
    // Back to the start, healthy, clean record, same mission again.
    const start = CFG.POINTS.playerStart;
    const p = this.player;
    if (p.car) {
      p.car.player = false;
      p.car.parked = true;
      p.car.speed = 0;
      p.car = null;
    }
    p.x = start.x;
    p.y = start.y;
    p.angle = -Math.PI / 2;
    p.speed = 0;
    p.health = CFG.MAX_HEALTH;
    p.onFoot = true;
    this.wanted = 0;
    this.calmTimer = 0;
    this.cars = this.cars.filter((c) => !c.police);
    this.officers = [];
    if (this.markedCar) {
      this.cars = this.cars.filter((c) => c !== this.markedCar);
      this.markedCar = null;
    }
    this.startMission(this.missionIndex);
  },

  showMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds;
  },

  // ---- wanted, health, bust / waste ---------------------------------------

  setWanted(n) {
    this.wanted = clamp(n, 0, CFG.WANTED_MAX);
    this.calmTimer = 0;
  },

  addWanted(n) {
    if (n <= 0) return;
    this.setWanted(this.wanted + n);
    this.showMessage('Wanted level ' + this.wanted + '!', 2.5);
  },

  policeNearby(distLimit) {
    const p = this.player;
    for (const c of this.cars) {
      if (c.police && dist(c.x, c.y, p.x, p.y) < distLimit) return true;
    }
    for (const o of this.officers) {
      if (dist(o.x, o.y, p.x, p.y) < distLimit) return true;
    }
    return false;
  },

  damagePlayer(amount) {
    if (this.damageCooldown > 0) return;
    this.player.health -= amount;
    this.damageCooldown = 0.7;
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.waste();
    }
  },

  bust() {
    this.stats.busted++;
    const lost = Math.floor(this.cash * CFG.BUSTED_LOSS);
    this.cash -= lost;
    this.screenEvent = 'busted';
    this.failMission('BUSTED! The police caught you. Lost ' + formatRp(lost) + '.');
  },

  waste() {
    this.stats.wasted++;
    this.screenEvent = 'wasted';
    this.failMission('WASTED! You were knocked out. The mission restarts.');
  },

  // ---- player actions ------------------------------------------------------

  nearestCar(maxDist) {
    const p = this.player;
    let best = null;
    let bestD = maxDist;
    for (const c of this.cars) {
      if (c.player) continue;
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  },

  tryEnterCar() {
    const p = this.player;
    if (!p.onFoot) {
      // Get out of the car.
      const car = p.car;
      car.player = false;
      car.parked = true;
      car.speed = 0;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
      const fixed = City.resolveMove(p.x, p.y, 0, 0, CFG.PLAYER_R);
      p.x = fixed.x;
      p.y = fixed.y;
      p.angle = car.angle;
      p.car = null;
      p.onFoot = true;
      return;
    }
    const car = this.nearestCar(52);
    if (!car) return;
    if (car.police) {
      this.showMessage('Too hot — that is a police car!', 2.5);
      return;
    }
    if (!car.parked && car.driver) {
      // Pull the driver out: he flees and calls the police.
      this.peds.push({
        x: car.x, y: car.y, angle: this.rng.range(0, Math.PI * 2),
        speed: 120, color: '#e8e4da', state: 'flee', stateTimer: 6, down: 0,
      });
      car.driver = false;
      this.stats.carsStolen++;
      this.addWanted(1);
      this.showMessage('Car stolen! Wanted level ' + this.wanted, 2.5);
    }
    car.parked = false;
    car.player = true;
    car.speed = 0;
    p.car = car;
    p.onFoot = false;
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
  },

  punch() {
    const p = this.player;
    if (!p.onFoot || p.punchTimer > 0) return;
    p.punchTimer = 0.35;
    const px = p.x + Math.cos(p.angle) * 26;
    const py = p.y + Math.sin(p.angle) * 26;
    // The debtor of mission 4.
    if (this.debtor && !this.debtor.paid && this.mission && this.mission.index === 3 && this.mission.phase === 'confront') {
      if (dist(px, py, this.debtor.x, this.debtor.y) < CFG.PUNCH_RANGE + 14) {
        this.debtor.paid = true;
        this.debtor.scared = true;
        this.addWanted(1);
        this.mission.phase = 'escape';
        this.mission.target = { x: p.x, y: p.y, label: 'Lose the cops — wanted back to 0' };
        this.showMessage('Cash collected! Now lose the cops.', 3);
        return;
      }
    }
    // An officer: stun him, but the law notices.
    for (const o of this.officers) {
      if (dist(px, py, o.x, o.y) < CFG.PUNCH_RANGE + 10) {
        o.stun = 3;
        this.addWanted(1);
        this.showMessage('You hit an officer! Wanted level ' + this.wanted, 2.5);
        return;
      }
    }
    // A pedestrian: he flees; the law notices only if police are near.
    for (const ped of this.peds) {
      if (ped.down > 0) continue;
      if (dist(px, py, ped.x, ped.y) < CFG.PUNCH_RANGE) {
        ped.state = 'flee';
        ped.stateTimer = 5;
        if (this.policeNearby(420)) this.addWanted(1);
        return;
      }
    }
  },

  // ---- per-frame update ----------------------------------------------------

  update(dt) {
    this.time += dt;
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }
    if (this.damageCooldown > 0) this.damageCooldown -= dt;
    const p = this.player;
    if (p.punchTimer > 0) p.punchTimer -= dt;

    this.updatePlayer(dt);
    this.updateCars(dt);
    this.updatePeds(dt);
    this.updateOfficers(dt);
    this.updateWanted(dt);
    this.updateMission(dt);

    // Slow health regen while calm.
    if (this.wanted === 0 && p.health > 0 && p.health < CFG.MAX_HEALTH) {
      p.health = Math.min(CFG.MAX_HEALTH, p.health + CFG.HEALTH_REGEN * dt);
    }
  },

  updatePlayer(dt) {
    const p = this.player;
    const mv = Input.moveVector();
    if (p.onFoot) {
      const speed = Input.isRunning() ? CFG.RUN_SPEED : CFG.WALK_SPEED;
      if (mv) {
        p.angle = Math.atan2(mv.y, mv.x);
        const res = City.resolveMove(p.x, p.y, mv.x * speed * dt, mv.y * speed * dt, CFG.PLAYER_R);
        p.x = clamp(res.x, 20, CFG.WORLD_W - 20);
        p.y = clamp(res.y, CFG.RIVER_Y + 20, CFG.WORLD_H - 20);
        p.speed = speed;
      } else {
        p.speed = 0;
      }
      if (Input.wasPressed('Space')) this.punch();
      if (Input.wasPressed('KeyE')) this.tryEnterCar();
      return;
    }
    // Driving.
    const car = p.car;
    if (!car) {
      p.onFoot = true;
      return;
    }
    const forward = Input.isDown('KeyW') || Input.isDown('ArrowUp');
    const back = Input.isDown('KeyS') || Input.isDown('ArrowDown');
    const left = Input.isDown('KeyA') || Input.isDown('ArrowLeft');
    const right = Input.isDown('KeyD') || Input.isDown('ArrowRight');
    const brake = Input.isDown('Space');
    if (forward) car.speed += CFG.CAR_ACCEL * dt;
    if (back) car.speed -= CFG.CAR_BRAKE * dt * 0.7;
    if (!forward && !back) {
      const drag = 260 * dt;
      if (Math.abs(car.speed) <= drag) car.speed = 0;
      else car.speed -= Math.sign(car.speed) * drag;
    }
    if (brake) {
      const bdrag = 700 * dt;
      if (Math.abs(car.speed) <= bdrag) car.speed = 0;
      else car.speed -= Math.sign(car.speed) * bdrag;
    }
    car.speed = clamp(car.speed, -CFG.CAR_MAX_REVERSE, CFG.CAR_MAX_SPEED);
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    if (steer !== 0 && Math.abs(car.speed) > 12) {
      const grip = brake ? 1.5 : 1;
      car.angle += steer * CFG.CAR_TURN * grip * dt * Math.sign(car.speed) *
        clamp(Math.abs(car.speed) / 220, 0.25, 1);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const res = City.resolveMove(car.x, car.y, nx - car.x, ny - car.y, CFG.CAR_R);
    if (res.hit && Math.abs(car.speed) > 260) {
      this.damagePlayer(Math.floor((Math.abs(car.speed) - 240) / 22));
      car.speed *= -0.22;
    } else if (res.hit) {
      car.speed *= 0.4;
    }
    car.x = clamp(res.x, 20, CFG.WORLD_W - 20);
    car.y = clamp(res.y, CFG.RIVER_Y + 20, CFG.WORLD_H - 20);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = Math.abs(car.speed);
    if (Input.wasPressed('KeyE')) this.tryEnterCar();
  },

  updateCars(dt) {
    const p = this.player;
    for (const car of this.cars) {
      if (car.player) continue;
      if (car.police) {
        this.updatePoliceCar(car, dt);
        continue;
      }
      if (car.parked) continue;
      // Traffic: follow the road, turn at intersections, stop for cars ahead.
      let ahead = false;
      for (const other of this.cars) {
        if (other === car || other.parked) continue;
        const dx = other.x - car.x;
        const dy = other.y - car.y;
        const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
        const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
        if (along > 0 && along < 62 && side < 26) {
          ahead = true;
          break;
        }
      }
      const target = ahead ? 0 : car.cruise;
      car.speed += clamp(target - car.speed, -300 * dt, 200 * dt);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const res = City.resolveMove(car.x, car.y, nx - car.x, ny - car.y, CFG.CAR_R);
      if (res.hit) {
        // Turn around at a dead end.
        car.dir *= -1;
        car.angle += Math.PI;
        car.speed *= 0.3;
      } else {
        car.x = res.x;
        car.y = res.y;
      }
      // Turn at intersections.
      if (City.roadAxisAt(car.x, car.y) === 'x' && this.rng.chance(0.22 * dt * 10)) {
        if (car.axis === 'v') {
          car.axis = 'h';
          car.dir = this.rng.chance(0.5) ? 1 : -1;
          car.angle = car.dir > 0 ? 0 : Math.PI;
          car.y = this.nearestHCenter(car.y);
        } else {
          car.axis = 'v';
          car.dir = this.rng.chance(0.5) ? 1 : -1;
          car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          car.x = this.nearestVCenter(car.x);
        }
      }
      // Keep traffic on the road grid; nudge back if it drifted off.
      if (!City.onRoad(car.x, car.y)) {
        car.angle += Math.PI;
        car.dir *= -1;
        car.speed *= 0.5;
      }
    }
    this.collideCars(dt);
  },

  nearestHCenter(y) {
    let best = CFG.H_ROADS[0];
    let bd = Math.abs(y - best);
    for (const cy of CFG.H_ROADS) {
      const d = Math.abs(y - cy);
      if (d < bd) {
        bd = d;
        best = cy;
      }
    }
    return best;
  },

  nearestVCenter(x) {
    let best = CFG.V_ROADS[0];
    let bd = Math.abs(x - best);
    for (const cx of CFG.V_ROADS) {
      const d = Math.abs(x - cx);
      if (d < bd) {
        bd = d;
        best = cx;
      }
    }
    return best;
  },

  updatePoliceCar(car, dt) {
    const p = this.player;
    const d = dist(car.x, car.y, p.x, p.y);
    if (this.wanted === 0) {
      // Drive off: head for the nearest map edge and fade out.
      car.angle = angleTo(car.x, car.y, CFG.WORLD_W / 2, -100);
      car.speed = Math.min(car.speed + 300 * dt, 420);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      car.x = nx;
      car.y = ny;
      if (d > 1100 || car.y < -60) car.gone = true;
      return;
    }
    const want = angleTo(car.x, car.y, p.x, p.y);
    car.angle += clamp(wrapAngle(want - car.angle), -2.6 * dt, 2.6 * dt);
    car.speed = Math.min(car.speed + 380 * dt, car.cruise);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const res = City.resolveMove(car.x, car.y, nx - car.x, ny - car.y, CFG.CAR_R);
    if (res.hit) car.speed *= 0.4;
    car.x = res.x;
    car.y = res.y;
    car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
    if (d < 40 && car.ramCooldown <= 0) {
      car.ramCooldown = 1.1;
      if (p.onFoot) {
        // Rammed on foot: heavy damage.
        this.damagePlayer(22);
      } else if (p.car) {
        this.damagePlayer(12);
        p.car.speed *= 0.55;
        car.speed *= 0.4;
      }
    }
    // Close enough on foot: an officer gets out and chases.
    if (p.onFoot && d < 170 && this.officers.length < 3 && this.rng.chance(0.4 * dt)) {
      this.officers.push({ x: car.x, y: car.y, angle: angleTo(car.x, car.y, p.x, p.y), speed: CFG.POLICE_FOOT_SPEED, stun: 0, punchCooldown: 0 });
    }
  },

  collideCars(dt) {
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        const d = dist(a.x, a.y, b.x, b.y);
        const min = CFG.CAR_R * 2 - 4;
        if (d > 0.01 && d < min) {
          const push = (min - d) / 2;
          const ux = (b.x - a.x) / d;
          const uy = (b.y - a.y) / d;
          if (!a.player && !a.police) {
            a.x -= ux * push;
            a.y -= uy * push;
          }
          if (!b.player && !b.police) {
            b.x += ux * push;
            b.y += uy * push;
          }
          // A hard impact with the player's car: damage + a jolt, but only
          // once per hit — without the cooldown the overlap would grind the
          // player's speed to zero frame after frame.
          if ((a.player || b.player) && Math.abs(a.speed - b.speed) > 200 && this.damageCooldown <= 0) {
            this.damagePlayer(6);
            a.speed *= 0.6;
            b.speed *= 0.6;
          }
        }
      }
    }
    // Player car vs pedestrians.
    const p = this.player;
    if (!p.onFoot && p.car) {
      for (const ped of this.peds) {
        if (ped.down > 0) continue;
        if (dist(p.car.x, p.car.y, ped.x, ped.y) < CFG.CAR_R + 10 && Math.abs(p.car.speed) > 60) {
          ped.down = 4;
          ped.state = 'down';
          this.stats.pedsHit++;
          const witnessed = this.policeNearby(420) || this.peds.some((q) => q !== ped && q.down <= 0 && dist(q.x, q.y, ped.x, ped.y) < 220);
          if (witnessed) this.addWanted(1);
        }
      }
    }
    // Remove police cars that drove off.
    this.cars = this.cars.filter((c) => !c.gone);
  },

  updatePeds(dt) {
    const p = this.player;
    for (const ped of this.peds) {
      if (ped.down > 0) {
        ped.down -= dt;
        if (ped.down <= 0) {
          ped.state = 'walk';
          ped.stateTimer = this.rng.range(2, 6);
        }
        continue;
      }
      ped.stateTimer -= dt;
      const carThreat = !p.onFoot && p.car && dist(ped.x, ped.y, p.car.x, p.car.y) < 95 && Math.abs(p.car.speed) > 40;
      const footThreat = p.onFoot && dist(ped.x, ped.y, p.x, p.y) < 46 && p.speed > 200;
      if ((carThreat || footThreat) && ped.state !== 'flee') {
        ped.state = 'flee';
        ped.stateTimer = 4;
      }
      if (ped.state === 'flee') {
        const tx = p.onFoot ? p.x : p.car.x;
        const ty = p.onFoot ? p.y : p.car.y;
        ped.angle = angleTo(tx, ty, ped.x, ped.y);
        const res = City.resolveMove(ped.x, ped.y, Math.cos(ped.angle) * 150 * dt, Math.sin(ped.angle) * 150 * dt, 10);
        ped.x = res.x;
        ped.y = res.y;
        if (ped.stateTimer <= 0) {
          ped.state = 'walk';
          ped.stateTimer = this.rng.range(3, 8);
        }
        continue;
      }
      // Walk: pick a new direction now and then, stay on land.
      if (ped.stateTimer <= 0) {
        ped.angle = this.rng.range(0, Math.PI * 2);
        ped.stateTimer = this.rng.range(3, 9);
      }
      const res = City.resolveMove(ped.x, ped.y, Math.cos(ped.angle) * ped.speed * dt, Math.sin(ped.angle) * ped.speed * dt, 10);
      if (res.hit) ped.angle += Math.PI / 2;
      ped.x = res.x;
      ped.y = res.y;
    }
    // The debtor stands at the park until confronted, then runs.
    if (this.debtor) {
      const d = this.debtor;
      if (d.scared) {
        d.angle = angleTo(p.x, p.y, d.x, d.y);
        const res = City.resolveMove(d.x, d.y, Math.cos(d.angle) * 170 * dt, Math.sin(d.angle) * 170 * dt, 10);
        d.x = res.x;
        d.y = res.y;
      }
    }
  },

  updateOfficers(dt) {
    const p = this.player;
    for (const o of this.officers) {
      if (o.stun > 0) {
        o.stun -= dt;
        continue;
      }
      o.punchCooldown = Math.max(0, o.punchCooldown - dt);
      const d = dist(o.x, o.y, p.x, p.y);
      o.angle = angleTo(o.x, o.y, p.x, p.y);
      const res = City.resolveMove(o.x, o.y, Math.cos(o.angle) * o.speed * dt, Math.sin(o.angle) * o.speed * dt, 11);
      o.x = res.x;
      o.y = res.y;
      if (d < CFG.BUST_DIST && p.onFoot) {
        this.bust();
        return;
      }
      if (d < 34 && !p.onFoot && o.punchCooldown <= 0) {
        o.punchCooldown = 1.2;
        this.damagePlayer(8);
      }
    }
    // Officers give up once the heat is off.
    if (this.wanted === 0) this.officers = [];
  },

  updateWanted(dt) {
    if (this.wanted === 0) return;
    this.calmTimer += dt;
    // Keep the heat on: spawn police up to the wanted level.
    const wantCars = this.wanted;
    const haveCars = this.cars.filter((c) => c.police).length;
    if (haveCars < wantCars && this.rng.chance(0.9 * dt)) this.spawnPoliceCar();
    const wantOfficers = this.wanted >= 3 ? 2 : this.wanted >= 2 ? 1 : 0;
    if (this.officers.length < wantOfficers && this.rng.chance(0.5 * dt)) this.spawnOfficer();
    // Decay after a calm stretch with no police in sight.
    if (this.calmTimer > CFG.WANTED_DECAY_SEC && !this.policeNearby(380)) {
      this.wanted--;
      this.calmTimer = 0;
      if (this.wanted === 0) this.showMessage('You lost them. Wanted level 0.', 2.5);
    }
  },

  updateMission(dt) {
    const m = this.mission;
    if (!m || this.victory) return;
    const p = this.player;
    const near = (t, r) => dist(p.x, p.y, t.x, t.y) < r;

    if (m.index === 0) {
      if (m.phase === 'pickup' && near(m.target, 48)) {
        m.phase = 'deliver';
        m.timer = CFG.DELIVERY_TIME;
        const P = CFG.POINTS.pelabuhanDrop;
        m.target = { x: P.x, y: P.y, label: 'Deliver to Pelabuhan — before the timer!' };
        this.showMessage('Package picked up! Deliver it to Pelabuhan.', 3);
      } else if (m.phase === 'deliver') {
        m.timer -= dt;
        if (near(m.target, 52)) {
          this.completeMission();
        } else if (m.timer <= 0) {
          this.failMission('Too slow! The delivery failed. Try again.');
        }
      }
    } else if (m.index === 1) {
      if (m.phase === 'steal') {
        if (this.markedCar) {
          m.target.x = this.markedCar.x;
          m.target.y = this.markedCar.y;
        }
        if (!p.onFoot && p.car && p.car.marked) {
          m.phase = 'deliver';
          const P = CFG.POINTS.garage;
          m.target = { x: P.x, y: P.y, label: 'Bring the sedan to the garage — Kampung' };
          this.showMessage('Got the sedan! Now to the garage.', 3);
        }
      } else if (m.phase === 'deliver') {
        if (!p.onFoot && p.car && p.car.marked && near(m.target, 64)) {
          this.completeMission();
        } else if (p.onFoot && this.markedCar) {
          // Left the car: the marker points back at the sedan.
          m.target = { x: this.markedCar.x, y: this.markedCar.y, label: 'Get back in the sedan' };
        }
      }
    } else if (m.index === 2) {
      m.timer -= dt;
      const P = CFG.POINTS.hideout;
      if (near(P, 56)) {
        this.completeMission();
      } else if (m.timer <= 0) {
        this.completeMission();
      }
    } else if (m.index === 3) {
      if (m.phase === 'reach' && near(m.target, 48)) {
        m.phase = 'confront';
        m.target = { x: this.debtor.x, y: this.debtor.y, label: 'Press SPACE to collect the debt' };
        this.showMessage('There he is. Press SPACE to collect.', 3);
      } else if (m.phase === 'confront') {
        if (this.debtor) {
          m.target.x = this.debtor.x;
          m.target.y = this.debtor.y;
        }
      } else if (m.phase === 'escape') {
        if (this.wanted === 0) {
          this.completeMission();
        }
      }
    } else if (m.index === 4) {
      const onBridge = p.x > CFG.BRIDGE_X0 && p.x < CFG.BRIDGE_X1;
      if (onBridge && p.y < 100) {
        this.completeMission();
      }
    }
  },
};
