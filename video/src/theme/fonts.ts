// The film's faces. The UI shots keep the app's system font, as people see it.
//
// - Bricolage Grotesque, for the kinetic type: a grotesque with some ink-trap
//   character, so the titles feel made for Mockroom rather than for any product.
// - JetBrains Mono, for what you type in a terminal and for numbers.
// - Geist, a calm modern sans, for the opening line.

import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const display = loadBricolage("normal", { weights: ["400", "600", "800"], subsets: ["latin", "latin-ext"] });
const mono = loadJetBrainsMono("normal", { weights: ["400", "600"], subsets: ["latin"] });
const sans = loadGeist("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });

export const fonts = {
  display: display.fontFamily,
  mono: mono.fontFamily,
  sans: sans.fontFamily,
};
