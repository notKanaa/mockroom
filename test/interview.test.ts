import { afterEach, describe, expect, it } from "vitest";
import type { InterviewDetails } from "../src/server/api-types.js";
import type { RunningServer } from "../src/server/server.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { startTestServer } from "./support/test-server.js";

const interviewerScript = [
  "Hi, welcome! We'll go through 5 questions. First: what is JSX?",
  "Thanks. Question 2: what is the difference between props and state?",
  "Thanks. Question 3: how does useEffect work?",
  "Thanks. Question 4: why does React need keys in lists?",
  "Thanks. Question 5: what is a controlled input?",
  "Thank you, that's the end of the interview.",
];

describe("Interview API", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function setUp(replies: (string | Error)[] = interviewerScript) {
    const model = new ScriptedModel(replies);
    server = await startTestServer({ model });
    return { model, client: new InterviewClient(server.url) };
  }

  it("lists the built-in pack", async () => {
    await setUp();

    const response = await fetch(`${server!.url}/api/packs`);

    expect(await response.json()).toEqual([
      {
        id: "react-junior-en",
        technology: "React",
        level: "junior",
        language: "en",
        title: "React — Junior",
      },
    ]);
  });

  it("starts an interview: the interviewer streams a greeting and asks question 1 of 5", async () => {
    const { client, model } = await setUp();

    const turn = await client.start();

    expect(turn.status).toBe(200);
    expect(turn.events[0]).toEqual({
      type: "interview",
      interview: {
        id: expect.any(String),
        pack: { id: "react-junior-en", title: "React — Junior" },
        status: "asking",
        questionNumber: 1,
        totalQuestions: 5,
      },
    });
    expect(turn.events.filter((event) => event.type === "delta").length).toBeGreaterThan(1);
    expect(turn.text).toBe(interviewerScript[0]);
    expect(turn.interview).toMatchObject({ status: "asking", questionNumber: 1 });

    const [system] = model.calls[0]!;
    expect(system?.role).toBe("system");
    expect(system?.content).toContain("Never reveal, explain or hint at the answer");
    expect(system?.content).toContain("ask question 1: \"What is JSX");
  });

  it("moves to the next question after an answer", async () => {
    const { client, model } = await setUp();
    const { interview } = await client.start();

    const turn = await client.answer(interview!.id, "JSX is HTML-like syntax that compiles to JS.");

    expect(turn.text).toBe(interviewerScript[1]);
    expect(turn.interview).toMatchObject({ status: "asking", questionNumber: 2, totalQuestions: 5 });

    const conversation = model.calls[1]!;
    expect(conversation.at(-1)).toEqual({
      role: "user",
      content: "JSX is HTML-like syntax that compiles to JS.",
    });
    expect(conversation).toContainEqual({ role: "assistant", content: interviewerScript[0] });
    expect(conversation[0]?.content).toContain("ask question 2: \"What is the difference between props and state");
  });

  it("finishes with a closing message after the last answer", async () => {
    const { client, model } = await setUp();
    const { interview } = await client.start();
    for (let question = 1; question <= 4; question++) {
      await client.answer(interview!.id, `Answer ${question}`);
    }

    const turn = await client.answer(interview!.id, "Answer 5");

    expect(turn.text).toBe(interviewerScript[5]);
    expect(turn.interview).toMatchObject({ status: "finished", questionNumber: 5, totalQuestions: 5 });
    expect(model.calls.at(-1)![0]?.content).toContain("tell them the interview is over");

    const response = await client.get(interview!.id);
    const details = (await response.json()) as InterviewDetails;
    expect(details.status).toBe("finished");
    expect(details.transcript).toHaveLength(11);
    expect(details.transcript.at(-2)).toEqual({ role: "candidate", content: "Answer 5" });
    expect(details.transcript.at(-1)).toEqual({ role: "interviewer", content: interviewerScript[5] });

    const afterEnd = await client.answer(interview!.id, "One more thing");
    expect(afterEnd).toMatchObject({ status: 409, error: "This interview is already over." });
  });

  it("keeps the interview as it was when the AI model fails, so the answer can be sent again", async () => {
    const { client } = await setUp([
      interviewerScript[0]!,
      new Error("The provider is unreachable."),
      interviewerScript[1]!,
    ]);
    const { interview } = await client.start();

    const failed = await client.answer(interview!.id, "My answer");

    expect(failed.status).toBe(200);
    expect(failed.events.at(-1)).toEqual({ type: "error", message: "The provider is unreachable." });
    const details = (await (await client.get(interview!.id)).json()) as InterviewDetails;
    expect(details).toMatchObject({ status: "asking", questionNumber: 1 });
    expect(details.transcript).toHaveLength(1);

    const retried = await client.answer(interview!.id, "My answer");
    expect(retried.interview).toMatchObject({ questionNumber: 2 });
  });

  it("reports when the interview can't start because the AI model fails", async () => {
    const { client } = await setUp([new Error("No AI provider is configured yet.")]);

    const turn = await client.start();

    expect(turn.error).toBe("No AI provider is configured yet.");
    const interviewId = turn.events[0]?.type === "interview" ? turn.events[0].interview.id : "";
    expect((await client.get(interviewId)).status).toBe(404);
  });

  it("rejects unknown packs, unknown interviews and empty answers", async () => {
    const { client } = await setUp();

    expect(await client.start("cobol-wizard")).toMatchObject({
      status: 404,
      error: "This pack doesn't exist.",
    });
    expect(await client.answer("no-such-interview", "Hello")).toMatchObject({
      status: 404,
      error: "This interview doesn't exist.",
    });

    const { interview } = await client.start();
    expect(await client.answer(interview!.id, "   ")).toMatchObject({
      status: 400,
      error: "The answer is empty.",
    });
  });
});
