// KARANG BAY's rules and state, with no drawing and no browser in it: the player
// on foot and in cars, traffic and pedestrians, police and the wanted level, the
// five chained missions, cash and health. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react without the world knowing
// about screens or sound. Pools are allocated once, at boot.
import {
  CAR, CITY, MISSIONS, PARKED, PEDS, PLAYER, POLICE, TRAFFIC, WANTED,
} from './config.js';
import { DOCK, GARAGE, HIDEOUT, PARK, PLAZA } from './city.js';
import { ACTION_ENTER, ACTION_PUNCH } from './input.js';

export const EVENT_PICKUP = 1;
export const EVENT_MISSION = 2;
export const EVENT_BUSTED = 4;
export const EVENT_WASTED = 8;
export const EVENT_CRASH = 16;
export const EVENT_PUNCH = 32;
export const EVENT_STEAL = 64;
export const EVENT_HIT_PED = 128;
export const EVENT_VICTORY = 256;
export const EVENT_FAIL = 512;

const SPAWN = { x: 1600, y: 1150 };
const SEDAN_SPOT = { x: 2150, y: 985 };
const DEBTOR_SPOT = { x: 910, y: 1440 };
const BRIDGE_SPOT = { x: 1600, y: 70 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function turnToward(angle, target, maxTurn) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return angle + clamp(diff, -maxTurn, maxTurn);
}

