import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPacks } from "../src/server/packs/library.js";
import type { RunningServer } from "../src/server/server.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { startTestServer } from "./support/test-server.js";

// React junior (built in), plus Python junior (en), Python mid (fr) and Rust senior (en).
const packs = [
  ...loadPacks().packs,
  ...loadPacks(join(import.meta.dirname, "fixtures", "packs", "valid")).packs,
];

const jobOffer = `Frontend developer (junior) — we build our web app with React and TypeScript.
You have up to 2 years of experience and like working in an Agile team.`;

const detected = JSON.stringify({ technologies: ["React", "TypeScript"], level: "junior" });

describe("Job offer detection API", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function setUp(replies: (string | Error)[], uiLanguage?: "en" | "fr") {
    const model = new ScriptedModel(replies);
    server = await startTestServer({ model, packs, followUpsPerQuestion: 0 });
    return { model, client: new InterviewClient(server.url, uiLanguage) };
  }

  it("detects the technologies and level, and matches each technology to a pack or flags it uncurated", async () => {
    const { client, model } = await setUp([detected]);

    const { status, body } = await client.detect(jobOffer, "en");

    expect(status).toBe(200);
    expect(body).toEqual({
      technologies: ["React", "TypeScript"],
      level: "junior",
      matches: [
        { technology: "React", packId: "react-junior-en" },
        // No TypeScript pack: the interviewer covers it from its own knowledge.
        { technology: "TypeScript", packId: null },
      ],
    });

    const [system, offer] = model.calls[0]!;
    expect(system?.content).toContain('{"technologies":["...","..."],"level":"junior"}');
    // The packs' technologies are given, so the model spells them the same way.
    expect(system?.content).toContain("write it exactly like this: React, Python, Rust.");
    expect(offer?.content).toContain("we build our web app with React and TypeScript");
  });

  it("reads loose replies from small models: code fence, single quotes, odd keys, objects and synonyms", async () => {
    const reply = `Here is the analysis:
\`\`\`json
{'Technologies': [{'name': 'python'}, {'name': 'Docker'}, {'name': 'python'},], 'Seniority': 'Confirmé (3-5 years)'}
\`\`\``;
    const { client } = await setUp([reply]);

    const { status, body } = await client.detect("Développeur Python confirmé, Docker.", "en");

    expect(status).toBe(200);
    expect(body).toEqual({
      technologies: ["python", "Docker"],
      level: "mid",
      // The only mid-level Python pack is in French: it is picked even for an English interview.
      matches: [
        { technology: "python", packId: "python-mid-fr" },
        { technology: "Docker", packId: null },
      ],
    });
  });

  it("prefers the pack in the interview language, and matches names written differently", async () => {
    const { client } = await setUp([JSON.stringify({ technologies: ["ReactJS", "Python"], level: "junior" })]);

    const { body } = await client.detect(jobOffer, "fr");

    expect(body?.matches).toEqual([
      { technology: "ReactJS", packId: "react-junior-en" },
      { technology: "Python", packId: "python-junior-en" },
    ]);
  });

  it("asks again once when the reply can't be read", async () => {
    const { client, model } = await setUp(["Sure! This job is about React and TypeScript.", detected]);

    const { status, body } = await client.detect(jobOffer);

    expect(status).toBe(200);
    expect(body?.technologies).toEqual(["React", "TypeScript"]);
    expect(model.calls).toHaveLength(2);
    expect(model.calls[1]?.at(-1)?.content).toContain("Mockroom couldn't use that reply: it contains no JSON object.");
  });

  it("falls back to picking packs by hand when the reply is still malformed after a second try", async () => {
    const { client, model } = await setUp(["React, TypeScript, junior", '{"technologies": ["React", "level": }']);

    const result = await client.detect(jobOffer);

    expect(result.status).toBe(422);
    expect(result.error).toBe(
      "The AI model's analysis of this job offer couldn't be read, even after a second try. Pick packs by hand below, or try again (a more capable model helps).",
    );
    expect(model.calls).toHaveLength(2);
  });

  it("says so in French, and when the offer names no technology", async () => {
    const empty = JSON.stringify({ technologies: [], level: "mid" });
    const { client } = await setUp([empty, empty], "fr");

    const result = await client.detect("Nous cherchons une personne motivée et souriante.");

    expect(result.status).toBe(422);
    expect(result.error).toBe(
      "Mockroom n'a trouvé aucune technologie dans cette offre d'emploi. Ajoute les technologies toi-même, ou choisis des packs à la main ci-dessous.",
    );
  });

  it("defaults the level to mid when the reply has none: the candidate can still change it", async () => {
    const { client } = await setUp([JSON.stringify({ technologies: ["Rust"] })]);

    const { body } = await client.detect("Rust developer wanted.");

    expect(body).toMatchObject({ technologies: ["Rust"], level: "mid", matches: [{ technology: "Rust", packId: null }] });
  });

  it("reports a provider failure, pointing to picking packs by hand", async () => {
    const { client } = await setUp([new Error("Mockroom can't reach Ollama.")]);

    const result = await client.detect(jobOffer);

    expect(result.status).toBe(502);
    expect(result.error).toBe(
      "The job offer couldn't be analysed: Mockroom can't reach Ollama. You can still pick packs by hand below.",
    );
  });

  it("turns down an empty job offer without calling the model", async () => {
    const { client, model } = await setUp([]);

    expect(await client.detect("   ")).toMatchObject({ status: 400, error: "Paste a job offer first." });
    expect(model.calls).toHaveLength(0);
  });
});

