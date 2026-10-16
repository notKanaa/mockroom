// Mixes the film's whole soundtrack, one file per language, into public/audio/mix/.
// Remotion then plays that single file, so what you hear is a real mix rather
// than sounds stacked at their own levels:
//
//   - the voice (ElevenLabs), each line levelled, lightly compressed;
//   - the music (ElevenLabs), ducked under the voice by a sidechain that follows
//     the voice itself, and dipped for the break into the dark stage;
//   - the effects (synthesised in scripts/sfx), each levelled, placed so its
//     loudest moment lands on the frame where the picture peaks, through one bus
//     that softens the highs, shares a small room reverb, and ducks under the voice;
//   - a gentle glue compressor and a limiter on the master.
//
//   npm run mix            (after `npm run sfx`, which the render scripts run too)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { locales, type Locale } from "../src/content/locales";
import { FILM_FRAMES } from "../src/v2/cues";
import { breakDip, finalEffects, voiceFile, voiceLines } from "../src/v2/finalSound";
import { filter, reverb, SR, silence, writeWav, type Sound } from "./sfx/dsp";
import { sounds } from "./sfx/sounds";

const FPS = 30;
const LENGTH = FILM_FRAMES / FPS;
const db = (value: number) => 10 ** (value / 20);

// Reading audio

/** Remotion's own ffmpeg, which can decode the ElevenLabs MP3s. */
function ffmpeg(): string {
  const root = path.resolve("node_modules/@remotion");
  for (const folder of readdirSync(root).filter((name) => name.startsWith("compositor-"))) {
    for (const name of ["ffmpeg.exe", "ffmpeg"]) {
      const file = path.join(root, folder, name);
      if (existsSync(file)) return file;
    }
  }
  throw new Error("Remotion's ffmpeg was not found: run npm install.");
}

