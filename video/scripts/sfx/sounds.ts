// The film's sketch sound effects, one function each. Placeholders with intent:
// each one says what the final ElevenLabs effect should feel like.

import {
  add,
  drive,
  filter,
  hit,
  layer,
  master,
  noise,
  note,
  osc,
  random,
  reverb,
  shape,
  silence,
  swell,
  type Sound,
} from "./dsp";

/** Air moving past: band-passed noise sweeping between two frequencies, travelling across the stereo field. */
function whoosh(length: number, from: number, to: number, panFrom: number, panTo: number, seed: number, peak = 0.55): Sound {
  const sound = silence(length);
  const sweep = (t: number) => from * (to / from) ** Math.min(1, t / length);
  const air = shape(filter(noise(length, seed), "bp", sweep, 1.4), swell(length, peak, 2));
  const body = shape(filter(noise(length, seed + 1), "lp", (t) => sweep(t) * 0.35, 0.8), swell(length, peak, 2));
  const pan = (t: number) => panFrom + (panTo - panFrom) * Math.min(1, t / length);
  add(sound, air, 0, 1, pan);
  add(sound, body, 0, 0.8, pan);
  return sound;
}

/** A low hit: a sine diving in pitch, a click on top, saturated. */
function boom(from: number, to: number, decay: number, click = 0.4, seed = 1): Float32Array {
  const length = decay * 6;
  const body = shape(osc(length, (t) => to + (from - to) * Math.exp(-t / (decay * 0.35))), hit(0.002, decay));
  const transient = shape(filter(noise(0.03, seed), "hp", () => 2500), hit(0.0005, 0.006));
  const out = new Float32Array(body.length);
  out.set(body);
  transient.forEach((value, index) => (out[index]! += value * click));
  return drive(out, 2.2);
}

/** A struck bar: a fundamental and inharmonic partials with their own decays. */
function mallet(frequency: number, decay: number): Float32Array {
  const length = decay * 5;
  const partials: [number, number, number][] = [
    [1, 1, 1],
    [2.76, 0.35, 0.45],
    [5.4, 0.12, 0.25],
    [8.93, 0.05, 0.15],
  ];
  const out = new Float32Array(Math.round(length * 48000));
  for (const [ratio, gain, decayRatio] of partials) {
    const tone = shape(osc(length, () => frequency * ratio), hit(0.002, decay * decayRatio));
    tone.forEach((value, index) => (out[index]! += value * gain));
  }
  return out;
}

/** A tiny tick, pitched. */
function tick(frequency: number, seed: number, length = 0.03): Float32Array {
  const tone = shape(osc(length, () => frequency), hit(0.0003, 0.004));
  const click = shape(filter(noise(length, seed), "bp", () => frequency * 1.3, 2), hit(0.0002, 0.003));
  return tone.map((value, index) => value * 0.6 + click[index]! * 0.8);
}

/** A light 120 BPM groove: soft kick, off-beat hats, a plucked bass, a chord stab per bar. */
function grooveOf(beats: number): Sound {
    const beat = 0.5;
    const length = beats * beat + 1;
    const sound = silence(length);
    const bass = [36, 36, 43, 45];
    for (let index = 0; index < beats; index++) {
      const at = index * beat;
      const bar = Math.floor(index / 4);
      add(sound, boom(70, 44, 0.09, 0.05, 300 + index), at, 0.55);
      add(sound, shape(filter(noise(0.08, 400 + index), "hp", () => 7000), hit(0.001, 0.018)), at + beat / 2, 0.22, index % 2 ? 0.3 : -0.3);
      if (index % 2 === 1) add(sound, shape(filter(noise(0.05, 500 + index), "hp", () => 9000), hit(0.001, 0.01)), at + beat * 0.75, 0.1, 0.5);
      const root = note(bass[bar % 4]!);
      add(sound, shape(filter(osc(0.4, () => root, "saw"), "lp", (t) => 300 + 1600 * Math.exp(-t / 0.05), 1.2), hit(0.004, 0.16)), at, 0.32);
      if (index % 4 === 0) {
        const chord = [60, 64, 67, 71].map((midi) => midi + (bass[bar % 4]! - 36));
        chord.forEach((midi, voice) => add(sound, mallet(note(midi), 0.3), at + voice * 0.012, 0.12, voice % 2 ? 0.35 : -0.35));
      }
    }
    // Fades in over the first beat, and out at the end.
    const fade = (index: number, total: number) => Math.min(1, index / 48000 / 0.4) * Math.min(1, (total - index) / 48000 / 0.8);
    sound.left = sound.left.map((value, index) => value * fade(index, sound.left.length));
    sound.right = sound.right.map((value, index) => value * fade(index, sound.right.length));
    return master(sound, -3);
  }

