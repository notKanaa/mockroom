import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PackSummary } from "../src/server/api-types.js";
import { loadPacks } from "../src/server/packs/library.js";
import type { RunningServer } from "../src/server/server.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { startTestServer } from "./support/test-server.js";

const fixturePacks = loadPacks(join(import.meta.dirname, "fixtures", "packs", "valid")).packs;

describe("Pack picker API", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function listPacks(query = ""): Promise<string[]> {
    const response = await fetch(`${server!.url}/api/packs${query}`);
    expect(response.status).toBe(200);
    return ((await response.json()) as PackSummary[]).map((pack) => pack.id);
  }

  it("lists the built-in pack with its themes", async () => {
    server = await startTestServer();

    const response = await fetch(`${server.url}/api/packs`);

    expect(await response.json()).toEqual([
      {
        id: "react-junior-en",
        technology: "React",
        level: "junior",
        language: "en",
        title: "React — Junior",
        themes: ["Components and JSX", "Props and state", "Effects", "Lists and keys", "Forms"],
      },
    ]);
  });

  it("filters packs by technology, level and language", async () => {
    server = await startTestServer({ packs: fixturePacks });

    expect(await listPacks()).toEqual(["python-mid-fr", "python-junior-en", "rust-senior-en"]);
    expect(await listPacks("?technology=python")).toEqual(["python-mid-fr", "python-junior-en"]);
    expect(await listPacks("?level=senior")).toEqual(["rust-senior-en"]);
    expect(await listPacks("?language=en")).toEqual(["python-junior-en", "rust-senior-en"]);
    expect(await listPacks("?technology=Python&level=mid&language=fr")).toEqual(["python-mid-fr"]);
    expect(await listPacks("?technology=COBOL")).toEqual([]);
  });

  it("starts an interview from the chosen pack, with questions grounded in its themes", async () => {
    const model = new ScriptedModel(["Bonjour ! Première question.", "Merci. Deuxième question."]);
    server = await startTestServer({ model, packs: fixturePacks });
    const client = new InterviewClient(server.url);

    const first = await client.start("python-mid-fr");
    const second = await client.answer(first.interview!.id, "Une fonction qui utilise yield.");

    expect(first.interview).toMatchObject({
      pack: { id: "python-mid-fr", title: "Python — Confirmé" },
      questionNumber: 1,
      // Two themes, asked in turn: Générateurs, Décorateurs, then Générateurs again.
      totalQuestions: 3,
    });
    expect(second.interview).toMatchObject({ questionNumber: 2 });

    const [opening, followUp] = model.calls.map((call) => call[0]!.content);
    expect(opening).toContain("mid Python developer position. Conduct the interview in French.");
    expect(opening).toContain('pack, whose themes are: Générateurs, Décorateurs.');
    expect(opening).toContain(`ask question 1, on the theme "Générateurs": "Qu'est-ce qu'un générateur en Python ?"`);
    expect(followUp).toContain('ask question 2, on the theme "Décorateurs": "À quoi sert un décorateur ?"');
  });

  it("only offers the packs it was given", async () => {
    server = await startTestServer({ packs: fixturePacks });
    const client = new InterviewClient(server.url);

    expect(await client.start("react-junior-en")).toMatchObject({
      status: 404,
      error: "This pack doesn't exist.",
    });
  });
});
