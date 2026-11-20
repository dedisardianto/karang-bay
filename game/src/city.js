// KARANG BAY's map: a seeded city grid. Roads run on fixed centrelines; the blocks
// between them hold buildings (Kampung dense, Perumahan suburban, Pelabuhan docks),
// the Pasar plaza and the park stay open, and the south edge is the harbour water.
// The road graph (intersections + neighbours) is what traffic AI drives on.
import { CITY, PALETTE, ROADS } from './config.js';

const WATER_TOP = 2130; // south of this line is the harbour water
const BRIDGE_X = 1600; // the Jembatan road leaves the city north along x = 1600
const BRIDGE_HALF = 46;

export const DISTRICTS = [
  { name: 'PELABUHAN', x: 700, y: 2190, w: 900, h: 120 },
  { name: 'PASAR', x: 1300, y: 700, w: 600, h: 500 },
  { name: 'KAMPUNG', x: 120, y: 1100, w: 700, h: 800 },
  { name: 'PERUMAHAN', x: 2350, y: 500, w: 700, h: 900 },
  { name: 'JEMBATAN', x: 1450, y: 60, w: 300, h: 160 },
];

export const PLAZA = { x: 1330, y: 700, w: 540, h: 500 }; // Pasar market square
export const PARK = { x: 700, y: 1250, w: 420, h: 380 }; // the park (mission 4)
export const GARAGE = { x: 560, y: 1560, w: 130, h: 90 }; // Kampung garage (mission 2)
export const HIDEOUT = { x: 2720, y: 330, w: 120, h: 80 }; // mission 3 hideout
export const DOCK = { x: 1560, y: 2050, w: 80, h: 60 }; // Pelabuhan delivery dock

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inOpenArea(rect) {
  return overlaps(rect, PLAZA) || overlaps(rect, PARK) || overlaps(rect, GARAGE) || overlaps(rect, HIDEOUT);
}

export function createCity(random) {
  const buildings = [];
  const roofColors = [PALETTE.roof, PALETTE.roof2, PALETTE.building2, PALETTE.building3];
  const wallColors = [PALETTE.building, PALETTE.building2, PALETTE.building3];

  // Blocks between neighbouring roads, inset by the sidewalk.
  const xs = [0, ...ROADS.vertical, CITY.width];
  const ys = [0, ...ROADS.horizontal, CITY.height];
  for (let bx = 0; bx < xs.length - 1; bx += 1) {
    for (let by = 0; by < ys.length - 1; by += 1) {
      const block = {
        x: xs[bx] + ROADS.width / 2 + ROADS.sidewalk,
        y: ys[by] + ROADS.width / 2 + ROADS.sidewalk,
        w: xs[bx + 1] - xs[bx] - ROADS.width - ROADS.sidewalk * 2,
        h: ys[by + 1] - ys[by] - ROADS.width - ROADS.sidewalk * 2,
      };
      if (block.w < 60 || block.h < 60) continue;
      if (block.y + block.h > WATER_TOP) continue; // harbour water, no buildings
      // The north strip above the first road is the bridge approach: keep it open.
      if (block.y < 60) continue;
      const dense = block.x < 1100; // Kampung: many small buildings
      const cols = dense ? 3 : 2;
      const rows = dense ? 3 : 2;
      const cellW = block.w / cols;
      const cellH = block.h / rows;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if (random() < 0.14) continue; // a yard, not a building
          const pad = 12 + random() * 10;
          const rect = {
            x: block.x + cx * cellW + pad,
            y: block.y + cy * cellH + pad,
            w: cellW - pad * 2,
            h: cellH - pad * 2,
          };
          if (rect.w < 40 || rect.h < 40) continue;
          if (inOpenArea(rect)) continue;
          buildings.push({
            ...rect,
            wall: wallColors[Math.floor(random() * wallColors.length)],
            roof: roofColors[Math.floor(random() * roofColors.length)],
          });
        }
      }
    }
  }

  // Road graph: every intersection, with its neighbours along the roads.
  const nodes = [];
  const nodeAt = new Map();
  for (const x of ROADS.vertical) {
    for (const y of ROADS.horizontal) {
      const node = { x, y, neighbours: [] };
      nodes.push(node);
      nodeAt.set(`${x},${y}`, node);
    }
  }
  for (const node of nodes) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = node.x + dx * 600;
      const ny = node.y + dy * 550;
      const other = nodeAt.get(`${nx},${ny}`);
      if (other) node.neighbours.push(other);
    }
  }
  // Vertical roads are 600 apart, horizontal 550 apart — rebuild neighbours by exact grid steps.
  for (const node of nodes) {
    node.neighbours = [];
    const xi = ROADS.vertical.indexOf(node.x);
    const yi = ROADS.horizontal.indexOf(node.y);
    if (xi > 0) node.neighbours.push(nodeAt.get(`${ROADS.vertical[xi - 1]},${node.y}`));
    if (xi < ROADS.vertical.length - 1) node.neighbours.push(nodeAt.get(`${ROADS.vertical[xi + 1]},${node.y}`));
    if (yi > 0) node.neighbours.push(nodeAt.get(`${node.x},${ROADS.horizontal[yi - 1]}`));
    if (yi < ROADS.horizontal.length - 1) node.neighbours.push(nodeAt.get(`${node.x},${ROADS.horizontal[yi + 1]}`));
  }

  function onRoad(x, y) {
    if (Math.abs(x - BRIDGE_X) < BRIDGE_HALF && y < ROADS.horizontal[0]) return true;
    for (const vx of ROADS.vertical) if (Math.abs(x - vx) < ROADS.width / 2) return true;
    for (const hy of ROADS.horizontal) if (Math.abs(y - hy) < ROADS.width / 2) return true;
    return false;
  }

  function isWater(x, y) {
    if (y > WATER_TOP) return Math.abs(x - BRIDGE_X) >= BRIDGE_HALF;
    if (y < 120 && Math.abs(x - BRIDGE_X) >= BRIDGE_HALF) return true; // river band north, bridge crosses it
    return false;
  }

  function buildingAt(x, y, radius) {
    for (const b of buildings) {
      if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
    }
    return null;
  }

  /** Push a circle out of buildings and water; returns true when it was blocked. */
  function collideCircle(pos, radius) {
    let blocked = false;
    const b = buildingAt(pos.x, pos.y, radius);
    if (b) {
      const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < radius) {
        pos.x = cx + (dx / d) * radius;
        pos.y = cy + (dy / d) * radius;
        blocked = true;
      }
    }
    if (isWater(pos.x, pos.y)) {
      // Step back toward the city: water is only at the south edge and the north river band.
      if (pos.y > WATER_TOP) pos.y = WATER_TOP - radius;
      else if (pos.y < 120) pos.y = 120 + radius;
      blocked = true;
    }
    pos.x = Math.max(radius, Math.min(CITY.width - radius, pos.x));
    pos.y = Math.max(radius, Math.min(CITY.height - radius, pos.y));
    return blocked;
  }

  function nearestNode(x, y) {
    let best = nodes[0];
    let bestD = Infinity;
    for (const node of nodes) {
      const d = (node.x - x) ** 2 + (node.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = node;
      }
    }
    return best;
  }

  return { buildings, nodes, onRoad, isWater, buildingAt, collideCircle, nearestNode, waterTop: WATER_TOP };
}
