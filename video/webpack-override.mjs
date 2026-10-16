// The UI shots import the app's own components from ../src/ui. They must use this
// folder's React, not a second copy from the repository's node_modules.
// Shared by remotion.config.ts (Studio, CLI renders) and scripts/stills.mjs.

import path from "node:path";

// Remotion compiles its config to CommonJS, where import.meta is empty: the npm
// scripts run from this folder, so the working directory is it.
const here = process.cwd();

/** @param {import("webpack").Configuration} config */
export function webpackOverride(config) {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        react: path.join(here, "node_modules/react"),
        "react-dom": path.join(here, "node_modules/react-dom"),
      },
    },
  };
}
