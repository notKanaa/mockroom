// Checks interview packs against the pack format: `npm run validate-packs [folder]`.
// Runs in CI on every pull request. Exits with code 1 when a pack is invalid.
import { relative } from "node:path";
import { builtInPacksDir, loadPacks } from "../src/server/packs/library.js";
import { formatPackProblem } from "../src/server/packs/parse.js";

const dir = process.argv[2] ?? builtInPacksDir;
const { packs, problems } = loadPacks(dir);

for (const pack of packs) console.log(`✓ ${pack.id}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem${problems.length > 1 ? "s" : ""} found:\n`);
  for (const problem of problems) {
    const file = relative(process.cwd(), problem.file).replaceAll("\\", "/");
    console.error(`✗ ${formatPackProblem({ ...problem, file })}`);
    // On GitHub, also show the problem on the pull request, next to the line at fault.
    if (process.env.GITHUB_ACTIONS === "true") {
      const where = [`file=${file}`, problem.line && `line=${problem.line}`, problem.column && `col=${problem.column}`];
      const message = `${problem.field ? `${problem.field} ` : ""}${problem.message}`;
      console.log(`::error ${where.filter(Boolean).join(",")},title=Invalid interview pack::${escapeAnnotation(message)}`);
    }
  }
  console.error("\nSee CONTRIBUTING.md for the pack format.");
  process.exit(1);
}

console.log(`\nAll packs are valid (${packs.length}).`);

function escapeAnnotation(text: string): string {
  return text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}
