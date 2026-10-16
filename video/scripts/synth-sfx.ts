// Generates the sketch sound effects into public/audio/synth/, as WAV files.
//
//   npm run sfx            all of them
//   npm run sfx -- slam    only some

import { mkdirSync } from "node:fs";
import { writeWav } from "./sfx/dsp";
import { sounds } from "./sfx/sounds";

const only = process.argv.slice(2);
mkdirSync("public/audio/synth", { recursive: true });
for (const [name, make] of Object.entries(sounds)) {
  if (only.length > 0 && !only.includes(name)) continue;
  const started = Date.now();
  writeWav(`public/audio/synth/${name}.wav`, make());
  console.log(`${name}.wav (${Date.now() - started} ms)`);
}
