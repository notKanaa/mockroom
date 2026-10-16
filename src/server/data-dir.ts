import { homedir } from "node:os";
import { join, resolve } from "node:path";

/**
 * The folder where Mockroom keeps this user's data (interview history and
 * settings). Nothing in it ever leaves the machine.
 *
 * MOCKROOM_DATA_DIR overrides it, which is how tests use a temporary folder.
 * Otherwise it is the usual place for app data on each system:
 * - Windows: %APPDATA%\Mockroom
 * - macOS: ~/Library/Application Support/Mockroom
 * - Linux and others: $XDG_DATA_HOME/mockroom, or ~/.local/share/mockroom
 */
export function mockroomDataDir(
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string {
  const override = env.MOCKROOM_DATA_DIR?.trim();
  if (override) return resolve(override);

  switch (platform) {
    case "win32":
      return join(env.APPDATA?.trim() || join(home, "AppData", "Roaming"), "Mockroom");
    case "darwin":
      return join(home, "Library", "Application Support", "Mockroom");
    default:
      return join(env.XDG_DATA_HOME?.trim() || join(home, ".local", "share"), "mockroom");
  }
}