export const sounds: Record<string, () => Sound> = {
  // The ring appears: a round, soft bloop with a sub underneath.
  "ring-pop": () => {
    const sound = silence(0.9);
    add(sound, shape(osc(0.4, (t) => 260 + 420 * (1 - Math.exp(-t / 0.03))), hit(0.004, 0.08)), 0, 0.6);
    add(sound, boom(110, 48, 0.12, 0.15), 0, 0.7);
    return master(reverb(sound, 0.35, 0.8, 0.8), -2);
  },

  // A heartbeat: two thumps, lub-dub.
  heartbeat: () => {
    const sound = silence(0.8);
    add(sound, boom(95, 42, 0.11, 0.08, 3), 0, 1);
    add(sound, boom(80, 40, 0.09, 0.05, 4), 0.16, 0.7);
    return master(sound, -1);
  },

  // A quicker, higher beat for when the heart races.
  "heartbeat-fast": () => {
    const sound = silence(0.5);
    add(sound, boom(120, 50, 0.07, 0.12, 5), 0, 1);
    return master(sound, -1);
  },

  // A line of words sweeping in from the right.
  "whoosh-in": () => master(whoosh(0.5, 2600, 500, 0.9, -0.1, 11, 0.35), -2),

  // A few letters popping: quick soft blips.
  pops: () => {
    const sound = silence(0.3);
    [0, 0.033, 0.066].forEach((at, index) => add(sound, tick(1400 + index * 220, 20 + index, 0.04), at, 0.7, index * 0.3 - 0.3));
    return master(sound, -4);
  },

  // The word "stressful" slamming in: a heavy, dry hit with a crack.
  slam: () => {
    const sound = silence(1.2);
    add(sound, boom(160, 38, 0.32, 0.9, 7), 0, 1);
    add(sound, shape(filter(noise(0.25, 8), "bp", () => 1800, 0.9), hit(0.001, 0.04)), 0, 0.6);
    return master(reverb(sound, 0.25, 0.75, 0.6), -1);
  },

  // Tension rising toward the burst: noise and a tone climbing, fluttering faster and faster.
  riser: () => {
    const length = 1.15;
    const sound = silence(length);
    const rate = (t: number) => 4 + 26 * (t / length) ** 2;
    let phase = 0;
    const flutter = (t: number) => {
      phase += rate(t) / 48000;
      return 0.6 + 0.4 * Math.sin(phase * Math.PI * 2);
    };
    const air = shape(filter(noise(length, 30), "bp", (t) => 300 * (5000 / 300) ** (t / length), 2.2), (t) => (t / length) ** 2.5 * flutter(t));
    const tone = shape(osc(length, (t) => 180 * (720 / 180) ** (t / length), "saw"), (t) => (t / length) ** 3 * 0.25);
    add(sound, air, 0, 1, (t) => Math.sin(t * 9) * 0.4);
    add(sound, filter(tone, "lp", () => 2500), 0, 0.8);
    return master(sound, -3);
  },

  // The words burst apart: a shatter of glassy ticks over a short, bright blast.
  burst: () => {
    const sound = silence(1.1);
    const next = random(40);
    add(sound, shape(filter(noise(0.4, 41), "hp", () => 1200), hit(0.001, 0.07)), 0, 0.8);
    for (let index = 0; index < 26; index++) {
      const at = Math.abs(next()) * 0.35;
      add(sound, tick(2200 + Math.abs(next()) * 4200, 50 + index, 0.05), at, 0.35 * (1 - at), next() * 0.9);
    }
    return master(reverb(sound, 0.3, 0.78, 0.5), -2);
  },

  // The camera dives through the ring: a deep whoosh, falling.
  dive: () => master(whoosh(0.9, 3200, 160, -0.3, 0.3, 60, 0.7), -1),

  // A few quick keystrokes.
  typing: () => {
    const sound = silence(0.7);
    const next = random(70);
    for (let index = 0; index < 10; index++) {
      const at = index * 0.055 + Math.abs(next()) * 0.015;
      add(sound, filter(tick(3400 + next() * 600, 71 + index, 0.03), "hp", () => 900), at, 0.5 + Math.abs(next()) * 0.3, next() * 0.2);
    }
    return master(sound, -6);
  },

  // Slot reels spinning: ticks, fast then slowing down.
  "reel-spin": () => {
    const length = 1.25;
    const sound = silence(length);
    let at = 0;
    let index = 0;
    while (at < length - 0.05) {
      add(sound, tick(2100 + (index % 3) * 180, 80 + index, 0.025), at, 0.45, ((index % 5) - 2) * 0.15);
      at += 0.022 + 0.11 * (at / length) ** 2;
      index++;
    }
    return master(sound, -5);
  },

  // A reel locking into place: a solid mechanical clunk.
  "reel-stop": () => {
    const sound = silence(0.4);
    add(sound, boom(320, 140, 0.04, 0.6, 90), 0, 0.8);
    add(sound, tick(1600, 91, 0.04), 0, 0.6);
    return master(sound, -3);
  },

  // A small slide-in, for "/ month".
  "swipe-small": () => master(whoosh(0.3, 1200, 4200, -0.5, 0.2, 100, 0.4), -6),

  // The teal slash: a bright metallic "shing".
  slash: () => {
    const length = 0.9;
    const sound = silence(length);
    add(sound, shape(filter(noise(0.35, 110), "hp", (t) => 1500 * (8000 / 1500) ** Math.min(1, t / 0.12)), hit(0.004, 0.06)), 0, 0.8, (t) => -0.8 + t * 6);
    for (const [frequency, gain] of [
      [2380, 0.35],
      [3710, 0.25],
      [5290, 0.15],
    ] as const) {
      add(sound, shape(osc(length, () => frequency), hit(0.002, 0.22)), 0.004, gain, 0.2);
    }
    return master(reverb(sound, 0.3, 0.8, 0.8), -2);
  },

  // The price cut in two: a low, crunchy split.
  split: () => {
    const sound = silence(0.9);
    add(sound, boom(130, 45, 0.18, 0.7, 120), 0, 0.9);
    add(sound, shape(filter(noise(0.3, 121), "bp", (t) => 900 - t * 1500, 1.2), hit(0.002, 0.08)), 0, 0.6, (t) => t * 3 - 0.3);
    return master(sound, -2);
  },

  // The slash floods the frame: a big, wide swell of air.
  flood: () => {
    const sound = whoosh(0.85, 180, 6000, -0.6, 0.6, 130, 0.55);
    const other = whoosh(0.85, 200, 5200, 0.6, -0.6, 131, 0.55);
    layer(sound, other, 0, 0.8);
    return master(sound, -1);
  },

  // The flood collapses into the disc: a reversed whoosh, sucked in, cut sharp.
  collapse: () => {
    const length = 0.6;
    const sound = silence(length);
    const air = shape(filter(noise(length, 140), "bp", (t) => 5000 * (300 / 5000) ** (t / length), 1.5), (t) => (t / length) ** 3);
    add(sound, air, 0, 1, (t) => Math.sin(t * 20) * 0.3);
    return master(sound, -2);
  },

  // The ring flying in from the right: a pass-by.
  "fly-by": () => master(whoosh(0.5, 900, 3800, 1, 0, 150, 0.75), -3),

  // The ring docks against the disc: a warm, round impact with sparkles.
  dock: () => {
    const sound = silence(1.6);
    add(sound, boom(150, 62, 0.22, 0.5, 160), 0, 1);
    add(sound, mallet(note(76), 0.25), 0, 0.25);
    const next = random(161);
    for (let index = 0; index < 12; index++) {
      add(sound, shape(osc(0.2, () => 4200 + Math.abs(next()) * 3800), hit(0.001, 0.035)), 0.02 + Math.abs(next()) * 0.3, 0.12, next());
    }
    return master(reverb(sound, 0.35, 0.82, 1), -1);
  },

  // Light opening inside the ring: a bright, shimmering swell.
  shimmer: () => {
    const length = 1.4;
    const sound = silence(length);
    [note(84), note(88), note(91), note(95), note(98)].forEach((frequency, index) => {
      const tone = shape(osc(length, (t) => frequency * (1 + 0.003 * Math.sin(t * 30 + index))), swell(length, 0.45, 1.6));
      add(sound, tone, 0, 0.18, index % 2 === 0 ? -0.5 : 0.5);
    });
    add(sound, shape(filter(noise(length, 170), "hp", () => 6000), swell(length, 0.5, 2)), 0, 0.15);
    return master(reverb(sound, 0.45, 0.85, 1), -4);
  },

  // Flying through into the light: a rising whoosh.
  through: () => master(whoosh(0.7, 300, 7000, 0, 0, 180, 0.85), -1),

  // The name lands: a soft logo sting, a mallet arpeggio over a sub.
  sting: () => {
    const sound = silence(2.4);
    [note(60), note(64), note(67), note(71), note(74)].forEach((frequency, index) => {
      add(sound, mallet(frequency, 0.6), index * 0.055, 0.5, index * 0.2 - 0.4);
    });
    add(sound, boom(90, 44, 0.4, 0.05, 190), 0, 0.7);
    return master(reverb(sound, 0.4, 0.85, 1.4), -1);
  },

  // Each letter of the name landing: soft ticks.
  letters: () => {
    const sound = silence(0.6);
    for (let index = 0; index < 8; index++) {
      add(sound, tick(1700 + index * 90, 200 + index, 0.04), index * 0.053, 0.5, index / 8 - 0.5);
    }
    return master(sound, -6);
  },

  // A dark bed under the opening: a low drone and dusty air, slowly opening up.
  "drone-dark": () => {
    const length = 8.6;
    const sound = silence(length);
    const fade = (t: number) => Math.min(1, t / 0.8) * Math.min(1, (length - t) / 0.4);
    add(sound, shape(osc(length, () => note(33)), (t) => 0.5 * fade(t)), 0, 1);
    add(sound, shape(osc(length, () => note(40) * 1.002), (t) => 0.25 * fade(t) * (0.6 + 0.4 * Math.sin(t * 1.3))), 0, 1, -0.3);
    add(sound, shape(filter(noise(length, 210), "lp", (t) => 250 + t * 120), (t) => 0.35 * fade(t)), 0, 1, 0.3);
    return master(sound, -6);
  },

  // A light, airy bed once in Mockroom's world.
  "pad-light": () => {
    const length = 3;
    const sound = silence(length);
    [note(60), note(67), note(72), note(76)].forEach((frequency, index) => {
      const tone = filter(osc(length, (t) => frequency * (1 + 0.004 * Math.sin(t * 4 + index)), "triangle"), "lp", () => 2400);
      add(sound, shape(tone, (t) => Math.min(1, t / 0.6) * Math.min(1, (length - t) / 0.8) * 0.2), 0, 1, index % 2 ? 0.4 : -0.4);
    });
    return master(reverb(sound, 0.4, 0.85, 1), -9);
  },

  // Part 2

  // A light 120 BPM groove under the product part (see grooveOf).
  groove: () => grooveOf(22),

  // The same groove, long enough to run under parts 2 to 4 of the assembled film without restarting.
  "groove-long": () => grooveOf(64),

  // The price lands on $0: two bright notes up, a little win.
  "free-chime": () => {
    const sound = silence(1.6);
    add(sound, mallet(note(79), 0.35), 0, 0.6, -0.2);
    add(sound, mallet(note(84), 0.5), 0.08, 0.7, 0.2);
    return master(reverb(sound, 0.35, 0.82, 1), -2);
  },

  // Braces clapping together.
  clap: () => {
    const sound = silence(0.7);
    add(sound, shape(filter(noise(0.2, 600), "bp", () => 1300, 1.1), hit(0.001, 0.03)), 0, 1);
    add(sound, shape(filter(noise(0.2, 601), "bp", () => 1300, 1.1), hit(0.001, 0.025)), 0.012, 0.7);
    add(sound, boom(180, 90, 0.05, 0.2, 602), 0, 0.5);
    return master(reverb(sound, 0.25, 0.7, 0.4), -2);
  },

  // A toggle switching.
  toggle: () => {
    const sound = silence(0.3);
    add(sound, tick(2600, 610, 0.03), 0, 0.8);
    add(sound, tick(1300, 611, 0.03), 0.045, 0.6);
    return master(sound, -4);
  },

  // A card flipping: a short, papery swish.
  flip: () => master(whoosh(0.22, 1500, 5000, -0.3, 0.3, 620, 0.5), -5),

  // The small window growing into the app: a rising swell.
  expand: () => {
    const sound = whoosh(0.8, 250, 4200, 0, 0, 630, 0.75);
    add(sound, shape(osc(0.8, (t) => 300 * (900 / 300) ** (t / 0.8)), swell(0.8, 0.8, 2)), 0, 0.12);
    return master(sound, -2);
  },

  // A mouse click.
  click: () => {
    const sound = silence(0.2);
    add(sound, tick(3200, 660, 0.02), 0, 0.9);
    add(sound, tick(2100, 661, 0.02), 0.04, 0.5);
    return master(sound, -4);
  },

  // The AI reading: a soft digital sweep, back and forth.
  scan: () => {
    const length = 1.9;
    const sound = silence(length);
    const sweep = (t: number) => 900 + 700 * Math.sin(t * 4.2);
    const level = (t: number) => Math.min(1, t / 0.2) * Math.min(1, (length - t) / 0.3);
    add(sound, shape(filter(noise(length, 670), "bp", sweep, 6), (t) => 0.5 * level(t)), 0, 1, (t) => Math.sin(t * 4.2) * 0.6);
    add(sound, shape(osc(length, (t) => sweep(t) * 2), (t) => 0.05 * level(t)), 0, 1);
    return master(sound, -9);
  },

  // A word being marked: a highlighter swipe and a bright blip.
  mark: () => {
    const sound = silence(0.5);
    add(sound, shape(filter(noise(0.15, 680), "bp", (t) => 1800 + t * 20000, 2), swell(0.15, 0.6, 1.5)), 0, 0.6);
    add(sound, mallet(note(88), 0.12), 0.1, 0.5);
    return master(sound, -3);
  },

  // A chip lifting off and flying: a small whoosh.
  "chip-fly": () => master(whoosh(0.45, 1200, 4000, -0.4, 0.4, 690, 0.6), -5),

  // A chip landing: a soft pop.
  "chip-land": () => {
    const sound = silence(0.4);
    add(sound, shape(osc(0.15, (t) => 500 + 900 * Math.exp(-t / 0.02)), hit(0.002, 0.04)), 0, 0.8);
    add(sound, tick(2400, 700, 0.03), 0, 0.4);
    return master(sound, -3);
  },

  // A screen changing.
  swap: () => master(whoosh(0.35, 3000, 600, 0.3, -0.3, 710, 0.4), -5),

  // A whip pan: a fast, wide whoosh.
  whip: () => {
    const sound = whoosh(0.4, 600, 6000, 0.8, -0.8, 720, 0.55);
    layer(sound, whoosh(0.4, 400, 3000, 0.6, -0.6, 721, 0.5), 0, 0.7);
    return master(sound, -1);
  },

  // The price's cut: a soft, airy swish, no metal, easy on the ear.
  "soft-swish": () => {
    const sound = whoosh(0.7, 600, 2600, -0.7, 0.7, 800, 0.45);
    layer(sound, whoosh(0.7, 300, 1200, -0.4, 0.4, 801, 0.5), 0, 0.6);
    const smooth: Sound = { left: filter(sound.left, "lp", () => 4200, 0.6), right: filter(sound.right, "lp", () => 4200, 0.6) };
    return master(reverb(smooth, 0.25, 0.8, 0.6), -2);
  },
};
