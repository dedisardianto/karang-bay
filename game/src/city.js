// Seeded city generation for Karang Bay.
// One seed builds the same city every time: a road grid, building blocks,
// the north river with its bridge, the south harbour, a market square and a
// park. All collision queries live here too.

const City = {
  roads: [], // {x, y, w, h, axis} — axis 'v' or 'h'
  water: [], // {x, y, w, h}
  ground: [], // walkable rects that override water (piers)
  buildings: [], // {x, y, w, h, color, roof}
  stalls: [], // market stalls (small, solid)
  trees: [], // {x, y, r} — decoration only, never solid
  plaza: null, // market square rect
  park: null, // park rect
  seed: 1,

  build(seed) {
    this.seed = seed;
    const rng = makeRng(seed);
    this.roads = [];
    this.water = [];
    this.ground = [];
    this.buildings = [];
    this.stalls = [];
    this.trees = [];

    const H = CFG.ROAD_HALF;
    const W = CFG.WORLD_W;
    const Hh = CFG.WORLD_H;

    // Water: north river and south harbour.
    this.water.push({ x: 0, y: 0, w: W, h: CFG.RIVER_Y });
    this.water.push({ x: 0, y: CFG.HARBOUR_Y, w: W, h: Hh - CFG.HARBOUR_Y });

    // Vertical roads run between river and harbour.
    for (const cx of CFG.V_ROADS) {
      this.roads.push({ x: cx - H, y: CFG.RIVER_Y, w: H * 2, h: CFG.HARBOUR_Y - CFG.RIVER_Y, axis: 'v' });
    }
    // Horizontal roads run the full width.
    for (const cy of CFG.H_ROADS) {
      this.roads.push({ x: 0, y: cy - H, w: W, h: H * 2, axis: 'h' });
    }
    // Bridge road across the river, up to the north exit.
    this.roads.push({ x: CFG.BRIDGE_X0, y: 0, w: CFG.BRIDGE_X1 - CFG.BRIDGE_X0, h: 350, axis: 'v' });

    // Piers reaching into the harbour (walkable).
    for (const px of [700, 1600, 2500]) {
      this.ground.push({ x: px - 26, y: CFG.HARBOUR_Y - 10, w: 52, h: 150 });
    }

    // Blocks between the roads.
    // Build column ranges explicitly: from the left edge to each road, between roads, to the right edge.
    const colRanges = [];
    let left = 14;
    for (const cx of CFG.V_ROADS) {
      colRanges.push([left, cx - H - 14]);
      left = cx + H + 14;
    }
    colRanges.push([left, W - 14]);

    const rowRanges = [];
    let top = CFG.RIVER_Y + 14;
    for (const cy of CFG.H_ROADS) {
      rowRanges.push([top, cy - H - 14]);
      top = cy + H + 14;
    }
    rowRanges.push([top, CFG.HARBOUR_Y - 14]);

    // Special blocks: market square and park.
    this.plaza = { x: 1036, y: 936, w: 528, h: 478 };
    this.park = { x: 2236, y: 936, w: 528, h: 478 };

    // Keep-clear circles: no building or stall may cover a mission point,
    // the sedan spot or a parked car, whatever the seed.
    const keepClear = Object.values(CFG.POINTS).map((p) => ({ x: p.x, y: p.y, r: 56 }));
    keepClear.push({ x: CFG.SEDAN_SPOT.x, y: CFG.SEDAN_SPOT.y, r: 64 });
    for (const s of CFG.PARKED_SPOTS) keepClear.push({ x: s.x, y: s.y, r: 46 });
    const hitsKeepClear = (x, y, w, h) => {
      for (const k of keepClear) {
        const nx = clamp(k.x, x, x + w);
        const ny = clamp(k.y, y, y + h);
        const dx = k.x - nx;
        const dy = k.y - ny;
        if (dx * dx + dy * dy < k.r * k.r) return true;
      }
      return false;
    };

    const isSpecial = (x0, y0, x1, y1) => {
      const inPlaza = x0 >= this.plaza.x - 1 && x1 <= this.plaza.x + this.plaza.w + 1 &&
        y0 >= this.plaza.y - 1 && y1 <= this.plaza.y + this.plaza.h + 1;
      const inPark = x0 >= this.park.x - 1 && x1 <= this.park.x + this.park.w + 1 &&
        y0 >= this.park.y - 1 && y1 <= this.park.y + this.park.h + 1;
      return inPlaza || inPark;
    };

    // The garage in Kampung: a fixed building with its door facing south.
    const garage = { x: 560, y: 600, w: 150, h: 60, color: '#d9c39a', roof: '#a4553f', garage: true };

    for (const [cx0, cx1] of colRanges) {
      for (const [cy0, cy1] of rowRanges) {
        if (isSpecial(cx0, cy0, cx1, cy1)) continue;
        const bw = cx1 - cx0;
        const bh = cy1 - cy0;
        if (bw < 90 || bh < 70) continue;
        // Split the block into cells and place at most one building per cell.
        const cellW = 230;
        const cellH = 190;
        for (let gx = cx0; gx + 90 < cx1; gx += cellW) {
          for (let gy = cy0; gy + 70 < cy1; gy += cellH) {
            if (!rng.chance(0.72)) continue;
            const w = rng.range(90, Math.min(200, cx1 - gx - 16));
            const h = rng.range(70, Math.min(150, cy1 - gy - 16));
            if (w < 80 || h < 60) continue;
            const bx = gx + rng.range(4, Math.max(5, cx1 - gx - w - 8));
            const by = gy + rng.range(4, Math.max(5, cy1 - gy - h - 8));
            // Keep the garage cell and the bridge corridor clear.
            const overlapsGarage = bx < garage.x + garage.w + 8 && bx + w > garage.x - 8 &&
              by < garage.y + garage.h + 8 && by + h > garage.y - 8;
            const inBridgeCorridor = by + h > 140 && by < 350 && bx + w > 1460 && bx < 1740;
            if (overlapsGarage || inBridgeCorridor) continue;
            if (hitsKeepClear(bx, by, w, h)) continue;
            this.buildings.push({
              x: bx, y: by, w, h,
              color: rng.pick(CFG.COLORS.building),
              roof: rng.pick(CFG.COLORS.buildingRoof),
            });
          }
        }
      }
    }
    this.buildings.push(garage);

    // Market stalls inside the plaza (two rows of small solid stalls).
    const stallSpots = [];
    for (let i = 0; i < 6; i++) {
      stallSpots.push({ x: 1090 + (i % 3) * 150, y: 1010 + Math.floor(i / 3) * 130, w: 96, h: 64 });
    }
    for (let i = 0; i < 4; i++) {
      stallSpots.push({ x: 1120 + (i % 2) * 220, y: 1330 + Math.floor(i / 2) * 110, w: 120, h: 60 });
    }
    for (const s of stallSpots) {
      if (hitsKeepClear(s.x, s.y, s.w, s.h)) continue;
      this.stalls.push({ x: s.x, y: s.y, w: s.w, h: s.h, color: rng.pick(['#c98a4a', '#7a9a5a', '#b85a5a']) });
    }

    // Trees: park, plaza edges and random sidewalk spots.
    for (let i = 0; i < 26; i++) {
      this.trees.push({
        x: rng.range(this.park.x + 30, this.park.x + this.park.w - 30),
        y: rng.range(this.park.y + 30, this.park.y + this.park.h - 30),
        r: rng.range(9, 16),
      });
    }
    for (let i = 0; i < 30; i++) {
      const x = rng.range(30, W - 30);
      const y = rng.range(CFG.RIVER_Y + 30, CFG.HARBOUR_Y - 30);
      if (this.onRoad(x, y)) continue;
      this.trees.push({ x, y, r: rng.range(7, 12) });
    }
  },

  // Is a point on a road rect?
  onRoad(x, y) {
    for (const r of this.roads) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  },

  // Is a point on a walkable pier?
  onGround(x, y) {
    for (const g of this.ground) {
      if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return true;
    }
    return false;
  },

  // Is a point in water (roads and piers override it)?
  inWater(x, y) {
    if (this.onRoad(x, y) || this.onGround(x, y)) return false;
    for (const w of this.water) {
      if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
    }
    return false;
  },

  // Does a circle at (x, y) with radius r hit a solid (building, stall or water)?
  collides(x, y, r) {
    if (this.inWater(x, y)) return true;
    for (const b of this.buildings) {
      if (this.circleRect(x, y, r, b)) return true;
    }
    for (const s of this.stalls) {
      if (this.circleRect(x, y, r, s)) return true;
    }
    return false;
  },

  // Circle vs axis-aligned rect overlap.
  circleRect(cx, cy, r, rect) {
    const nx = clamp(cx, rect.x, rect.x + rect.w);
    const ny = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  },

  // Move a circle by (dx, dy) with sliding: try full move, then x-only, then y-only.
  resolveMove(x, y, dx, dy, r) {
    let nx = x + dx;
    let ny = y + dy;
    let hit = false;
    if (!this.collides(nx, ny, r)) return { x: nx, y: ny, hit: false };
    if (!this.collides(nx, y, r)) return { x: nx, y, hit: true };
    if (!this.collides(x, ny, r)) return { x, y: ny, hit: true };
    return { x, y, hit: true };
  },

  // Road axis at a point: 'v', 'h', 'x' (intersection) or null (off-road).
  roadAxisAt(x, y) {
    let v = false;
    let h = false;
    for (const r of this.roads) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        if (r.axis === 'v') v = true;
        else h = true;
      }
    }
    if (v && h) return 'x';
    if (v) return 'v';
    if (h) return 'h';
    return null;
  },

  // A random point on a random road, for spawning traffic.
  randomRoadPoint(rng) {
    const road = rng.pick(this.roads);
    return {
      x: rng.range(road.x + 14, road.x + road.w - 14),
      y: rng.range(road.y + 14, road.y + road.h - 14),
      axis: road.axis,
    };
  },

  // A random point on land (not water, not inside a building), for pedestrians.
  randomLandPoint(rng) {
    for (let tries = 0; tries < 40; tries++) {
      const x = rng.range(60, CFG.WORLD_W - 60);
      const y = rng.range(CFG.RIVER_Y + 60, CFG.HARBOUR_Y - 60);
      if (!this.collides(x, y, 12) && !this.onRoad(x, y)) return { x, y };
    }
    return { x: 1300, y: 1180 };
  },
};
