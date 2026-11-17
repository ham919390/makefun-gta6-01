// Solmar Bay's hand-in program (Node 22, standard library only). The game lives
// in this directory's game/ folder — plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library, no network request) —
// and this program hands it in: it copies game/ and the screenshots beside this
// file to /output and writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library.
//
// Play it locally first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Screenshots: only PNG/JPEG files are copied out of screenshots/ (its PENDING.txt
// note never reaches the output). While screenshots/ holds no image yet, the
// library cannot build a dossier — as it should — so this program writes a plain
// placeholder dossier.json that says so, and warns loudly on stderr; the moment
// real screenshots are in place it writes the real dossier exactly as the kit's
// starter program does, byte for byte what the gate rebuilds.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const IMAGE_NAME = /\.(png|jpe?g)$/i;

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });

let shotCount = 0;
const shotsHere = join(here, 'screenshots');
if (existsSync(shotsHere)) {
  for (const name of readdirSync(shotsHere)) {
    if (!IMAGE_NAME.test(name)) continue;
    cpSync(join(shotsHere, name), join(out, 'screenshots', name));
    shotCount += 1;
  }
}

if (shotCount > 0) {
  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
  // bytes; the others refuse an entry the scorer would refuse (more than 4
  // screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
  // game files in all, or a path under game/ over 1000 bytes: game/ counts beside
  // /output's own 1000-entry cap, its screenshots/ and dossier.json).
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      game_max_files: 993,
      game_max_bytes: 50331648,
      game_path_max_bytes: 1000,
    }),
  );
} else {
  writeFileSync(
    join(out, 'dossier.json'),
    '{"schema":"makefun/dossier/v1","cover":0,"text":"Screenshots pending: no PNG or JPEG in screenshots/ yet, so no dossier could be built. Capture the scenes in shots.json from the running game and run this program again.","images":[]}\n',
  );
  console.error('WARNING: screenshots/ holds no PNG or JPEG screenshot yet: wrote a placeholder dossier.json. The entry is NOT submittable until 3 or 4 real screenshots of the game are in screenshots/ (see screenshots/PENDING.txt).');
}
