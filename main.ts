// Neon Cover Studio — entrypoint for make.fun's gta6-cover-art-01 bounty.
//
// The app itself is plain static files in app/ (index.html plus its ES
// modules, the vendored Anton font and the two sample photos): a desktop
// browser opens it offline and exports GTA-style multi-panel covers as PNG.
// This program hands it in: it copies app/ and screenshots/ next to this
// file into the output directory and writes dossier.json with the kit's
// buildDossier helper from vendor/makefun-app.ts.
//
// Node 22, standard library only. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is unset and /output is used instead.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function copyIfPresent(name) {
  const from = join(repoRoot, name);
  if (existsSync(from)) copyTree(from, join(outputDir, name));
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
copyIfPresent('screenshots');

// Keep the output honest: refuse to hand in more screenshots than the gate
// allows, or one bigger than its cap, instead of writing a doomed dossier.
const shotDir = join(outputDir, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir) : [];
if (shots.length > 4) throw new Error(`too many screenshots: ${shots.length} (max 4)`);

// Caps from the scorer's reference (gate.json): the dossier text cap shapes
// the bytes; the rest refuse an entry the scorer would refuse.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
