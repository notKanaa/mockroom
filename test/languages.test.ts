import { afterEach, describe, expect, it } from "vitest";
import { languageFromHeader } from "../src/server/i18n.js";
import { serverMessages } from "../src/server/messages.js";
import type { RunningServer } from "../src/server/server.js";
import { uiMessages } from "../src/ui/messages.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { startTestServer } from "./support/test-server.js";

const greeting = "Bonjour et bienvenue ! Nous allons voir 5 questions. Pour commencer : qu'est-ce que JSX ?";
const followUp = "Peux-tu me dire en quoi JSX est transformé ?";
const debriefReply = JSON.stringify({
  questions: [
    {
      number: 1,
      strengths: ["Tu sais que JSX ressemble à du HTML"],
      gaps: ["Préciser que JSX devient des appels de fonction"],
      modelAnswer: "JSX est une syntaxe qui devient des appels à React.createElement.",
      resource: 1,
    },
  ],
  summary: "Beau travail ! Revois maintenant la compilation de JSX.",
});

describe("Interview language", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function setUp(replies: string[]) {
    const model = new ScriptedModel(replies);
    server = await startTestServer({ model });
    return { model, client: new InterviewClient(server.url) };
  }

  /** The system prompt of each call the model got. */
  function systemPrompts(model: ScriptedModel): string[] {
    return model.calls.map((call) => call.find((message) => message.role === "system")?.content ?? "");
  }

  it("runs an English pack in French: interviewer, follow-up and debrief all asked for French", async () => {
    const { client, model } = await setUp([greeting, "FOLLOW-UP", followUp, debriefReply]);

    const started = await client.start("react-junior-en", "fr");
    expect(started.interview).toMatchObject({ language: "fr", pack: { id: "react-junior-en" } });
    const id = started.interview!.id;
    const answered = await client.answer(id, "C'est du HTML dans le JavaScript.");
    expect(answered.text).toBe(followUp);
    expect(answered.interview).toMatchObject({ questionNumber: 1, followUpNumber: 1 });
    await client.end(id);
    const { status, body: debrief } = await client.debrief(id);

    expect(status).toBe(200);
    expect(debrief?.summary).toBe("Beau travail ! Revois maintenant la compilation de JSX.");

    const [opening, decision, followUpCall, debriefCall] = systemPrompts(model);
    for (const interviewer of [opening, followUpCall]) {
      expect(interviewer).toContain("Conduct the interview in French: write every message in French");
      expect(interviewer).toContain("written in English: translate them into French");
    }
    expect(followUpCall).toContain("Ask one short follow-up question");
    // Deciding whether to follow up only gets a one-word reply, so it needs no language.
    expect(decision).toContain("Reply with only one word: FOLLOW-UP or NEXT.");
    expect(debriefCall).toContain("Write every text in French");
    expect(debriefCall).toContain("written in English: translate them into French");
    // The candidate's opening line is in French too.
    expect(model.calls[0]?.find((message) => message.role === "user")?.content).toBe(
      "Bonjour, je suis prêt pour l'entretien.",
    );
  });

  it("saves the interview language in the history", async () => {
    const { client } = await setUp([greeting]);
    const { interview } = await client.start("react-junior-en", "fr");
    await client.end(interview!.id);

    const { body: entries } = await client.history();
    expect(entries?.[0]).toMatchObject({ id: interview!.id, language: "fr" });
    const { body: saved } = await client.savedInterview(interview!.id);
    expect(saved?.language).toBe("fr");
  });

  it("holds the interview in the pack's language when none is chosen", async () => {
    const { client, model } = await setUp([greeting]);
    const { interview } = await client.start("react-junior-en");

    expect(interview?.language).toBe("en");
    expect(systemPrompts(model)[0]).toContain("Conduct the interview in English");
    expect(systemPrompts(model)[0]).not.toContain("translate them");
  });

  it("turns down a language Mockroom doesn't speak", async () => {
    const { client, model } = await setUp([]);
    const turn = await client.start("react-junior-en", "de");

    expect(turn.status).toBe(400);
    expect(turn.error).toBe('Choose the interview language: "en" (English) or "fr" (French).');
    expect(model.calls).toHaveLength(0);
  });

  it("sends its messages in the interface's language", async () => {
    const { client } = await setUp([greeting]);
    const french = new InterviewClient(client.baseUrl, "fr");
    const { interview } = await french.start("react-junior-en", "en");

    expect((await french.answer(interview!.id, "   ")).error).toBe("La réponse est vide.");
    expect((await client.answer(interview!.id, "   ")).error).toBe("The answer is empty.");
    expect((await french.start("no-such-pack")).error).toBe("Ce pack n'existe pas.");
  });
});

describe("Language of the API's messages", () => {
  it("follows Accept-Language, with English for anything else", () => {
    expect(languageFromHeader("fr")).toBe("fr");
    expect(languageFromHeader("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(languageFromHeader("de-DE,en;q=0.5,fr;q=0.7")).toBe("fr");
    expect(languageFromHeader("en-GB")).toBe("en");
    expect(languageFromHeader("de")).toBe("en");
    expect(languageFromHeader("*")).toBe("en");
    expect(languageFromHeader(undefined)).toBe("en");
  });
});

describe("Translations", () => {
  it("has the same messages in English and French, on the server and in the UI", () => {
    expect(keyPaths(serverMessages.fr)).toEqual(keyPaths(serverMessages.en));
    expect(keyPaths(uiMessages.fr)).toEqual(keyPaths(uiMessages.en));
  });

  it("leaves no French message empty", () => {
    for (const [path, value] of entries(uiMessages.fr)) {
      if (typeof value === "string") expect(value.trim(), path).not.toBe("");
    }
  });
});

/** Every key of a dictionary, nested ones as "section.key", sorted. */
function keyPaths(dictionary: object): string[] {
  return entries(dictionary)
    .map(([path]) => path)
    .sort();
}

function entries(dictionary: object, prefix = ""): [string, unknown][] {
  return Object.entries(dictionary).flatMap(([key, value]): [string, unknown][] =>
    typeof value === "object" && value !== null
      ? entries(value as object, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}
