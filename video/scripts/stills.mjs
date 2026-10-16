// Renders a few still frames of a composition into out/stills/, to check the look
// without rendering the whole video. Bundles once, then renders each frame.
//
//   node scripts/stills.mjs Promo 40 120 300
//   node scripts/stills.mjs Promo-Vertical 600 --props='{"locale":"fr"}'

import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "../webpack-override.mjs";

const args = process.argv.slice(2);
const propsArg = args.find((arg) => arg.startsWith("--props="));
const inputProps = propsArg ? JSON.parse(propsArg.slice("--props=".length)) : {};
const [id = "Promo", ...frames] = args.filter((arg) => !arg.startsWith("--"));

const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  webpackOverride,
});
const composition = await selectComposition({ serveUrl, id, inputProps });
for (const frame of frames.length > 0 ? frames.map(Number) : [0]) {
  const output = path.resolve("out/stills", `${id}-${frame}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps });
  console.log(output);
}