function readWav(file: string): Sound {
  const data = readFileSync(file);
  let offset = 12;
  let channels = 2;
  while (offset < data.length) {
    const id = data.toString("ascii", offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    if (id === "fmt ") channels = data.readUInt16LE(offset + 10);
    if (id === "data") {
      const frames = size / (2 * channels);
      const sound = silence(frames / SR);
      for (let index = 0; index < frames; index++) {
        const left = data.readInt16LE(offset + 8 + index * 2 * channels) / 32768;
        const right = channels > 1 ? data.readInt16LE(offset + 8 + index * 2 * channels + 2) / 32768 : left;
        sound.left[index] = left;
        sound.right[index] = right;
      }
      return sound;
    }
    offset += 8 + size;
  }
  throw new Error(`No audio in ${file}`);
}

/** Decodes any audio file to 48 kHz stereo. */
function decode(file: string): Sound {
  const temporary = path.resolve("out", `decode-${path.basename(file)}.wav`);
  mkdirSync(path.dirname(temporary), { recursive: true });
  const result = spawnSync(ffmpeg(), ["-v", "error", "-y", "-i", file, "-ac", "2", "-ar", String(SR), "-c:a", "pcm_s16le", temporary]);
  if (result.status !== 0) throw new Error(`Could not decode ${file}: ${result.stderr}`);
  const sound = readWav(temporary);
  rmSync(temporary);
  return sound;
}

// Measuring and shaping

/** The loudness (RMS) of a sound over 20 ms windows, and where its loudest window is. */
function envelope(sound: Sound, window = 0.02): { levels: Float32Array; peakAt: number; peak: number } {
  const size = Math.round(window * SR);
  const count = Math.ceil(sound.left.length / size);
  const levels = new Float32Array(count);
  let peak = 0;
  let peakAt = 0;
  for (let block = 0; block < count; block++) {
    let sum = 0;
    const end = Math.min(sound.left.length, (block + 1) * size);
    for (let index = block * size; index < end; index++) sum += sound.left[index]! ** 2 + sound.right[index]! ** 2;
    const level = Math.sqrt(sum / (2 * Math.max(1, end - block * size)));
    levels[block] = level;
    if (level > peak) {
      peak = level;
      peakAt = (block + 0.5) * window;
    }
  }
  return { levels, peakAt, peak };
}

/** The RMS of a whole sound, ignoring near-silence. */
function loudness(sound: Sound): number {
  const { levels } = envelope(sound, 0.05);
  const loud = [...levels].filter((level) => level > 0.003);
  return loud.length ? Math.sqrt(loud.reduce((sum, level) => sum + level ** 2, 0) / loud.length) : 0;
}

function scaled(sound: Sound, gain: number): Sound {
  return { left: sound.left.map((value) => value * gain), right: sound.right.map((value) => value * gain) };
}

/** Adds a sound into a bus at a time (in seconds), with a gain, keeping its stereo image. */
function place(into: Sound, sound: Sound, at: number, gain: number) {
  const start = Math.round(at * SR);
  for (let index = 0; index < sound.left.length; index++) {
    const target = start + index;
    if (target < 0 || target >= into.left.length) continue;
    into.left[target]! += sound.left[index]! * gain;
    into.right[target]! += sound.right[index]! * gain;
  }
}

/** A follower of a bus's level, smoothed with an attack and a release (seconds), per sample. */
function follower(sound: Sound, attack: number, release: number): Float32Array {
  const out = new Float32Array(sound.left.length);
  const up = Math.exp(-1 / (attack * SR));
  const down = Math.exp(-1 / (release * SR));
  let level = 0;
  for (let index = 0; index < out.length; index++) {
    const input = Math.max(Math.abs(sound.left[index]!), Math.abs(sound.right[index]!));
    level = input > level ? up * level + (1 - up) * input : down * level + (1 - down) * input;
    out[index] = level;
  }
  return out;
}

/** A compressor: above the threshold (dBFS), the level grows `ratio` times slower. */
function compress(sound: Sound, threshold: number, ratio: number, attack = 0.01, release = 0.15): Sound {
  const level = follower(sound, attack, release);
  const out = silence(sound.left.length / SR);
  for (let index = 0; index < level.length; index++) {
    const over = 20 * Math.log10(level[index]! + 1e-9) - threshold;
    const gain = over > 0 ? db(-over * (1 - 1 / ratio)) : 1;
    out.left[index] = sound.left[index]! * gain;
    out.right[index] = sound.right[index]! * gain;
  }
  return out;
}

/** A brick-wall limiter with a short look-ahead, so nothing goes over the ceiling (dBFS). */
function limit(sound: Sound, ceiling: number): Sound {
  const target = db(ceiling);
  const block = 96;
  const blocks = Math.ceil(sound.left.length / block);
  const gains = new Float32Array(blocks + 1).fill(1);
  for (let index = 0; index < blocks; index++) {
    let peak = 0;
    for (let sample = index * block; sample < Math.min(sound.left.length, (index + 2) * block); sample++) {
      peak = Math.max(peak, Math.abs(sound.left[sample]!), Math.abs(sound.right[sample]!));
    }
    gains[index] = peak > target ? target / peak : 1;
  }
  // Recovers slowly, so the gain never pumps.
  for (let index = 1; index <= blocks; index++) gains[index] = Math.min(gains[index]!, gains[index - 1]! + 0.004);
  const out = silence(sound.left.length / SR);
  for (let sample = 0; sample < sound.left.length; sample++) {
    const position = sample / block;
    const low = Math.floor(position);
    const gain = gains[low]! + (gains[Math.min(blocks, low + 1)]! - gains[low]!) * (position - low);
    out.left[sample] = sound.left[sample]! * gain;
    out.right[sample] = sound.right[sample]! * gain;
  }
  return out;
}

function eq(sound: Sound, low: number, high: number): Sound {
  const band = (channel: Float32Array) => filter(filter(channel, "hp", () => low, 0.7), "lp", () => high, 0.6);
  return { left: band(sound.left), right: band(sound.right) };
}

// The mix

/** Each synthesised effect, made once, levelled, with where its peak falls. */
const effectCache = new Map<string, { sound: Sound; peakAt: number }>();
function effect(name: string) {
  const known = effectCache.get(name);
  if (known) return known;
  const make = sounds[name];
  if (!make) throw new Error(`No synthesised sound named ${name}`);
  const raw = make();
  const { peakAt, peak } = envelope(raw);
  // Levelled on its loudest moment, so a short click and a long whoosh sit at the same level before their gain.
  const levelled = { sound: scaled(raw, db(-14) / Math.max(peak, 1e-6)), peakAt };
  effectCache.set(name, levelled);
  return levelled;
}

function mix(locale: Locale) {
  const final = (name: string) => path.resolve("public/audio/final", `${name}.mp3`);

  // The voice: each line levelled to the same loudness, then lightly compressed.
  const voice = silence(LENGTH + 1);
  for (const line of voiceLines[locale]) {
    const take = decode(final(voiceFile(locale, line.id)));
    place(voice, scaled(take, db(-17) / Math.max(loudness(take), 1e-6)), line.at, 1);
  }
  const voiceBus = compress(eq(voice, 90, 12000), -20, 2.5, 0.005, 0.12);

  // The sidechain: how much the voice is speaking, smoothed (0 → 1).
  const speaking = follower(voiceBus, 0.06, 0.45);
  const duck = (index: number, depth: number) => 1 - depth * Math.min(1, speaking[index]! / db(-26));

  // The music: one level for the whole piece, ducked under the voice and dipped for the break.
  const musicRaw = decode(final("music"));
  const musicLevel = db(-21) / Math.max(loudness(musicRaw), 1e-6);
  const music = silence(LENGTH + 1);
  for (let index = 0; index < Math.min(music.left.length, musicRaw.left.length); index++) {
    const gain = musicLevel * duck(index, 0.5) * (1 - 0.8 * breakDip(index / SR));
    music.left[index] = musicRaw.left[index]! * gain;
    music.right[index] = musicRaw.right[index]! * gain;
  }

  // The effects: each one's peak on its frame, through one bus.
  const effects = silence(LENGTH + 1);
  for (const cue of finalEffects(locales[locale])) {
    const { sound, peakAt } = effect(cue.sound);
    const at = cue.frame / FPS - (cue.align === "start" ? 0 : peakAt);
    place(effects, sound, Math.max(0, at), db(cue.gain));
  }
  // Softer highs, no rumble, and one small room for all of them.
  const room = reverb(eq(effects, 45, 7500), 0.18, 0.78, 1);
  const effectsBus = silence(LENGTH + 1);
  for (let index = 0; index < effectsBus.left.length; index++) {
    const gain = db(2) * duck(index, 0.6);
    effectsBus.left[index] = room.left[index]! * gain;
    effectsBus.right[index] = room.right[index]! * gain;
  }

  // The master: the three buses, glued, then limited.
  const masterBus = silence(LENGTH + 1);
  for (let index = 0; index < masterBus.left.length; index++) {
    masterBus.left[index] = music.left[index]! + voiceBus.left[index]! + effectsBus.left[index]!;
    masterBus.right[index] = music.right[index]! + voiceBus.right[index]! + effectsBus.right[index]!;
  }
  const glued = compress(masterBus, -16, 1.8, 0.02, 0.25);
  const out = limit(scaled(glued, db(5.5)), -1);
  // Exactly the film's length, with a short fade at the very end.
  const length = Math.round(LENGTH * SR);
  const fade = Math.round(0.3 * SR);
  const trimmed = silence(LENGTH);
  for (let index = 0; index < length; index++) {
    const tail = Math.min(1, (length - index) / fade);
    trimmed.left[index] = out.left[index]! * tail;
    trimmed.right[index] = out.right[index]! * tail;
  }
  mkdirSync("public/audio/mix", { recursive: true });
  writeWav(`public/audio/mix/mix-${locale}.wav`, trimmed);
  const report = (name: string, bus: Sound) => `${name} ${(20 * Math.log10(loudness(bus) + 1e-9)).toFixed(1)} dB`;
  console.log(`mix-${locale}.wav · ${report("voice", voiceBus)} · ${report("music", music)} · ${report("effects", effectsBus)} · ${report("master", trimmed)}`);
}

for (const locale of ["en", "fr"] as const) mix(locale);
