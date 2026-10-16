// Remotion's CLI settings, used by `remotion studio` and `remotion render`.
// See https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./webpack-override.mjs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(webpackOverride);
