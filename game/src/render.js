// Drawing only: the world's state and the current screen in, pixels out. A
// camera follows the player through the 3200x2400 city; the 1280x720 view is
// scaled to fit the window and centred. Flat colours and chunky shapes, all art
// drawn in code.
import { CAR, CITY, FIELD, FONT, MISSIONS, PALETTE, PLAYER, ROADS, formatRp } from './config.js';
import { DISTRICTS, GARAGE, HIDEOUT, PARK, PLAZA } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_MISSION = 'mission';
export const SCREEN_VICTORY = 'victory';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const MINIMAP = { x: FIELD.width - 216, y: FIELD.height - 168, w: 192, h: 144 };

function makeLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas, city) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const cam = { x: 1600, y: 1150 };
  const cashLabel = makeLabel('');
  const timerLabel = makeLabel('');
  const speedLabel = makeLabel('');
  const bestLabel = makeLabel('Best cash: ');
  const missionLabel = makeLabel('Mission ');
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function drawText(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function fillRect(x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  }

  function fillCircle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  function paintCity() {
    // Ground: grass everywhere, water south and in the north river band.
    fillRect(0, 0, CITY.width, CITY.height, PALETTE.grass);
    fillRect(0, city.waterTop, CITY.width, CITY.height - city.waterTop, PALETTE.water);
    fillRect(0, 0, CITY.width, 120, PALETTE.water);
    // Sand along the harbour edge.
    fillRect(0, city.waterTop - 18, CITY.width, 18, PALETTE.sand);
    // The bridge deck crosses the river band north.
    fillRect(1600 - 46, 0, 92, 400, PALETTE.road);
    fillRect(1600 - 52, 0, 6, 400, PALETTE.sidewalk);
    fillRect(1600 + 46, 0, 6, 400, PALETTE.sidewalk);

    // Roads.
    for (const x of ROADS.vertical) fillRect(x - ROADS.width / 2, 0, ROADS.width, CITY.height, PALETTE.road);
    for (const y of ROADS.horizontal) fillRect(0, y - ROADS.width / 2, CITY.width, ROADS.width, PALETTE.road);
    // Centre dashes.
    context.fillStyle = PALETTE.roadLine;
    for (const x of ROADS.vertical) {
      for (let y = 40; y < CITY.height; y += 90) context.fillRect(x - 3, y, 6, 44);
    }
    for (const y of ROADS.horizontal) {
      for (let x = 40; x < CITY.width; x += 90) context.fillRect(x, y - 3, 44, 6);
    }
    // Crosswalks at the Pasar intersection.
    context.fillStyle = PALETTE.sidewalk;
    for (let i = 0; i < 6; i += 1) {
      context.fillRect(1554 + i * 16, 950 - 46, 8, 92);
      context.fillRect(1600 - 46, 904 + i * 16, 92, 8);
    }
    // Pasar plaza and the park.
    fillRect(PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h, PALETTE.plaza);
    fillRect(PARK.x, PARK.y, PARK.w, PARK.h, PALETTE.park);
    // Market stalls.
    const stallColors = [PALETTE.market, '#e8b13f', '#7bc96f', '#b07fd6'];
    for (let i = 0; i < 10; i += 1) {
      const sx = PLAZA.x + 40 + (i % 5) * 100;
      const sy = PLAZA.y + 50 + Math.floor(i / 5) * 130;
      fillRect(sx, sy, 64, 44, stallColors[i % 4]);
      fillRect(sx + 6, sy + 6, 52, 12, '#fff3d6');
    }
    // Park trees.
    for (let i = 0; i < 12; i += 1) {
      const tx = PARK.x + 30 + ((i * 97) % (PARK.w - 60));
      const ty = PARK.y + 30 + ((i * 61) % (PARK.h - 60));
      fillCircle(tx, ty, 20, '#1f5c26');
      fillCircle(tx - 6, ty - 6, 12, '#2f7a37');
    }
    // Garage, hideout and dock.
    fillRect(GARAGE.x, GARAGE.y, GARAGE.w, GARAGE.h, '#5a5148');
    fillRect(GARAGE.x + 10, GARAGE.y + 10, GARAGE.w - 20, GARAGE.h - 20, '#8a8175');
    drawText('BENGKEL', GARAGE.x + GARAGE.w / 2, GARAGE.y + GARAGE.h + 22, 18, PALETTE.text, 'center');
    fillRect(HIDEOUT.x, HIDEOUT.y, HIDEOUT.w, HIDEOUT.h, '#6b4a2f');
    drawText('HIDEOUT', HIDEOUT.x + HIDEOUT.w / 2, HIDEOUT.y + HIDEOUT.h + 22, 18, PALETTE.text, 'center');
    fillRect(1560, 2050, 80, 90, '#6b4a2f');
    // Harbour boats.
    for (let i = 0; i < 5; i += 1) {
      const bx = 300 + i * 560;
      const by = city.waterTop + 90 + (i % 2) * 70;
      context.fillStyle = '#e8e8e8';
      context.beginPath();
      context.moveTo(bx, by);
      context.lineTo(bx + 120, by);
      context.lineTo(bx + 100, by + 34);
      context.lineTo(bx + 20, by + 34);
      context.closePath();
      context.fill();
      fillRect(bx + 48, by - 26, 24, 26, '#e07b39');
    }
    // Buildings: wall, roof inset, door.
    for (const b of city.buildings) {
      fillRect(b.x, b.y, b.w, b.h, b.wall);
      fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16, b.roof);
      fillRect(b.x + b.w / 2 - 10, b.y + b.h - 14, 20, 14, '#4a3a28');
    }
    // District labels.
    for (const d of DISTRICTS) {
      drawText(d.name, d.x + d.w / 2, d.y + d.h / 2, 34, 'rgba(242,240,230,0.85)', 'center', 'middle');
    }
  }

  function paintCar(x, y, angle, color, isPolice, time) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    // Body.
    context.fillStyle = color;
    context.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
    // Roof + windshield.
    context.fillStyle = 'rgba(20,30,44,0.85)';
    context.fillRect(-8, -CAR.width / 2 + 5, 26, CAR.width - 10);
    context.fillStyle = '#cfe8ff';
    context.fillRect(16, -CAR.width / 2 + 5, 8, CAR.width - 10);
    // Headlights.
    context.fillStyle = '#fff8c9';
    context.fillRect(CAR.length / 2 - 4, -CAR.width / 2 + 3, 4, 8);
    context.fillRect(CAR.length / 2 - 4, CAR.width / 2 - 11, 4, 8);
    if (isPolice) {
      const flash = Math.floor(time * 4) % 2 === 0;
      context.fillStyle = flash ? PALETTE.policeLight : PALETTE.policeLight2;
      context.fillRect(-6, -CAR.width / 2 + 4, 12, 8);
      context.fillStyle = flash ? PALETTE.policeLight2 : PALETTE.policeLight;
      context.fillRect(-6, CAR.width / 2 - 12, 12, 8);
    }
    context.restore();
  }

  function paintPed(ped, time) {
    const bob = Math.sin(time * 8 + ped.x * 0.05) * 2;
    fillCircle(ped.x, ped.y + bob, 11, ped.kind === 'debtor' ? '#e5534b' : PALETTE.ped);
    fillCircle(ped.x, ped.y - 4 + bob, 6, '#f2c9a0');
    if (ped.kind === 'debtor') {
      drawText('!', ped.x, ped.y - 20, 22, PALETTE.star, 'center');
    }
  }

  function paintMarker(state, time) {
    const t = state.missionTarget;
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    const r = 26 * pulse;
    context.save();
    context.translate(t.x, t.y);
    context.rotate(Math.PI / 4);
    context.strokeStyle = PALETTE.marker;
    context.lineWidth = 5;
    context.strokeRect(-r / 2, -r / 2, r, r);
    context.restore();
    // Beacon line up from the marker.
    context.strokeStyle = 'rgba(255,210,63,0.5)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(t.x, t.y);
    context.lineTo(t.x, t.y - 120 - Math.sin(time * 3) * 12);
    context.stroke();
    drawText(t.label, t.x, t.y - 140, 20, PALETTE.marker, 'center');
  }

  function paintWorld(state, time) {
    paintCity();
    // Mission target first, so it sits under the cars.
    if (!state.missionDone) paintMarker(state, time);
    for (const car of state.cars) {
      if (!car.active) continue;
      paintCar(car.x, car.y, car.angle, car.color, false, time);
      if (car.mission && car !== state.player.inCar) {
        context.strokeStyle = PALETTE.marker;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(car.x, car.y, 52, 0, Math.PI * 2);
        context.stroke();
      }
    }
    for (const car of state.policeCars) {
      if (!car.active) continue;
      paintCar(car.x, car.y, car.angle, PALETTE.police, true, time);
    }
    for (const officer of state.officers) {
      if (!officer.active) continue;
      fillCircle(officer.x, officer.y, 12, PALETTE.police);
      fillCircle(officer.x, officer.y - 4, 6, '#f2c9a0');
      drawText('POLISI', officer.x, officer.y - 22, 14, '#9db8ff', 'center');
    }
    for (const ped of state.peds) {
      if (!ped.active || ped.down > 0) continue;
      paintPed(ped, time);
    }
    const player = state.player;
    if (!player.inCar) {
      const blink = player.invulnerable === 0 || Math.floor(time * 10) % 2 === 0;
      if (blink) {
        fillCircle(player.x, player.y, PLAYER.radius, PALETTE.playerJacket);
        fillCircle(player.x + Math.cos(player.angle) * 6, player.y + Math.sin(player.angle) * 6, 6, '#f2c9a0');
        // Direction tick.
        context.strokeStyle = PALETTE.player;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(player.x, player.y);
        context.lineTo(player.x + Math.cos(player.angle) * 22, player.y + Math.sin(player.angle) * 22);
        context.stroke();
      }
    } else {
      paintCar(player.inCar.x, player.inCar.y, player.inCar.angle, player.inCar.color, false, time);
      context.strokeStyle = PALETTE.player;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(player.inCar.x, player.inCar.y, 44, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function paintMinimap(state) {
    const sx = MINIMAP.w / CITY.width;
    const sy = MINIMAP.h / CITY.height;
    context.save();
    context.translate(MINIMAP.x, MINIMAP.y);
    fillRect(0, 0, MINIMAP.w, MINIMAP.h, PALETTE.minimapBg);
    context.strokeStyle = PALETTE.minimapBg;
    context.lineWidth = 2;
    context.strokeRect(0, 0, MINIMAP.w, MINIMAP.h);
    // Water.
    context.fillStyle = PALETTE.water;
    context.fillRect(0, city.waterTop * sy, MINIMAP.w, MINIMAP.h - city.waterTop * sy);
    context.fillRect(0, 0, MINIMAP.w, 120 * sy);
    // Roads.
    context.fillStyle = '#5a6068';
    for (const x of ROADS.vertical) context.fillRect(x * sx - 1, 0, 2, MINIMAP.h);
    for (const y of ROADS.horizontal) context.fillRect(0, y * sy - 1, MINIMAP.w, 2);
    // Mission target.
    const t = state.missionTarget;
    fillCircle(t.x * sx, t.y * sy, 5, PALETTE.marker);
    // Police.
    for (const car of state.policeCars) {
      if (car.active) fillCircle(car.x * sx, car.y * sy, 3, PALETTE.markerPolice);
    }
    // Player.
    const px = state.player.inCar ? state.player.inCar.x : state.player.x;
    const py = state.player.inCar ? state.player.inCar.y : state.player.y;
    fillCircle(px * sx, py * sy, 5, '#ffffff');
    fillCircle(px * sx, py * sy, 3, PALETTE.player);
    // View box.
    context.strokeStyle = 'rgba(255,255,255,0.6)';
    context.lineWidth = 1;
    context.strokeRect(cam.x * sx - 640 * sx, cam.y * sy - 360 * sy, 1280 * sx, 720 * sy);
    context.restore();
  }

  function paintHud(state) {
    const player = state.player;
    // Top-left: health bar + cash.
    fillRect(16, 16, 220, 26, 'rgba(13,20,32,0.75)');
    fillRect(20, 20, 212 * Math.max(0, player.health / 100), 18, PALETTE.health);
    drawText(`HP ${Math.ceil(Math.max(0, player.health))}`, 232, 34, 20, PALETTE.text, 'left', 'middle');
    drawText(cashLabel(formatRp(state.cash)), 16, 66, 30, PALETTE.cash, 'left', 'middle');
    // Top-right: wanted stars.
    for (let i = 0; i < 5; i += 1) {
      drawText('★', FIELD.width - 24 - (4 - i) * 34, 40, 34, i < state.wanted ? PALETTE.star : 'rgba(185,192,201,0.4)', 'center', 'middle');
    }
    drawText('WANTED', FIELD.width - 24, 66, 16, PALETTE.muted, 'right', 'middle');
    // Mission line + timer, top centre.
    const mission = MISSIONS[state.missionIndex];
    drawText(missionLabel(`Mission ${state.missionIndex + 1}/5 — ${mission.name}`), FIELD.width / 2, 30, 22, PALETTE.text, 'center', 'middle');
    drawText(mission.brief, FIELD.width / 2, 56, 16, PALETTE.muted, 'center', 'middle');
    if (!state.missionDone && state.missionTimer > 0) {
      const seconds = Math.ceil(state.missionTimer);
      drawText(timerLabel(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`), FIELD.width / 2, 84, 26, seconds <= 15 ? PALETTE.danger : PALETTE.text, 'center', 'middle');
    }
    if (state.missionIndex === 2 && !state.missionDone) {
      drawText(`Survived ${Math.floor(state.surviveTimer)}s / 45s`, FIELD.width / 2, 112, 20, PALETTE.star, 'center', 'middle');
    }
    // Bottom-left: controls hint + speed.
    if (player.inCar) {
      const kmh = Math.round(Math.abs(player.inCar.speed) * 0.36);
      drawText(speedLabel(`${kmh} km/h`), 16, FIELD.height - 20, 26, PALETTE.text, 'left', 'middle');
      drawText('W/S drive · A/D steer · Space handbrake · E exit car', 16, FIELD.height - 48, 16, PALETTE.muted, 'left', 'middle');
    } else {
      drawText('WASD walk · Shift run · E enter car · Space punch · P pause', 16, FIELD.height - 20, 16, PALETTE.muted, 'left', 'middle');
    }
    // Message banner.
    if (state.messageTimer > 0) {
      context.textBaseline = 'middle';
      const w = Math.min(900, context.measureText(state.message).width + 40);
      fillRect((FIELD.width - w) / 2, 130, w, 44, 'rgba(13,20,32,0.85)');
      drawText(state.message, FIELD.width / 2, 152, 20, PALETTE.cash, 'center', 'middle');
    }
    paintMinimap(state);
  }

  function paintPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    drawText(title, FIELD.width / 2, y + 78, 46, accent || PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      drawText(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    drawText(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.cash, 'center');
  }

  /** Paint one frame: the world through the camera, then the HUD or a panel. */
  function draw(state, screen, best, panelData, time) {
    // Camera eases toward the player and stays inside the city.
    const px = state.player.inCar ? state.player.inCar.x : state.player.x;
    const py = state.player.inCar ? state.player.inCar.y : state.player.y;
    cam.x += (px - cam.x) * 0.12;
    cam.y += (py - cam.y) * 0.12;
    cam.x = Math.max(FIELD.width / 2, Math.min(CITY.width - FIELD.width / 2, cam.x));
    cam.y = Math.max(FIELD.height / 2, Math.min(CITY.height - FIELD.height / 2, cam.y));

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // World space: translate so the camera centre is the view centre.
    context.save();
    context.translate(FIELD.width / 2 - cam.x, FIELD.height / 2 - cam.y);
    paintWorld(state, time);
    context.restore();

    if (screen === SCREEN_TITLE) {
      paintPanel('KARANG BAY', [
        'Rian owes Pak Darma a debt. Five jobs. One city.',
        'Walk the streets, steal cars, outrun the police.',
        'WASD move · Shift run · E enter car · Space punch',
        'Drive: W gas · S brake · A/D steer · Space handbrake',
        `Best cash: ${formatRp(best)}${panelData && panelData.save ? `  ·  Saved run: Mission ${panelData.save.missionIndex + 1}, ${formatRp(panelData.save.cash)}` : ''}`,
        '',
      ], panelData && panelData.save ? 'Space — continue run · R — start fresh' : 'Press Space or click to start', PALETTE.cash);
      return;
    }
    paintHud(state);
    if (screen === SCREEN_PAUSED) {
      paintPanel('Paused', ['The city waits for you.'], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      paintPanel('BUSTED', ['The police caught Rian.', `Cash kept: ${formatRp(state.cash)}`, bestLabel(formatRp(best))], 'Press Space to try again', PALETTE.danger);
    } else if (screen === SCREEN_WASTED) {
      paintPanel('WASTED', ['Rian went down hard.', `Cash kept: ${formatRp(state.cash)}`, bestLabel(formatRp(best))], 'Press Space to try again', PALETTE.danger);
    } else if (screen === SCREEN_MISSION) {
      const mission = MISSIONS[panelData.missionIndex];
      paintPanel('Mission complete!', [`${mission.name} — ${formatRp(mission.reward)}`, `Total cash: ${formatRp(state.cash)}`, 'Pak Darma has another job for you.'], 'Press Space for the next mission', PALETTE.cash);
    } else if (screen === SCREEN_VICTORY) {
      paintPanel('OUT OF KARANG BAY!', ['Rian crossed the Jembatan — debt paid, city behind him.', `Final cash: ${formatRp(state.cash)}`, bestLabel(formatRp(best))], 'Press Space to play again', PALETTE.cash);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
