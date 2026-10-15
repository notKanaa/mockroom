import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPacks } from "../src/server/packs/library.js";
import { formatPackProblem, type PackProblem } from "../src/server/packs/parse.js";

const fixtures = join(import.meta.dirname, "fixtures", "packs");

/** Problems as a contributor reads them, with the file name only. */
function report(problems: PackProblem[]): string[] {
  return problems.map((problem) => formatPackProblem({ ...problem, file: basename(problem.file) }));
}

function problemsIn(file: string): string[] {
  return report(loadPacks(join(fixtures, "invalid")).problems.filter((problem) => basename(problem.file) === file));
}

describe("Pack validation", () => {
  it("accepts every pack bundled with Mockroom", () => {
    const { packs, problems } = loadPacks();

    expect(report(problems)).toEqual([]);
    expect(packs.map((pack) => pack.id)).toContain("react-junior-en");
  });

  it("loads valid packs, sorted by title", () => {
    const { packs, problems } = loadPacks(join(fixtures, "valid"));

    expect(problems).toEqual([]);
    expect(packs.map((pack) => pack.title)).toEqual(["Python — Confirmé", "Python — Junior", "Rust — Senior"]);
    expect(packs[0]).toEqual({
      id: "python-mid-fr",
      technology: "Python",
      level: "mid",
      language: "fr",
      title: "Python — Confirmé",
      themes: [
        {
          name: "Générateurs",
          questions: ["Qu'est-ce qu'un générateur en Python ?", "Quelle est la différence entre return et yield ?"],
          keyPoints: [
            "Un générateur produit ses valeurs une par une, à la demande",
            "yield suspend la fonction et reprend là où elle s'était arrêtée",
          ],
          resources: [
            {
              title: "Glossaire Python : générateur",
              url: "https://docs.python.org/fr/3/glossary.html#term-generator",
            },
          ],
        },
        {
          name: "Décorateurs",
          questions: ["À quoi sert un décorateur ?"],
          keyPoints: ["Un décorateur est une fonction qui enveloppe une autre fonction"],
          resources: [
            {
              title: "Glossaire Python : décorateur",
              url: "https://docs.python.org/fr/3/glossary.html#term-decorator",
            },
          ],
        },
      ],
    });
  });

  it("leaves out every invalid pack", () => {
    const { packs, problems } = loadPacks(join(fixtures, "invalid"));

    expect(packs).toEqual([]);
    expect(new Set(problems.map((problem) => basename(problem.file))).size).toBe(9);
  });

  it("reports missing fields, pointing at where they belong", () => {
    expect(problemsIn("missing-fields.yaml")).toEqual([
      "missing-fields.yaml:1:1: level is missing.",
      "missing-fields.yaml:7:5: themes › theme 1 › key_points is missing. Add at least one key point.",
    ]);
  });

  it("reports values that aren't allowed", () => {
    expect(problemsIn("wrong-values.yaml")).toEqual([
      'wrong-values.yaml:3:1: level must be one of junior, mid, senior (found "expert").',
      'wrong-values.yaml:4:1: language must be one of en, fr (found "de").',
      'wrong-values.yaml:15:9: themes › theme 1 › resources › resource 1 › url must be a web link starting with https:// (found "react.dev/learn/synchronizing-with-effects").',
    ]);
  });

  it("suggests the right name for a misspelled field", () => {
    expect(problemsIn("misspelled-field.yaml")).toEqual([
      "misspelled-field.yaml:8:5: themes › theme 1 › key_points is missing. Add at least one key point.",
      'misspelled-field.yaml:11:5: themes › theme 1 › keyPoints is not a pack field. Did you mean "key_points"?',
    ]);
  });

  it("requires the id to match the file name", () => {
    expect(problemsIn("wrong-id.yaml")).toEqual([
      'wrong-id.yaml:1:1: id must be the same as the file name: rename the file to "react-junior-en.yaml" or set the id to "wrong-id".',
    ]);
  });

  it("requires at least one theme", () => {
    expect(problemsIn("no-themes.yaml")).toEqual(["no-themes.yaml:6:1: themes needs at least one theme."]);
  });

  it("requires unique theme names", () => {
    expect(problemsIn("duplicate-theme.yaml")).toEqual([
      'duplicate-theme.yaml:17:5: themes › theme 2 › name "Effects" is used by another theme: give each theme its own name.',
    ]);
  });

  it("explains how to write text that contains a colon", () => {
    expect(problemsIn("unquoted-colon.yaml")).toEqual([
      'unquoted-colon.yaml:10:9: themes › theme 1 › questions › item 1 must be some text, not a set of fields. If the text contains ": " (a colon followed by a space), wrap it in double quotes.',
    ]);
  });

  it("reports YAML syntax errors with their line", () => {
    const [problem, ...others] = problemsIn("broken-yaml.yaml");

    expect(others).toEqual([]);
    expect(problem).toMatch(/^broken-yaml\.yaml:11:\d+: .*Check the indentation/);
  });

  it("reports an empty file", () => {
    expect(problemsIn("empty.yaml")).toEqual([
      "empty.yaml: The file is empty. Start from the example in CONTRIBUTING.md.",
    ]);
  });

  it("rejects two files with the same id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockroom-packs-"));
    try {
      const pack = join(fixtures, "valid", "rust-senior-en.yaml");
      await copyFile(pack, join(dir, "rust-senior-en.yaml"));
      await copyFile(pack, join(dir, "rust-senior-en.yml"));

      const { packs, problems } = loadPacks(dir);

      expect(packs).toHaveLength(1);
      expect(report(problems)).toEqual([
        'rust-senior-en.yml:1:1: id "rust-senior-en" is already used by another pack.',
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