describe("Editing the detection", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it("matches the packs again for edited technologies and level", async () => {
    server = await startTestServer({ packs });
    const client = new InterviewClient(server.url);

    expect((await client.match(["React", "Go"], "junior", "en")).body).toEqual({
      matches: [
        { technology: "React", packId: "react-junior-en" },
        { technology: "Go", packId: null },
      ],
    });
    // At senior level, no React pack fits any more, but the Rust one does.
    expect((await client.match(["React", " rust "], "senior")).body).toEqual({
      matches: [
        { technology: "React", packId: null },
        { technology: "rust", packId: "rust-senior-en" },
      ],
    });
    expect(await client.match(["React"], "expert")).toMatchObject({
      status: 400,
      error: 'Choose the level: "junior", "mid" or "senior".',
    });
  });
});

describe("Interviews tailored to a job offer", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function setUp(replies: string[], followUpsPerQuestion = 0) {
    const model = new ScriptedModel(replies);
    server = await startTestServer({ model, packs, followUpsPerQuestion });
    return { model, client: new InterviewClient(server.url) };
  }

  function systemPrompt(model: ScriptedModel, call: number): string {
    return model.calls[call]?.find((message) => message.role === "system")?.content ?? "";
  }

  it("covers the confirmed technologies at the confirmed level: packs first, uncurated ones from the model", async () => {
    const { client, model } = await setUp(["Hello! Question 1 on JSX.", "Thanks. Question 2 on Go."]);

    const started = await client.startWith({
      packIds: ["react-junior-en"],
      technologies: ["React", "Go"],
      level: "junior",
      language: "en",
    });
    await client.answer(started.interview!.id, "JSX compiles to function calls.");

    expect(started.interview).toMatchObject({
      packs: [{ id: "react-junior-en", title: "React — Junior", technology: "React" }],
      technologies: ["React", "Go"],
      uncurated: ["Go"],
      level: "junior",
      totalQuestions: 5,
    });
    const opening = systemPrompt(model, 0);
    expect(opening).toContain("mock job interview for a junior React and Go developer position.");
    expect(opening).toContain(
      'taken from the "React — Junior" interview pack, whose themes are: Components and JSX, Props and state, Effects, Lists and keys, Forms; and questions you write yourself on Go, which no pack covers.',
    );
    expect(opening).toContain('ask question 1, on the theme "Components and JSX"');
    // The packs and the uncurated technologies take turns.
    expect(systemPrompt(model, 1)).toContain(
      "ask question 2, on Go: a question you write yourself, the kind a recruiter asks a junior developer",
    );
  });

  it("runs a multi-pack interview, taking a question from each pack in turn", async () => {
    const { client, model } = await setUp(["Hello! Question 1.", "Question 2.", "Question 3."]);

    const started = await client.startWith({ packIds: ["react-junior-en", "python-junior-en"], language: "en" });
    const id = started.interview!.id;
    await client.answer(id, "Answer 1");
    await client.answer(id, "Answer 2");

    expect(started.interview).toMatchObject({
      packs: [
        { id: "react-junior-en", technology: "React" },
        { id: "python-junior-en", technology: "Python" },
      ],
      technologies: [],
      uncurated: [],
      level: "junior",
      totalQuestions: 5,
    });
    expect(systemPrompt(model, 0)).toContain("junior React and Python developer position");
    expect(systemPrompt(model, 0)).toContain('ask question 1, on the theme "Components and JSX"');
    expect(systemPrompt(model, 1)).toContain('ask question 2, on the theme "Lists and tuples"');
    expect(systemPrompt(model, 2)).toContain('ask question 3, on the theme "Props and state"');
  });

  it("combines a job offer with packs picked by hand: their technologies are no longer uncurated", async () => {
    const { client } = await setUp(["Hello!"]);

    const started = await client.startWith({
      packIds: ["rust-senior-en"],
      technologies: ["React", "Rust"],
      level: "senior",
    });

    expect(started.interview).toMatchObject({
      packs: [{ id: "rust-senior-en" }],
      uncurated: ["React"],
      level: "senior",
    });
  });

  it("runs an interview with only uncurated technologies, then writes and saves its debrief", async () => {
    const debrief = JSON.stringify({
      questions: [
        {
          number: 1,
          question: "How do goroutines differ from OS threads?",
          strengths: ["Knows goroutines are lightweight"],
          gaps: ["Mention the Go scheduler"],
          modelAnswer: "Goroutines are scheduled by the Go runtime onto a few OS threads.",
          resourceTitle: "Effective Go: Goroutines",
          resourceUrl: "https://go.dev/doc/effective_go#goroutines",
        },
        {
          number: 2,
          strengths: [],
          gaps: ["Explain pods"],
          modelAnswer: "A pod is the smallest deployable unit.",
          resource: { title: "Kubernetes", url: "not a link" },
        },
      ],
    });
    const { client, model } = await setUp([
      "Hi! First question: how do goroutines differ from OS threads?",
      "FOLLOW-UP",
      "Can you give an example?",
      "Thanks. Question 2: what is a Kubernetes pod?",
      "NEXT",
      "Thanks. Question 3, on Go again: what is a channel?",
      debrief,
    ], 1);

    const started = await client.startWith({ technologies: ["Go", "Kubernetes"], level: "senior", language: "en" });
    const id = started.interview!.id;
    await client.answer(id, "They are lighter.");
    await client.answer(id, "You start one with the go keyword.");
    await client.answer(id, "A group of containers.");
    await client.end(id);
    const { status, body } = await client.debrief(id);

    expect(started.interview).toMatchObject({ packs: [], uncurated: ["Go", "Kubernetes"], totalQuestions: 5 });
    // Without key points, the follow-up decision judges against the level.
    expect(systemPrompt(model, 1)).toContain(
      "The current question is on Go. No pack covers it, so the interviewer wrote the question itself",
    );
    expect(systemPrompt(model, 6)).toContain("no pack covers Go, so the interviewer wrote this question itself");
    expect(status).toBe(200);
    expect(body?.questions).toEqual([
      {
        number: 1,
        theme: "Go",
        question: "How do goroutines differ from OS threads?",
        strengths: ["Knows goroutines are lightweight"],
        gaps: ["Mention the Go scheduler"],
        modelAnswer: "Goroutines are scheduled by the Go runtime onto a few OS threads.",
        resource: { title: "Effective Go: Goroutines", url: "https://go.dev/doc/effective_go#goroutines" },
        uncurated: true,
      },
      {
        number: 2,
        theme: "Kubernetes",
        // Not restated by the model: taken from the interviewer's message. The bad link is left out.
        question: "what is a Kubernetes pod?",
        strengths: [],
        gaps: ["Explain pods"],
        modelAnswer: "A pod is the smallest deployable unit.",
        uncurated: true,
      },
    ]);

    const { body: saved } = await client.savedInterview(id);
    expect(saved).toMatchObject({
      packs: [],
      technologies: ["Go", "Kubernetes"],
      uncurated: ["Go", "Kubernetes"],
      level: "senior",
      language: "en",
    });
    expect((await client.history()).body?.[0]).toMatchObject({ uncurated: ["Go", "Kubernetes"], level: "senior" });
  });

  it("turns down an interview with nothing to cover, an unknown pack or a wrong level", async () => {
    const { client, model } = await setUp([]);

    expect(await client.startWith({ technologies: ["  "] })).toMatchObject({
      status: 400,
      error: "Choose at least one pack or one technology for the interview.",
    });
    expect(await client.startWith({ packIds: ["react-junior-en", "cobol-wizard"] })).toMatchObject({
      status: 404,
      error: "This pack doesn't exist.",
    });
    expect(await client.startWith({ technologies: ["Go"], level: "guru" as "senior" })).toMatchObject({
      status: 400,
      error: 'Choose the level: "junior", "mid" or "senior".',
    });
    expect(model.calls).toHaveLength(0);
  });
});
