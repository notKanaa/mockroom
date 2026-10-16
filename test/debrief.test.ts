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

/** What the model would say about question `number`, as an entry of its JSON debrief. */
function feedback(number: number, resource = 1) {
  return {
    number,
    strengths: [`Strength ${number}`],
    gaps: [`Gap ${number}`],
    modelAnswer: `Model answer ${number}.`,
    resource,
  };
}

function debriefReply(questions: object[], extra: object = {}): string {
  return JSON.stringify({ questions, summary: "Great effort! Next, review effects.", ...extra });
}

describe("Debrief API", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function setUp(replies: (string | Error)[]) {
    const model = new ScriptedModel(replies);
    // Follow-ups are off here, so each answer gets one interviewer reply. See follow-ups.test.ts.
    server = await startTestServer({ model, followUpsPerQuestion: 0 });
    return { model, client: new InterviewClient(server.url) };
  }

  /** Starts an interview and answers its first `count` questions. */
  async function answerQuestions(client: InterviewClient, count: number): Promise<string> {
    const { interview } = await client.start();
    for (let question = 1; question <= count; question++) {
      await client.answer(interview!.id, `Answer ${question}`);
    }
    return interview!.id;
  }

  it("gives feedback on every question after the last one, with a resource from the pack", async () => {
    const { client, model } = await setUp([
      ...interviewerScript,
      // A score slipped into the reply is not passed on.
      debriefReply([1, 2, 3, 4, 5].map((number) => feedback(number, number === 2 ? 2 : 1)), { score: 7 }),
    ]);
    const id = await answerQuestions(client, 5);

    const { status, body: debrief } = await client.debrief(id);

    expect(status).toBe(200);
    expect(debrief).toEqual({
      endedEarly: false,
      summary: "Great effort! Next, review effects.",
      questions: [
        {
          number: 1,
          theme: "Components and JSX",
          question: "What is JSX, and what does it become once your code is compiled?",
          strengths: ["Strength 1"],
          gaps: ["Gap 1"],
          modelAnswer: "Model answer 1.",
          resource: { title: "Writing Markup with JSX", url: "https://react.dev/learn/writing-markup-with-jsx" },
        },
        expect.objectContaining({
          number: 2,
          theme: "Props and state",
          resource: { title: "State: A Component's Memory", url: "https://react.dev/learn/state-a-components-memory" },
        }),
        expect.objectContaining({ number: 3, theme: "Effects" }),
        expect.objectContaining({ number: 4, theme: "Lists and keys" }),
        expect.objectContaining({ number: 5, theme: "Forms" }),
      ],
    });

    const [system, transcript] = model.calls.at(-1)!;
    expect(system?.content).toContain("The candidate answered all 5 questions");
    expect(system?.content).toContain("- Props are passed in by the parent and are read-only for the component");
    expect(system?.content).toContain("2. State: A Component's Memory (https://react.dev/learn/state-a-components-memory)");
    expect(system?.content).toContain("Never give a score, grade, mark, percentage or rating");
    expect(transcript?.content).toContain("Candidate: Answer 5");
    expect(transcript?.content).toContain(`Interviewer: ${interviewerScript[0]}`);
  });

  it("writes the debrief once and keeps it with the interview", async () => {
    const { client, model } = await setUp([
      ...interviewerScript,
      debriefReply([1, 2, 3, 4, 5].map((number) => feedback(number))),
    ]);
    const id = await answerQuestions(client, 5);

    const first = await client.debrief(id);
    const again = await client.debrief(id);

    expect(again.body).toEqual(first.body);
    expect(model.calls).toHaveLength(7);
    const details = (await (await client.get(id)).json()) as InterviewDetails;
    expect(details.debrief).toEqual(first.body);
  });

  it("ends the interview early and covers only the questions answered", async () => {
    const { client, model } = await setUp([
      ...interviewerScript.slice(0, 3),
      // The model also comments on question 3, which was asked but not answered.
      debriefReply([feedback(1), feedback(2, 9), feedback(3)]),
    ]);
    const id = await answerQuestions(client, 2);

    const ended = await client.end(id);

    expect(ended).toMatchObject({ status: 200, body: { status: "finished", questionNumber: 3, totalQuestions: 5 } });
    expect(await client.answer(id, "Answer 3")).toMatchObject({
      status: 409,
      error: "This interview is already over.",
    });

    const { body: debrief } = await client.debrief(id);

    expect(debrief?.endedEarly).toBe(true);
    expect(debrief?.questions.map((question) => question.theme)).toEqual(["Components and JSX", "Props and state"]);
    // A resource number that isn't in the pack falls back to the theme's first resource.
    expect(debrief?.questions[1]?.resource?.title).toBe("Passing Props to a Component");

    const system = model.calls.at(-1)![0]?.content;
    expect(system).toContain("ended the interview early, after answering 2 of the 5 questions");
    expect(system).toContain('Question 2, on the theme "Props and state"');
    expect(system).not.toContain('on the theme "Effects"');
  });

  it("gives an empty debrief without calling the model when no question was answered", async () => {
    const { client, model } = await setUp(interviewerScript.slice(0, 1));
    const id = await answerQuestions(client, 0);

    await client.end(id);
    const { body: debrief } = await client.debrief(id);

    expect(debrief).toEqual({ endedEarly: true, questions: [], summary: "" });
    expect(model.calls).toHaveLength(1);
  });

  it("asks the model again once when its debrief is malformed", async () => {
    const { client, model } = await setUp([
      ...interviewerScript.slice(0, 2),
      "Here is your debrief: the candidate did well!",
      "```json\n" + debriefReply([feedback(1)]) + "\n```",
    ]);
    const id = await answerQuestions(client, 1);
    await client.end(id);

    const { status, body: debrief } = await client.debrief(id);

    expect(status).toBe(200);
    expect(debrief?.questions).toHaveLength(1);
    const retry = model.calls.at(-1)!;
    expect(retry.at(-2)).toEqual({ role: "assistant", content: "Here is your debrief: the candidate did well!" });
    expect(retry.at(-1)?.content).toContain("Mockroom couldn't read that debrief: it contains no JSON object");
  });

  it("accepts the looser debriefs small local models write: no summary, numbers as text", async () => {
    const { client, model } = await setUp([
      ...interviewerScript.slice(0, 3),
      JSON.stringify({ questions: [{ ...feedback(1), number: "1" }, feedback(2)], summary: "" }),
    ]);
    const id = await answerQuestions(client, 2);
    await client.end(id);

    const { status, body: debrief } = await client.debrief(id);

    expect(status).toBe(200);
    expect(debrief?.summary).toBe("");
    expect(debrief?.questions.map((question) => question.number)).toEqual([1, 2]);
    expect(model.calls).toHaveLength(4);
  });

  it("repairs the broken JSON small local models write: trailing commas, missing closing brackets", async () => {
    // As llama3.2 writes it: a trailing comma, and the reply stops before the last brackets.
    const broken = `{"questions":[{"number":1,"strengths":["Knows JSX",],"gaps":[],"modelAnswer":"JSX compiles to function calls.","resource":1}],"summary":"Well done`;
    const { client, model } = await setUp([...interviewerScript.slice(0, 2), broken]);
    const id = await answerQuestions(client, 1);
    await client.end(id);

    const { status, body: debrief } = await client.debrief(id);

    expect(status).toBe(200);
    expect(debrief?.questions[0]).toMatchObject({ strengths: ["Knows JSX"], modelAnswer: "JSX compiles to function calls." });
    expect(debrief?.summary).toBe("Well done");
    expect(model.calls).toHaveLength(3);
  });

  it("reports a clear error when the debrief is malformed twice, and can try again", async () => {
    const { client } = await setUp([
      ...interviewerScript.slice(0, 2),
      debriefReply([{ ...feedback(1), gaps: "Everything" }]),
      debriefReply([]),
      debriefReply([feedback(1)]),
    ]);
    const id = await answerQuestions(client, 1);
    await client.end(id);

    const failed = await client.debrief(id);

    expect(failed.status).toBe(502);
    expect(failed.error).toBe(
      "The AI model sent a debrief Mockroom couldn't read, even after a second try (question 1 is missing). Try again, or switch to a more capable model.",
    );

    const retried = await client.debrief(id);
    expect(retried.status).toBe(200);
    expect(retried.body?.questions).toHaveLength(1);
  });

  it("reports when the AI model fails while writing the debrief", async () => {
    const { client } = await setUp([...interviewerScript.slice(0, 2), new Error("The provider is unreachable.")]);
    const id = await answerQuestions(client, 1);
    await client.end(id);

    expect(await client.debrief(id)).toMatchObject({
      status: 502,
      error: "The debrief couldn't be written: The provider is unreachable.",
    });
  });

  it("refuses a debrief before the interview is over, and unknown or finished interviews", async () => {
    const { client } = await setUp(interviewerScript.slice(0, 1));
    const id = await answerQuestions(client, 0);

    expect(await client.debrief(id)).toMatchObject({ status: 409, error: "The interview isn't over yet." });
    expect(await client.end("no-such-interview")).toMatchObject({
      status: 404,
      error: "This interview doesn't exist.",
    });
    await client.end(id);
    expect(await client.end(id)).toMatchObject({ status: 409, error: "This interview is already over." });
  });
});
