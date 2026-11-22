// KARANG BAY — Canvas 2D rendering.
// Draws the city, cars, pedestrians, police, the HUD, the minimap and the
// title / pause / busted / wasted / victory screens. Flat colours, chunky
// shapes, all art drawn in code.

const Render = {
  cam: { x: 0, y: 0 },

  draw(ctx, screen) {
    const p = World.player;
    // Camera follows the player, clamped to the world.
    const vw = CFG.VIEW_W;
    const vh = CFG.VIEW_H;
    this.cam.x = clamp(p.x - vw / 2, 0, CFG.WORLD_W - vw);
    this.cam.y = clamp(p.y - vh / 2, 0, CFG.WORLD_H - vh);
    const cx = this.cam.x;
    const cy = this.cam.y;

    ctx.clearRect(0, 0, vw, vh);
    this.drawCity(ctx, cx, cy);
    this.drawMarker(ctx, cx, cy);
    this.drawCars(ctx, cx, cy);
    this.drawPeds(ctx, cx, cy);
    this.drawOfficers(ctx, cx, cy);
    this.drawDebtor(ctx, cx, cy);
    this.drawPlayer(ctx, cx, cy);
    if (screen === 'play' || screen === 'pause') {
      this.drawHud(ctx);
      this.drawMinimap(ctx);
      this.drawMessage(ctx);
    }
    if (screen === 'title') this.drawTitle(ctx);
    if (screen === 'pause') this.drawPanel(ctx, 'PAUSED', 'Press P or ESC to keep playing.');
    if (screen === 'busted') this.drawPanel(ctx, 'BUSTED!', 'The police caught Rian. Cash lost — the mission restarts.\nPress ENTER to continue.');
    if (screen === 'wasted') this.drawPanel(ctx, 'WASTED!', 'Rian was knocked out. The mission restarts.\nPress ENTER to continue.');
    if (screen === 'victory') this.drawVictory(ctx);
  },

  // ---- city ---------------------------------------------------------------

  drawCity(ctx, cx, cy) {
    const vw = CFG.VIEW_W;
    const vh = CFG.VIEW_H;
    // Base ground.
    ctx.fillStyle = '#5a5148';
    ctx.fillRect(0, 0, vw, vh);
    // Water.
    ctx.fillStyle = CFG.COLORS.water;
    for (const w of City.water) {
      ctx.fillRect(w.x - cx, w.y - cy, w.w, w.h);
    }
    ctx.fillStyle = CFG.COLORS.waterDeep;
    for (const w of City.water) {
      for (let i = 0; i < 5; i++) {
        const wy = w.y + 24 + i * 52;
        if (wy < w.y + w.h - 8) ctx.fillRect(w.x - cx, wy - cy, w.w, 3);
      }
    }
    // Park and market plaza ground.
    ctx.fillStyle = CFG.COLORS.park;
    ctx.fillRect(City.park.x - cx, City.park.y - cy, City.park.w, City.park.h);
    ctx.fillStyle = CFG.COLORS.plaza;
    ctx.fillRect(City.plaza.x - cx, City.plaza.y - cy, City.plaza.w, City.plaza.h);
    // Piers.
    ctx.fillStyle = CFG.COLORS.pier;
    for (const g of City.ground) {
      ctx.fillRect(g.x - cx, g.y - cy, g.w, g.h);
    }
    // Roads.
    for (const r of City.roads) {
      ctx.fillStyle = r.axis === 'v' && r.y === 0 ? CFG.COLORS.bridge : CFG.COLORS.road;
      ctx.fillRect(r.x - cx, r.y - cy, r.w, r.h);
    }
    // Road centre dashes.
    ctx.fillStyle = CFG.COLORS.roadLine;
    for (const r of City.roads) {
      if (r.axis === 'v') {
        const x = r.x + r.w / 2 - 2 - cx;
        for (let y = r.y + 14; y < r.y + r.h - 14; y += 46) {
          ctx.fillRect(x, y - cy, 4, 24);
        }
      } else {
        const y = r.y + r.h / 2 - 2 - cy;
        for (let x = r.x + 14; x < r.x + r.w - 14; x += 46) {
          ctx.fillRect(x - cx, y, 24, 4);
        }
      }
    }
    // Buildings.
    for (const b of City.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - cx, b.y - cy, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5 - cx, b.y + 5 - cy, b.w - 10, Math.min(18, b.h - 10));
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x - cx, b.y + b.h - 6 - cy, b.w, 6);
      if (b.garage) {
        ctx.fillStyle = '#20242c';
        ctx.fillRect(b.x + 18 - cx, b.y + b.h - 26 - cy, 44, 26);
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('GARAGE', b.x + 70 - cx, b.y + b.h - 8 - cy);
      }
    }
    // Market stalls.
    for (const s of City.stalls) {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x - cx, s.y - cy, s.w, s.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(s.x + 4 - cx, s.y + 4 - cy, s.w - 8, 10);
    }
    // Trees.
    for (const t of City.trees) {
      ctx.fillStyle = '#2f6a33';
      ctx.beginPath();
      ctx.arc(t.x - cx, t.y - cy, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c8a4d';
      ctx.beginPath();
      ctx.arc(t.x - 3 - cx, t.y - 3 - cy, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // District labels.
    ctx.fillStyle = 'rgba(245, 240, 220, 0.5)';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    for (const d of CFG.DISTRICTS) {
      ctx.fillText(d.name, d.labelX - cx, d.labelY - cy);
    }
    ctx.textAlign = 'left';
  },

  // ---- marker -------------------------------------------------------------

  drawMarker(ctx, cx, cy) {
    const m = World.mission;
    if (!m || !m.target) return;
    const t = m.target;
    const pulse = 1 + 0.18 * Math.sin(World.time * 4);
    const x = t.x - cx;
    const y = t.y - cy;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = CFG.COLORS.marker;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#20242c';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // A light beam so the marker reads from far away.
    ctx.fillStyle = 'rgba(255, 210, 63, 0.14)';
    ctx.fillRect(x - 3, y - 260, 6, 260);
  },

  // ---- entities -----------------------------------------------------------

  drawCarShape(ctx, x, y, angle, color, police, marked) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-19, -11, 38, 24);
    ctx.fillStyle = color;
    ctx.fillRect(-20, -12, 40, 24);
    ctx.fillStyle = 'rgba(20,24,32,0.85)';
    ctx.fillRect(-4, -10, 12, 20);
    ctx.fillStyle = color;
    ctx.fillRect(8, -11, 8, 22);
    if (police) {
      const on = Math.floor(World.time * 4) % 2 === 0;
      ctx.fillStyle = on ? '#ff3b30' : '#3f8ae8';
      ctx.fillRect(-12, -12, 10, 5);
      ctx.fillStyle = on ? '#3f8ae8' : '#ff3b30';
      ctx.fillRect(-12, 7, 10, 5);
    }
    if (marked) {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.strokeRect(-24, -16, 48, 32);
    }
    ctx.restore();
  },

  drawCars(ctx, cx, cy) {
    for (const car of World.cars) {
      this.drawCarShape(ctx, car.x - cx, car.y - cy, car.angle, car.color, car.police, car.marked);
    }
  },

  drawPeds(ctx, cx, cy) {
    for (const ped of World.peds) {
      const x = ped.x - cx;
      const y = ped.y - cy;
      if (ped.down > 0) {
        ctx.fillStyle = '#8a8a92';
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 6, ped.angle, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20242c';
      ctx.beginPath();
      ctx.arc(x + Math.cos(ped.angle) * 3, y + Math.sin(ped.angle) * 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawOfficers(ctx, cx, cy) {
    for (const o of World.officers) {
      const x = o.x - cx;
      const y = o.y - cy;
      ctx.fillStyle = '#1d3a6e';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe6f2';
      ctx.fillRect(x - 7, y - 13, 14, 4);
    }
  },

  drawDebtor(ctx, cx, cy) {
    const d = World.debtor;
    if (!d || !World.mission || World.mission.index !== 3) return;
    const x = d.x - cx;
    const y = d.y - cy;
    ctx.fillStyle = '#7ab87a';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    if (!d.paid) {
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', x, y - 16);
      ctx.textAlign = 'left';
    }
  },

  drawPlayer(ctx, cx, cy) {
    const p = World.player;
    if (!p.onFoot) return; // the car is drawn with the other cars
    const x = p.x - cx;
    const y = p.y - cy;
    ctx.fillStyle = CFG.COLORS.player;
    ctx.beginPath();
    ctx.arc(x, y, CFG.PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#20242c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, CFG.PLAYER_R, 0, Math.PI * 2);
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#20242c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(p.angle) * 18, y + Math.sin(p.angle) * 18);
    ctx.stroke();
    // Punch swing.
    if (p.punchTimer > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 26, p.angle - CFG.PUNCH_ARC, p.angle + CFG.PUNCH_ARC);
      ctx.stroke();
    }
  },

  // ---- HUD ----------------------------------------------------------------

  drawHud(ctx) {
    const vw = CFG.VIEW_W;
    const p = World.player;
    // Top-left panel: health + cash.
    ctx.fillStyle = CFG.COLORS.hudBg;
    ctx.fillRect(12, 12, 250, 64);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = 'bold 15px monospace';
    ctx.fillText('RIAN', 24, 34);
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(24, 44, 180, 12);
    ctx.fillStyle = p.health > 30 ? '#4fae5a' : '#e84a3f';
    ctx.fillRect(24, 44, 180 * (p.health / CFG.MAX_HEALTH), 12);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = 'bold 17px monospace';
    ctx.fillText(formatRp(World.cash), 24, 70);
    // Wanted stars, top centre.
    ctx.fillStyle = CFG.COLORS.hudBg;
    ctx.fillRect(vw / 2 - 110, 12, 220, 40);
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < CFG.WANTED_MAX; i++) {
      ctx.fillStyle = i < World.wanted ? CFG.COLORS.star : CFG.COLORS.starEmpty;
      ctx.fillText('★', vw / 2 - 80 + i * 40, 42);
    }
    ctx.textAlign = 'left';
    // Objective line, bottom-left.
    const m = World.mission;
    if (m) {
      ctx.fillStyle = CFG.COLORS.hudBg;
      const line = (m.index + 1) + '/5 ' + m.name + ' — ' + (m.target ? m.target.label : m.brief);
      ctx.font = 'bold 15px monospace';
      const w = Math.min(vw - 24, ctx.measureText(line).width + 24);
      ctx.fillRect(12, CFG.VIEW_H - 66, w, 54);
      ctx.fillStyle = CFG.COLORS.hudText;
      ctx.fillText(line, 24, CFG.VIEW_H - 44);
      if (m.timer > 0) {
        ctx.fillStyle = m.timer < 15 ? '#ff6a5a' : CFG.COLORS.hudText;
        ctx.font = 'bold 17px monospace';
        ctx.fillText('⏱ ' + formatTime(m.timer), 24, CFG.VIEW_H - 22);
      }
    }
    // Speed, bottom-right, while driving.
    if (!p.onFoot && p.car) {
      ctx.fillStyle = CFG.COLORS.hudBg;
      ctx.fillRect(vw - 132, CFG.VIEW_H - 66, 120, 54);
      ctx.fillStyle = CFG.COLORS.hudText;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.36) + ' km/h', vw - 24, CFG.VIEW_H - 30);
      ctx.textAlign = 'left';
    }
  },

  drawMinimap(ctx) {
    const vw = CFG.VIEW_W;
    const mw = 210;
    const mh = 158;
    const mx = vw - mw - 12;
    const my = 64;
    const sx = mw / CFG.WORLD_W;
    const sy = mh / CFG.WORLD_H;
    ctx.fillStyle = CFG.COLORS.hudBg;
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.fillStyle = '#1d2f38';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = CFG.COLORS.water;
    ctx.fillRect(mx, my, mw, CFG.RIVER_Y * sy);
    ctx.fillRect(mx, my + CFG.HARBOUR_Y * sy, mw, (CFG.WORLD_H - CFG.HARBOUR_Y) * sy);
    ctx.strokeStyle = '#8a8a92';
    ctx.lineWidth = 1;
    for (const r of City.roads) {
      ctx.strokeRect(mx + r.x * sx, my + r.y * sy, Math.max(1, r.w * sx), Math.max(1, r.h * sy));
    }
    const m = World.mission;
    if (m && m.target) {
      ctx.fillStyle = CFG.COLORS.marker;
      ctx.beginPath();
      ctx.arc(mx + m.target.x * sx, my + m.target.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of World.cars) {
      if (!car.police) continue;
      ctx.fillStyle = '#5a9ae8';
      ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
    }
    const p = World.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CFG.COLORS.player;
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  },

  drawMessage(ctx) {
    if (!World.message) return;
    ctx.font = 'bold 16px monospace';
    const w = ctx.measureText(World.message).width + 28;
    const x = (CFG.VIEW_W - w) / 2;
    ctx.fillStyle = CFG.COLORS.hudBg;
    ctx.fillRect(x, 64, w, 34);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.textAlign = 'center';
    ctx.fillText(World.message, CFG.VIEW_W / 2, 87);
    ctx.textAlign = 'left';
  },

  // ---- screens ------------------------------------------------------------

  drawPanel(ctx, title, body) {
    const vw = CFG.VIEW_W;
    const vh = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.66)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = CFG.COLORS.hudBg;
    ctx.fillRect(vw / 2 - 320, vh / 2 - 90, 640, 180);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, vw / 2, vh / 2 - 18);
    ctx.font = '16px monospace';
    const lines = body.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, vw / 2, vh / 2 + 22 + i * 24);
    });
    ctx.textAlign = 'left';
  },

  drawTitle(ctx) {
    const vw = CFG.VIEW_W;
    const vh = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KARANG BAY', vw / 2, 170);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('An open-world crime story from the harbour city', vw / 2, 210);
    ctx.font = '16px monospace';
    const story = [
      'Rian is a young courier. He owes a debt to Pak Darma, the fixer,',
      'and the only way out is five jobs across Karang Bay.',
      'Steal cars. Outrun the police. Deliver, collect, escape.',
    ];
    story.forEach((line, i) => ctx.fillText(line, vw / 2, 258 + i * 24));
    ctx.font = 'bold 15px monospace';
    const controls = [
      'WASD / Arrows — walk & drive    SHIFT — run',
      'E — enter / exit a car          SPACE — punch / handbrake',
      'M — mute    P / ESC — pause    R — restart mission',
    ];
    controls.forEach((line, i) => ctx.fillText(line, vw / 2, 360 + i * 24));
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px monospace';
    const save = Main.saveExists();
    ctx.fillText(save ? 'Press ENTER to continue — or C for a new game' : 'Press ENTER to start', vw / 2, 470);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = '13px monospace';
    ctx.fillText('Best cash: ' + formatRp(World.bestCash) + '   ·   Missions: ' + World.missionIndex + '/5 done', vw / 2, 510);
    ctx.textAlign = 'left';
  },

  drawVictory(ctx) {
    const vw = CFG.VIEW_W;
    const vh = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEBT PAID. FREE.', vw / 2, 220);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = '20px monospace';
    ctx.fillText('Rian crossed the Jembatan and left Karang Bay behind.', vw / 2, 268);
    ctx.font = 'bold 24px monospace';
    ctx.fillText('Total cash: ' + formatRp(World.cash), vw / 2, 330);
    ctx.font = '16px monospace';
    ctx.fillText('Best cash: ' + formatRp(World.bestCash), vw / 2, 366);
    ctx.fillText('Busted: ' + World.stats.busted + '   ·   Wasted: ' + World.stats.wasted +
      '   ·   Cars stolen: ' + World.stats.carsStolen, vw / 2, 398);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press ENTER to play again', vw / 2, 460);
    ctx.textAlign = 'left';
  },
};
