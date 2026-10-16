// Checks the sound's timing against the picture, before rendering:
//   - each voice line: when it starts and ends (from the real file), and that it
//     neither overlaps the next line nor runs past the end of the film;
//   - each heartbeat: how far it falls from the music's own pulse in the intro
//     (the music's grid: a hit every 0.25 s from 0.03 s, measured on music.mp3).
//
//   npm run check-timing

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { locales, type Locale } from "../src/content/locales";
import { FILM_FRAMES } from "../src/v2/cues";
import { finalEffects, voiceFile, voiceLines } from "../src/v2/finalSound";

const FPS = 30;
const end = FILM_FRAMES / FPS;

function ffprobe(): string {
  const root = path.resolve("node_modules/@remotion");
  for (const folder of readdirSync(root).filter((name) => name.startsWith("compositor-"))) {
    for (const name of ["ffprobe.exe", "ffprobe"]) {
      const file = path.join(root, folder, name);
      if (existsSync(file)) return file;
    }
  }
  throw new Error("Remotion's ffprobe was not found: run npm install.");
}

const duration = (file: string) =>
  Number(spawnSync(ffprobe(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());

let problems = 0;
for (const locale of ["en", "fr"] as Locale[]) {
  console.log(`\nVoice, ${locale}  (film ends at ${end.toFixed(2)} s)`);
  const lines = voiceLines[locale];
  lines.forEach((line, index) => {
    const length = duration(path.resolve("public/audio/final", `${voiceFile(locale, line.id)}.mp3`));
    const stop = line.at + length;
    const next = lines[index + 1]?.at ?? end;
    const gap = next - stop;
    const flag = gap < 0.05 ? (index + 1 < lines.length ? "  ← overlaps the next line" : "  ← runs past the end") : "";
    if (flag) problems++;
    console.log(`  ${line.id}  ${line.at.toFixed(2)} → ${stop.toFixed(2)} s  (gap ${gap.toFixed(2)})${flag}  ${line.text}`);
  });
}

console.log("\nHeartbeats against the music's intro pulse (0.03 s + 0.25 s × n)");
for (const cue of finalEffects(locales.en).filter((effect) => effect.sound === "heartbeat-fast")) {
  const time = cue.frame / FPS;
  const pulse = 0.03 + Math.round((time - 0.03) / 0.25) * 0.25;
  const off = (time - pulse) * 1000;
  const flag = Math.abs(off) > 25 && time > 1.7 ? "  ← off the music's pulse" : "";
  if (flag) problems++;
  console.log(`  frame ${cue.frame}  ${time.toFixed(3)} s  nearest pulse ${pulse.toFixed(2)} s  (${off >= 0 ? "+" : ""}${off.toFixed(0)} ms)${flag}`);
}

console.log(problems ? `\n${problems} problem(s).` : "\nAll good.");
process.exitCode = problems ? 1 : 0;
