// Leonida Legend — entry program for make.fun's gta6-trophy-guide-01 bounty (Node 22, standard library only).
//
// What this program hands in is the guide itself: the static web app in app/ (open app/index.html in a browser;
// it loads nothing over the network) plus the maker's screenshots in screenshots/. Handing in means copying
// both into the output directory and writing dossier.json there — the summary the judge reads — with the
// vendored make.fun library, which must stay exactly as the kit issued it: the scorer rebuilds the dossier
// with its own copy and compares the two byte for byte.
//
// Run it the way the grader does, in a container with /output writable, or locally with MAKEFUN_OUTPUT_DIR
// standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// It writes the same bytes on every run: the copy is a plain recursive copy and buildDossier is deterministic.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the directory this file sits in; the output directory is /output under the grader
// and MAKEFUN_OUTPUT_DIR everywhere else.
const repoDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty, passed to the dossier builder unchanged: the guide's text is capped at
// 160 KiB inside the dossier, at most 4 screenshots of at most 256 KiB each, and app/ may hold at most 993
// files and directories totalling at most 48 MiB (it shares the output directory's own entry budget with
// screenshots/ and dossier.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

// Copy one directory of the entry (app/ or screenshots/) into the output directory.
function copyEntryDirectory(name: string): void {
  const from = join(repoDir, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyEntryDirectory('app');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyEntryDirectory('screenshots');

// The dossier is built from what now sits in the output directory, never from the repository directly, so
// what is judged is exactly what was handed in.
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
