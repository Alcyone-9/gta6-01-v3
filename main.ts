// Coral City Heat v3 - handover program.
// Copies the static game and its screenshots into the output directory and
// writes the dossier exactly as the make.fun library builds it, so the
// grader's rebuild matches byte for byte.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';
const root = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
function resetOutput(dir: string): void {
  // Only the two folders this program owns are refreshed; dossier.json is
  // rewritten below. Keeping the reset narrow avoids deleting anything a
  // host placed beside our output.
  for (const name of ['game', 'screenshots']) {
    const target = join(dir, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
}
function copyTree(from: string, to: string, label: string): void {
  if (!existsSync(from)) throw new Error(label + ' is missing at ' + from);
  cpSync(from, to, { recursive: true });
}
function main(): void {
  mkdirSync(outputDir, { recursive: true });
  resetOutput(outputDir);
  copyTree(join(root, 'game'), join(outputDir, 'game'), 'game/');
  copyTree(join(root, 'screenshots'), join(outputDir, 'screenshots'), 'screenshots/');
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log('Coral City Heat v3 handed in to ' + outputDir + ' (dossier ' + dossier.length + ' bytes)');
}
main();
