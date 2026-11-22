// KARANG BAY — entrypoint for the make.fun "Make GTA 6" bounty.
// Copies game/ and screenshots/ into the output directory and writes the
// dossier (makefun/dossier/v1) from them with the bounty library.
// Runs on Node 22 as-is: `node main.ts`. The output directory comes from
// MAKEFUN_OUTPUT_DIR, or /output when it is not set.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// A clean output directory every run, so the two grading runs agree.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The dossier is deterministic: the same game writes the same bytes.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`KARANG BAY: wrote ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