export function createWorld(city, random) {
  const player = {
    x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, health: PLAYER.health,
    inCar: null, punchCooldown: 0, invulnerable: 0, regenDelay: 0,
  };

  const cars = [];
  const totalCars = TRAFFIC.count + PARKED.count + 1;
  for (let i = 0; i < totalCars; i += 1) {
    cars.push({
      active: false, kind: 'traffic', x: 0, y: 0, angle: 0, speed: 0,
      color: '#e5534b', driver: false, from: null, to: null, progress: 0,
      cruise: TRAFFIC.speed, mission: false,
    });
  }
  const peds = [];
  for (let i = 0; i < PEDS.count + 4; i += 1) {
    peds.push({
      active: false, kind: 'walker', x: 0, y: 0, angle: 0, speed: 0,
      targetX: 0, targetY: 0, fleeing: false, fleeX: 0, fleeY: 0, down: 0,
    });
  }
  const policeCars = [];
  for (let i = 0; i < POLICE.maxCars; i += 1) {
    policeCars.push({ active: false, x: 0, y: 0, angle: 0, speed: 0, ramCooldown: 0, lost: 0, aimDx: 0, aimDy: 0 });
  }
  const officers = [];
  for (let i = 0; i < POLICE.maxOfficers; i += 1) {
    officers.push({ active: false, x: 0, y: 0, angle: 0, punchCooldown: 0, lost: 0 });
  }

  const state = {
    player, cars, peds, policeCars, officers,
    cash: 0, wanted: 0, wantedTimer: 0, calmTimer: 0, policeCooldown: 0,
    missionIndex: 0, missionStage: 0, missionTimer: 0, surviveTimer: 0,
    missionTarget: { x: PLAZA.x + PLAZA.w / 2, y: PLAZA.y + PLAZA.h / 2, label: 'PASAR' },
    missionDone: false, elapsed: 0, message: '', messageTimer: 0,
  };

  function showMessage(text, seconds) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function freeCar() {
    for (const car of cars) if (!car.active) return car;
    return null;
  }
  function freePed() {
    for (const ped of peds) if (!ped.active) return ped;
    return null;
  }
  function freePoliceCar() {
    for (const car of policeCars) if (!car.active) return car;
    return null;
  }
  function freeOfficer() {
    for (const officer of officers) if (!officer.active) return officer;
    return null;
  }

  function randomRoadPoint() {
    const vertical = Math.random() < 0.5;
    if (vertical) {
      const roads = [400, 1000, 1600, 2200, 2800];
      return { x: roads[Math.floor(random() * roads.length)], y: 200 + random() * 1900 };
    }
    const roads = [400, 950, 1500, 2050];
    return { x: 200 + random() * 2800, y: roads[Math.floor(random() * roads.length)] };
  }

  function spawnTrafficCar(car) {
    const node = city.nodes[Math.floor(random() * city.nodes.length)];
    const neighbours = node.neighbours;
    const next = neighbours[Math.floor(random() * neighbours.length)];
    car.active = true;
    car.kind = 'traffic';
    car.from = node;
    car.to = next;
    car.progress = random();
    car.x = node.x + (next.x - node.x) * car.progress;
    car.y = node.y + (next.y - node.y) * car.progress;
    car.angle = angleTo(node.x, node.y, next.x, next.y);
    car.cruise = TRAFFIC.speed + (random() - 0.5) * TRAFFIC.speedJitter;
    car.speed = car.cruise;
    car.driver = true;
    car.mission = false;
    car.color = ['#e5534b', '#4fc3f7', '#f2c94c', '#7bc96f', '#b07fd6', '#e07b39', '#e8e8e8'][Math.floor(random() * 7)];
  }

  function spawnParkedCar(car, x, y, missionCar) {
    car.active = true;
    car.kind = missionCar ? 'mission' : 'parked';
    car.x = x;
    car.y = y;
    car.angle = (random() < 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.2;
    car.speed = 0;
    car.driver = false;
    car.mission = missionCar;
    car.color = missionCar ? '#2f7fe0' : ['#e5534b', '#4fc3f7', '#f2c94c', '#7bc96f', '#b07fd6'][Math.floor(random() * 5)];
    car.from = null;
    car.to = null;
  }

  function spawnPed(ped, x, y, kind) {
    ped.active = true;
    ped.kind = kind || 'walker';
    ped.x = x;
    ped.y = y;
    ped.angle = random() * Math.PI * 2;
    ped.speed = PEDS.speed * (0.8 + random() * 0.4);
    ped.fleeing = false;
    ped.down = 0;
    const target = randomRoadPoint();
    ped.targetX = target.x;
    ped.targetY = target.y;
  }

  function spawnDebtor() {
    const ped = freePed();
    if (!ped) return;
    ped.active = true;
    ped.kind = 'debtor';
    ped.x = DEBTOR_SPOT.x;
    ped.y = DEBTOR_SPOT.y;
    ped.angle = Math.PI / 2;
    ped.speed = 0;
    ped.fleeing = false;
    ped.down = 0;
  }

  function setTarget(x, y, label) {
    state.missionTarget.x = x;
    state.missionTarget.y = y;
    state.missionTarget.label = label;
  }

  function addWanted(amount) {
    state.wanted = clamp(state.wanted + amount, 0, WANTED.max);
    state.calmTimer = 0;
  }

  /** (Re)start the current mission from its beginning. */
  function setupMission() {
    const index = state.missionIndex;
    state.missionStage = 0;
    state.missionTimer = MISSIONS[index].timeLimit;
    state.surviveTimer = 0;
    if (index === 0) {
      setTarget(PLAZA.x + PLAZA.w / 2, PLAZA.y + PLAZA.h / 2, 'PASAR — pick up');
    } else if (index === 1) {
      // The marked sedan waits near Perumahan.
      let sedan = null;
      for (const car of cars) if (car.active && car.mission) sedan = car;
      if (!sedan) {
        sedan = freeCar();
        if (sedan) spawnParkedCar(sedan, SEDAN_SPOT.x, SEDAN_SPOT.y, true);
      }
      setTarget(SEDAN_SPOT.x, SEDAN_SPOT.y, 'SEDAN — steal it');
    } else if (index === 2) {
      state.wanted = 3;
      setTarget(HIDEOUT.x + HIDEOUT.w / 2, HIDEOUT.y + HIDEOUT.h / 2, 'HIDEOUT — or survive');
    } else if (index === 3) {
      spawnDebtor();
      setTarget(DEBTOR_SPOT.x, DEBTOR_SPOT.y, 'BUDI — at the park');
    } else {
      state.wanted = Math.max(state.wanted, 4);
      setTarget(BRIDGE_SPOT.x, BRIDGE_SPOT.y, 'JEMBATAN — drive out');
    }
    showMessage(`${MISSIONS[index].name}: ${MISSIONS[index].brief}`, 6);
  }

  function completeMission() {
    const mission = MISSIONS[state.missionIndex];
    state.cash += mission.reward;
    state.missionDone = true;
    // A breather between jobs: Pak Darma patches Rian up and the heat cools a little.
    player.health = Math.min(PLAYER.health, player.health + 50);
    state.wanted = Math.max(0, state.wanted - 1);
    showMessage(`Mission complete! +${mission.reward.toLocaleString('en-US').replace(/,/g, '.')} Rp`, 3);
    return EVENT_MISSION;
  }

  function failMission(reason) {
    showMessage(`Mission failed — ${reason}. Try again.`, 4);
    setupMission();
    return EVENT_FAIL;
  }

  function respawn(afterBusted) {
    player.x = SPAWN.x;
    player.y = SPAWN.y;
    player.angle = -Math.PI / 2;
    player.health = PLAYER.health;
    if (player.inCar) {
      player.inCar.speed = 0;
      player.inCar = null;
    }
    const lost = Math.floor(state.cash * (afterBusted ? 0.15 : 0.1));
    state.cash -= lost;
    state.wanted = 0;
    for (const car of policeCars) car.active = false;
    for (const officer of officers) officer.active = false;
    setupMission();
    return lost;
  }

  function reset() {
    player.x = SPAWN.x;
    player.y = SPAWN.y;
    player.angle = -Math.PI / 2;
    player.health = PLAYER.health;
    player.inCar = null;
    player.punchCooldown = 0;
    player.invulnerable = 0;
    player.regenDelay = 0;
    for (const car of cars) car.active = false;
    for (const ped of peds) ped.active = false;
    for (const car of policeCars) car.active = false;
    for (const officer of officers) officer.active = false;
    state.cash = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.calmTimer = 0;
    state.policeCooldown = 0;
    state.missionIndex = 0;
    state.missionDone = false;
    state.elapsed = 0;
    for (let i = 0; i < TRAFFIC.count; i += 1) {
      const car = freeCar();
      if (car) spawnTrafficCar(car);
    }
    for (let i = 0; i < PARKED.count; i += 1) {
      const car = freeCar();
      if (car) {
        const spot = randomRoadPoint();
        spawnParkedCar(car, spot.x + 70, spot.y + (random() - 0.5) * 40, false);
      }
    }
    for (let i = 0; i < PEDS.count; i += 1) {
      const ped = freePed();
      if (ped) {
        const spot = randomRoadPoint();
        spawnPed(ped, spot.x + (random() - 0.5) * 120, spot.y + (random() - 0.5) * 120, 'walker');
      }
    }
    setupMission();
  }

  function nearestCar(x, y, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (!car.active || car === player.inCar) continue;
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function damagePlayer(amount, invulnSeconds) {
    if (player.invulnerable > 0) return;
    player.health -= amount;
    player.invulnerable = invulnSeconds || 0.6;
    player.regenDelay = 3;
  }

  function stepTraffic(dt) {
    for (const car of cars) {
      if (!car.active || car.kind !== 'traffic' || car === player.inCar) continue;
      const from = car.from;
      const to = car.to;
      if (!from || !to) continue;
      const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      car.progress += (car.cruise * dt) / length;
      if (car.progress >= 1) {
        const cameFrom = to;
        const options = to.neighbours.filter((n) => n !== from);
        const next = options.length > 0
          ? options[Math.floor(random() * options.length)]
          : to.neighbours[Math.floor(random() * to.neighbours.length)];
        car.from = cameFrom;
        car.to = next;
        car.progress = 0;
        car.angle = angleTo(cameFrom.x, cameFrom.y, next.x, next.y);
      } else {
        car.x = from.x + (to.x - from.x) * car.progress;
        car.y = from.y + (to.y - from.y) * car.progress;
      }
    }
  }

  function stepPeds(dt) {
    for (const ped of peds) {
      if (!ped.active) continue;
      if (ped.down > 0) {
        ped.down -= dt;
        if (ped.down <= 0) {
          ped.active = false;
          const fresh = freePed();
          if (fresh && fresh !== ped) {
            const spot = randomRoadPoint();
            spawnPed(fresh, spot.x, spot.y, 'walker');
          }
        }
        continue;
      }
      if (ped.kind === 'debtor' && !ped.fleeing) continue; // Budi waits at the park.
      let speed = ped.speed;
      let tx = ped.targetX;
      let ty = ped.targetY;
      if (ped.fleeing) {
        speed = PEDS.fleeSpeed;
        tx = ped.fleeX;
        ty = ped.fleeY;
      }
      const dx = tx - ped.x;
      const dy = ty - ped.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 24) {
        if (ped.fleeing) {
          ped.fleeing = false;
          const target = randomRoadPoint();
          ped.targetX = target.x;
          ped.targetY = target.y;
        } else {
          const target = randomRoadPoint();
          ped.targetX = target.x;
          ped.targetY = target.y;
        }
        continue;
      }
      ped.angle = Math.atan2(dy, dx);
      ped.x += (dx / dist) * speed * dt;
      ped.y += (dy / dist) * speed * dt;
      city.collideCircle(ped, 12);
    }
  }

  function policeWanted() {
    return Math.min(state.wanted, POLICE.maxCars);
  }

  function stepPolice(dt) {
    state.policeCooldown = Math.max(0, state.policeCooldown - dt);
    const wantCars = policeWanted();
    let activeCars = 0;
    for (const car of policeCars) if (car.active) activeCars += 1;
    if (activeCars < wantCars && state.policeCooldown <= 0) {
      const car = freePoliceCar();
      if (car) {
        // Spawn on a road node away from the player.
        const px = player.inCar ? player.inCar.x : player.x;
        const py = player.inCar ? player.inCar.y : player.y;
        let node = city.nearestNode(px, py);
        let tries = 0;
        while (tries < 8) {
          const candidate = city.nodes[Math.floor(random() * city.nodes.length)];
          if (Math.hypot(candidate.x - px, candidate.y - py) > POLICE.spawnDistance) {
            node = candidate;
            break;
          }
          tries += 1;
        }
        car.active = true;
        car.x = node.x;
        car.y = node.y;
        car.angle = angleTo(node.x, node.y, px, py);
        car.speed = 0;
        car.ramCooldown = 0;
        car.lost = 0;
        // Each car aims at a slightly different point near the player, so the
        // whole fleet does not pile onto the same spot.
        car.aimDx = (random() - 0.5) * 220;
        car.aimDy = (random() - 0.5) * 220;
      }
    }
    const px = player.inCar ? player.inCar.x : player.x;
    const py = player.inCar ? player.inCar.y : player.y;
    for (const car of policeCars) {
      if (!car.active) continue;
      if (state.wanted === 0) {
        car.active = false;
        continue;
      }
      car.ramCooldown = Math.max(0, car.ramCooldown - dt);
      // Lose the trail: far away and unseen for a while, the chase gives up.
      const chaseDist = Math.hypot(car.x - px, car.y - py);
      if (chaseDist > 800) {
        car.lost += dt;
        if (car.lost > 4) {
          car.active = false;
          state.policeCooldown = Math.max(state.policeCooldown, 10);
          continue;
        }
      } else {
        car.lost = 0;
      }
      const targetAngle = angleTo(car.x, car.y, px + car.aimDx, py + car.aimDy);
      car.angle = turnToward(car.angle, targetAngle, 3.2 * dt);
      car.speed = Math.min(POLICE.carSpeed, car.speed + 500 * dt);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const pos = { x: nx, y: ny };
      city.collideCircle(pos, 26);
      car.x = pos.x;
      car.y = pos.y;
      // Ram the player's car.
      if (player.inCar) {
        const d = Math.hypot(car.x - player.inCar.x, car.y - player.inCar.y);
        if (d < 56 && car.ramCooldown === 0) {
          car.ramCooldown = 1.8;
          damagePlayer(POLICE.ramDamage, 1.5);
          player.inCar.speed *= 0.55;
          return EVENT_CRASH;
        }
      }
    }
    // On-foot officers chase the player when he is on foot and wanted.
    const wantOfficers = !player.inCar && state.wanted > 0 ? Math.min(state.wanted, POLICE.maxOfficers) : 0;
    let activeOfficers = 0;
    for (const officer of officers) if (officer.active) activeOfficers += 1;
    if (activeOfficers < wantOfficers) {
      const officer = freeOfficer();
      if (officer) {
        const a = random() * Math.PI * 2;
        officer.active = true;
        officer.x = clamp(player.x + Math.cos(a) * 420, 40, CITY.width - 40);
        officer.y = clamp(player.y + Math.sin(a) * 420, 40, CITY.height - 40);
        officer.punchCooldown = 0;
      }
    }
    for (const officer of officers) {
      if (!officer.active) continue;
      if (state.wanted === 0 || player.inCar) {
        officer.active = false;
        continue;
      }
      officer.punchCooldown = Math.max(0, officer.punchCooldown - dt);
      const d = Math.hypot(player.x - officer.x, player.y - officer.y);
      if (d < POLICE.bustRange) return EVENT_BUSTED;
      if (d > 700) {
        officer.lost += dt;
        if (officer.lost > 4) {
          officer.active = false;
          state.policeCooldown = Math.max(state.policeCooldown, 8);
          continue;
        }
      } else {
        officer.lost = 0;
      }
      officer.angle = angleTo(officer.x, officer.y, player.x, player.y);
      officer.x += Math.cos(officer.angle) * POLICE.officerSpeed * dt;
      officer.y += Math.sin(officer.angle) * POLICE.officerSpeed * dt;
      city.collideCircle(officer, 12);
    }
    return 0;
  }

  function stepPlayerOnFoot(dt, input, actions) {
    const steer = input.steer();
    const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    player.x += steer.x * speed * dt;
    player.y += steer.y * speed * dt;
    if (steer.x !== 0 || steer.y !== 0) player.angle = Math.atan2(steer.y, steer.x);
    city.collideCircle(player, PLAYER.radius);
    player.punchCooldown = Math.max(0, player.punchCooldown - dt);

    if (actions & ACTION_ENTER) {
      // The mission pickup comes first: at the Pasar marker, E picks up the
      // package even when a parked car is standing next to it.
      if (state.missionIndex === 0 && state.missionStage === 0) {
        const t = state.missionTarget;
        if (Math.hypot(t.x - player.x, t.y - player.y) < 70) {
          state.missionStage = 1;
          setTarget(DOCK.x, DOCK.y, 'PELABUHAN — deliver');
          return EVENT_PICKUP;
        }
      }
      // The mission car always wins when it is in reach — stealing a random
      // passing car by mistake would strand the mission.
      let car = null;
      for (const candidate of cars) {
        if (candidate.active && candidate.mission && Math.hypot(candidate.x - player.x, candidate.y - player.y) < CAR.enterRange) {
          car = candidate;
          break;
        }
      }
      if (!car) car = nearestCar(player.x, player.y, CAR.enterRange);
      if (car) {
        if (car.driver) {
          // Pull the driver out: he flees and calls the police.
          const driver = freePed();
          if (driver) {
            spawnPed(driver, car.x + 40, car.y, 'walker');
            driver.fleeing = true;
            driver.fleeX = car.x + 400;
            driver.fleeY = car.y - 300;
          }
          car.driver = false;
          car.speed = 0;
          addWanted(1);
          player.inCar = car;
          return EVENT_STEAL;
        }
        player.inCar = car;
        car.speed = 0;
        return 0;
      }
    }

    if ((actions & ACTION_PUNCH) && player.punchCooldown === 0) {
      player.punchCooldown = PLAYER.punchCooldown;
      // Hit the nearest ped or officer in range.
      let hit = null;
      let hitD = PLAYER.punchRange;
      for (const ped of peds) {
        if (!ped.active || ped.down > 0) continue;
        const d = Math.hypot(ped.x - player.x, ped.y - player.y);
        if (d < hitD) {
          hitD = d;
          hit = ped;
        }
      }
      let hitOfficer = null;
      let offD = PLAYER.punchRange;
      for (const officer of officers) {
        if (!officer.active) continue;
        const d = Math.hypot(officer.x - player.x, officer.y - player.y);
        if (d < offD) {
          offD = d;
          hitOfficer = officer;
        }
      }
      if (hitOfficer && (!hit || offD <= hitD)) {
        hitOfficer.active = false;
        addWanted(2);
        return EVENT_PUNCH;
      }
      if (hit) {
        if (hit.kind === 'debtor' && state.missionIndex === 3 && state.missionStage === 0) {
          state.cash += 25000;
          state.missionStage = 1;
          setTarget(player.x, player.y, 'LOSE THE COPS');
          addWanted(2);
          hit.fleeing = true;
          hit.fleeX = hit.x + 500;
          hit.fleeY = hit.y + 400;
          // The cops hang back as Budi goes down — Rian gets a head start to run.
          for (const officer of officers) {
            if (!officer.active) continue;
            const odx = officer.x - player.x;
            const ody = officer.y - player.y;
            const od = Math.hypot(odx, ody) || 1;
            officer.x = clamp(officer.x + (odx / od) * 260, 40, CITY.width - 40);
            officer.y = clamp(officer.y + (ody / od) * 260, 40, CITY.height - 40);
          }
          showMessage('Budi paid up! +Rp 25.000 — now lose the cops.', 4);
          return EVENT_PUNCH;
        }
        hit.fleeing = true;
        hit.fleeX = hit.x + (hit.x - player.x) * 4;
        hit.fleeY = hit.y + (hit.y - player.y) * 4;
        addWanted(1);
        return EVENT_PUNCH;
      }
    }
    return 0;
  }

  function stepPlayerDriving(dt, input, actions) {
    const car = player.inCar;
    if (!car) return 0;
    const throttle = input.throttle();
    const steer = input.direction();
    if (throttle > 0) car.speed += CAR.accel * dt;
    else if (throttle < 0) {
      if (car.speed > 10) car.speed -= CAR.brake * dt;
      else car.speed = Math.max(-CAR.maxReverse, car.speed - CAR.reverseAccel * dt);
    }
    car.speed -= car.speed * CAR.drag * dt;
    if (input.handbrakeHeld()) car.speed -= car.speed * CAR.handbrakeDrag * dt;
    car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
    // A little steering even at low speed, so a stopped car can turn around.
    const steerFactor = clamp(Math.abs(car.speed) / 160, 0.2, 1) * (car.speed < 0 ? -1 : 1);
    car.angle += steer * CAR.steerRate * steerFactor * dt * (input.handbrakeHeld() ? 1.5 : 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const pos = { x: nx, y: ny };
    const blocked = city.collideCircle(pos, 26);
    if (blocked && Math.abs(car.speed) > 220) {
      damagePlayer(5);
      car.speed *= -0.25;
      player.x = car.x;
      player.y = car.y;
      return EVENT_CRASH;
    }
    if (blocked) car.speed *= 0.5;
    car.x = pos.x;
    car.y = pos.y;
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;

    // Running over a pedestrian is a crime.
    for (const ped of peds) {
      if (!ped.active || ped.down > 0) continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 36 && Math.abs(car.speed) > 60) {
        ped.down = 2.5; // knocked down, then walks away later
        addWanted(1);
        car.speed *= 0.8;
        return EVENT_HIT_PED;
      }
    }
    // Bumping traffic cars slows both.
    for (const other of cars) {
      if (!other.active || other === car || other.kind !== 'traffic') continue;
      const d = Math.hypot(other.x - car.x, other.y - car.y);
      if (d < 52 && Math.abs(car.speed) > 120) {
        car.speed *= 0.6;
        return EVENT_CRASH;
      }
    }
    if (actions & ACTION_ENTER) {
      car.speed = 0;
      player.inCar = null;
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
      city.collideCircle(player, PLAYER.radius);
    }
    return 0;
  }

  function stepMissions(dt) {
    const index = state.missionIndex;
    state.missionTimer -= dt;
    const t = state.missionTarget;
    const px = player.inCar ? player.inCar.x : player.x;
    const py = player.inCar ? player.inCar.y : player.y;
    const dist = Math.hypot(t.x - px, t.y - py);

    if (index === 0) {
      if (state.missionStage === 1 && dist < 80) return completeMission();
      if (state.missionTimer <= 0) return failMission('the delivery was late');
    } else if (index === 1) {
      const sedan = cars.find((c) => c.active && c.mission);
      if (player.inCar && player.inCar.mission) {
        setTarget(GARAGE.x + GARAGE.w / 2, GARAGE.y + GARAGE.h / 2, 'GARAGE — park it');
        // Distance to the garage itself, not the stale sedan marker.
        const gd = Math.hypot(GARAGE.x + GARAGE.w / 2 - px, GARAGE.y + GARAGE.h / 2 - py);
        if (gd < 90) return completeMission();
      } else if (!sedan) {
        setupMission(); // sedan lost somehow; respawn it
      }
      if (state.missionTimer <= 0) return failMission('the sedan got away');
    } else if (index === 2) {
      state.surviveTimer += dt;
      if (dist < 90) return completeMission();
      if (state.surviveTimer >= 45) return completeMission();
      if (state.missionTimer <= 0) return failMission('you did not last');
    } else if (index === 3) {
      if (state.missionStage === 1 && state.wanted === 0) return completeMission();
      if (state.missionTimer <= 0) return failMission('the cops caught up');
    } else if (index === 4) {
      if (dist < 90) {
        const events = completeMission();
        return events | EVENT_VICTORY;
      }
      if (state.missionTimer <= 0) return failMission('the bridge closed');
    }
    return 0;
  }

  /**
   * One fixed step. `input` is the keyboard state (null on the title backdrop).
   * `actions` are the one-shot presses taken this frame (0 on later sub-steps).
   * With `harmless` set, traffic and pedestrians move but nothing scores and no
   * crime happens — the title screen's living city.
   */
  function step(dt, input, actions, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    stepTraffic(dt);
    stepPeds(dt);
    if (harmless) return 0;

    if (player.inCar) events |= stepPlayerDriving(dt, input, actions);
    else events |= stepPlayerOnFoot(dt, input, actions);
    events |= stepPolice(dt);

    // Wanted decay: -1 per calm stretch with no police in sight.
    if (state.wanted > 0) {
      const px = player.inCar ? player.inCar.x : player.x;
      const py = player.inCar ? player.inCar.y : player.y;
      let policeNear = false;
      for (const car of policeCars) {
        if (car.active && Math.hypot(car.x - px, car.y - py) < WANTED.decayDistance) policeNear = true;
      }
      for (const officer of officers) {
        if (officer.active && Math.hypot(officer.x - px, officer.y - py) < WANTED.decayDistance) policeNear = true;
      }
      if (!policeNear) {
        state.calmTimer += dt;
        if (state.calmTimer >= WANTED.decaySeconds) {
          state.wanted -= 1;
          state.calmTimer = 0;
          showMessage('The heat is off — wanted level down.', 3);
        }
      } else {
        state.calmTimer = 0;
      }
    }

    // Health regen when calm.
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.regenDelay = Math.max(0, player.regenDelay - dt);
    if (state.wanted === 0 && player.regenDelay === 0 && player.health < PLAYER.health) {
      player.health = Math.min(PLAYER.health, player.health + PLAYER.regenPerSecond * dt);
    }
    if (player.health <= 0) {
      events |= EVENT_WASTED;
      return events;
    }

    if (!state.missionDone) events |= stepMissions(dt);
    return events;
  }

  /** Advance to the next mission after one completes; returns true on victory. */
  function advanceMission() {
    state.missionDone = false;
    if (state.missionIndex >= MISSIONS.length - 1) return true;
    state.missionIndex += 1;
    setupMission();
    return false;
  }

  function applyBusted() {
    const lost = respawn(true);
    showMessage(`BUSTED! The cops took Rp ${lost.toLocaleString('en-US').replace(/,/g, '.')}.`, 4);
    return EVENT_BUSTED;
  }

  function applyWasted() {
    const lost = respawn(false);
    showMessage(`WASTED! You lost Rp ${lost.toLocaleString('en-US').replace(/,/g, '.')}.`, 4);
    return EVENT_WASTED;
  }

  reset();
  return { state, reset, step, setupMission, advanceMission, applyBusted, applyWasted, showMessage };
}
