// A tiny sound synthesiser, enough to sketch the film's sound design before the
// final effects come from ElevenLabs: noise, oscillators, a state-variable filter,
// envelopes, a small reverb, and a WAV writer. Everything is seeded, so the same
// code always makes the same sounds.

import { writeFileSync } from "node:fs";

export const SR = 48000;

export interface Sound {
  left: Float32Array;
  right: Float32Array;
}

export function silence(seconds: number): Sound {
  const length = Math.max(1, Math.round(seconds * SR));
  return { left: new Float32Array(length), right: new Float32Array(length) };
}

/** A seeded random generator in [-1, 1]. */
export function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

/** White noise. */
export function noise(seconds: number, seed: number): Float32Array {
  const next = random(seed);
  return Float32Array.from({ length: Math.round(seconds * SR) }, () => next());
}

/** An oscillator whose frequency follows a function of time (in seconds). */
export function osc(seconds: number, frequency: (t: number) => number, shape: "sine" | "triangle" | "saw" = "sine", phase = 0): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  let cycle = phase;
  for (let index = 0; index < out.length; index++) {
    cycle += frequency(index / SR) / SR;
    const p = cycle - Math.floor(cycle);
    out[index] =
      shape === "sine" ? Math.sin(p * Math.PI * 2) : shape === "triangle" ? 1 - 4 * Math.abs(p - 0.5) : p * 2 - 1;
  }
  return out;
}

/** A state-variable filter whose cutoff (Hz) follows a function of time. */
export function filter(input: Float32Array, mode: "lp" | "hp" | "bp", cutoff: (t: number) => number, q = 0.7): Float32Array {
  const out = new Float32Array(input.length);
  const damping = 1 / q;
  let low = 0;
  let band = 0;
  for (let index = 0; index < input.length; index++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff(index / SR), 9000)) / SR);
    // Two passes per sample keep the filter stable at high cutoffs.
    for (let pass = 0; pass < 2; pass++) {
      low += (f / 2) * band;
      const high = input[index]! - low - damping * band;
      band += (f / 2) * high;
      if (pass === 1) out[index] = mode === "lp" ? low : mode === "hp" ? high : band;
    }
  }
  return out;
}

/** Multiplies a signal by an envelope, a function of time. */
export function shape(input: Float32Array, envelope: (t: number) => number): Float32Array {
  return input.map((value, index) => value * envelope(index / SR));
}

/** Attack then exponential decay. */
export const hit = (attack: number, decay: number) => (t: number) =>
  t < attack ? t / attack : Math.exp(-(t - attack) / decay);

/** A smooth swell: rises to a peak at `peak` (0..1 of the length), then falls. */
export const swell = (length: number, peak = 0.6, power = 2) => (t: number) => {
  const x = t / length;
  if (x <= 0 || x >= 1) return 0;
  return x < peak ? (x / peak) ** power : ((1 - x) / (1 - peak)) ** (power * 0.7);
};

/** Adds a mono signal into a sound, at a time, with a gain and a stereo position (-1 left … 1 right, or a function of time). */
export function add(into: Sound, signal: Float32Array, at = 0, gain = 1, pan: number | ((t: number) => number) = 0) {
  const start = Math.round(at * SR);
  for (let index = 0; index < signal.length; index++) {
    const target = start + index;
    if (target < 0 || target >= into.left.length) continue;
    const position = typeof pan === "number" ? pan : pan(index / SR);
    const angle = ((position + 1) * Math.PI) / 4;
    into.left[target]! += signal[index]! * gain * Math.cos(angle) * Math.SQRT2;
    into.right[target]! += signal[index]! * gain * Math.sin(angle) * Math.SQRT2;
  }
}

/** Adds one sound into another. */
export function layer(into: Sound, sound: Sound, at = 0, gain = 1) {
  const start = Math.round(at * SR);
  for (let index = 0; index < sound.left.length; index++) {
    const target = start + index;
    if (target < 0 || target >= into.left.length) continue;
    into.left[target]! += sound.left[index]! * gain;
    into.right[target]! += sound.right[index]! * gain;
  }
}

/** Soft saturation, for weight on impacts. */
export function drive(input: Float32Array, amount: number): Float32Array {
  return input.map((value) => Math.tanh(value * amount) / Math.tanh(amount));
}

/** A small Schroeder reverb (combs then all-passes), mixed into the sound, with a longer tail. */
export function reverb(sound: Sound, wet = 0.3, size = 0.82, tail = 1.2): Sound {
  const out = silence(sound.left.length / SR + tail);
  const channel = (input: Float32Array, spread: number) => {
    const length = out.left.length;
    const dry = new Float32Array(length);
    dry.set(input);
    const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((delay) => Math.round((delay + spread) * (SR / 44100)));
    const result = new Float32Array(length);
    for (const delay of combs) {
      const line = new Float32Array(delay);
      let position = 0;
      let damped = 0;
      for (let index = 0; index < length; index++) {
        const delayed = line[position]!;
        damped = delayed * 0.7 + damped * 0.3;
        line[position] = dry[index]! + damped * size;
        result[index]! += delayed / combs.length;
        position = (position + 1) % delay;
      }
    }
    for (const delay of [556, 441, 341, 225].map((d) => Math.round((d + spread) * (SR / 44100)))) {
      const line = new Float32Array(delay);
      let position = 0;
      for (let index = 0; index < length; index++) {
        const delayed = line[position]!;
        const value = result[index]!;
        line[position] = value + delayed * 0.5;
        result[index] = delayed - value * 0.5;
        position = (position + 1) % delay;
      }
    }
    return dry.map((value, index) => value * (1 - wet * 0.5) + result[index]! * wet * 3);
  };
  out.left = channel(sound.left, 0);
  out.right = channel(sound.right, 23);
  return out;
}

/** Scales a sound to a peak level (in dBFS), and fades its last milliseconds out. */
export function master(sound: Sound, peakDb = -1): Sound {
  let peak = 0;
  for (const channel of [sound.left, sound.right]) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  const gain = peak > 0 ? 10 ** (peakDb / 20) / peak : 1;
  const fade = Math.min(sound.left.length, Math.round(0.01 * SR));
  for (const channel of [sound.left, sound.right]) {
    for (let index = 0; index < channel.length; index++) {
      const tail = channel.length - index;
      channel[index]! *= gain * (tail < fade ? tail / fade : 1);
    }
  }
  return sound;
}

/** Writes a 16-bit stereo WAV. */
export function writeWav(path: string, sound: Sound) {
  const length = sound.left.length;
  const data = Buffer.alloc(44 + length * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + length * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(length * 4, 40);
  for (let index = 0; index < length; index++) {
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    data.writeInt16LE(Math.round(clamp(sound.left[index]!) * 32767), 44 + index * 4);
    data.writeInt16LE(Math.round(clamp(sound.right[index]!) * 32767), 46 + index * 4);
  }
  writeFileSync(path, data);
}

/** A note's frequency from its MIDI number. */
export const note = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
