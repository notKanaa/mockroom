import { afterEach, describe, expect, it } from "vitest";
import type { InterviewDetails, TurnEvent } from "../src/server/api-types.js";
import type { RunningServer } from "../src/server/server.js";
import { followUpsPerQuestionFromEnv } from "../src/server/startup.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { startTestServer } from "./support/test-server.js";

// After each answer, the model is first asked whether to follow up (it replies
// FOLLOW-UP or NEXT), then writes the interviewer's message.
const FOLLOW_UP = "FOLLOW-UP";
const NEXT = "NEXT";

const greeting = "Hi, welcome! We'll go through 5 questions. First: what is JSX?";
const question2 = "Thanks. Question 2: what is the difference between props and state?";
const followUp1 = "Can you tell me more about what JSX turns into?";
const followUp2 = "And what happens with expressions inside the markup?";

describe("Interviewer follow-up questions", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function setUp(replies: (string | Error)[], followUpsPerQuestion?: number) {
    const model = new ScriptedModel(replies);
    server = await startTestServer({ model, followUpsPerQuestion });
    return { model, client: new InterviewClient(server.url) };
  }

  async function details(client: InterviewClient, id: string): Promise<InterviewDetails> {
    return (await (await client.get(id)).json()) as InterviewDetails;
  }

  it("follows up on an answer that misses key points, without moving on", async () => {
    const { client, model } = await setUp([greeting, FOLLOW_UP, followUp1]);
    const { interview } = await client.start();

    const turn = await client.answer(interview!.id, "It's like HTML.");

    expect(turn.text).toBe(followUp1);
    expect(turn.events[0]).toEqual({
      type: "interview",
      interview: expect.objectContaining({ status: "asking", questionNumber: 1, followUpNumber: 1 }),
    });
    expect(turn.interview).toMatchObject({ questionNumber: 1, followUpNumber: 1, totalQuestions: 5 });

    // The decision is grounded in the theme's key points and the answer.
    const [decisionSystem, decisionExchange] = model.calls[1]!;
    expect(decisionSystem?.content).toContain('The current question, on the theme "Components and JSX"');
    expect(decisionSystem?.content).toContain(
      "- It compiles to function calls (React.createElement or the jsx runtime) that create React elements",
    );
    expect(decisionSystem?.content).toContain("Reply with only one word: FOLLOW-UP or NEXT.");
    expect(decisionExchange?.content).toContain(`Interviewer: ${greeting}`);
    expect(decisionExchange?.content).toContain("Candidate: It's like HTML.");

    // The interviewer digs in without giving the answer away.
    const interviewerSystem = model.calls[2]![0]!.content;
    expect(interviewerSystem).toContain("Ask one short follow-up question on question 1");
    expect(interviewerSystem).toContain("never state, list or hint at them");
    expect(interviewerSystem).toContain("Never reveal, explain or hint at the answer");
    expect(interviewerSystem).toContain("never say or imply that it was incomplete or wrong");
    expect(interviewerSystem).not.toContain("ask question 2");

    expect((await details(client, interview!.id)).transcript).toEqual([
      { role: "interviewer", content: greeting, questionNumber: 1 },
      { role: "candidate", content: "It's like HTML.", questionNumber: 1 },
      { role: "interviewer", content: followUp1, questionNumber: 1, followUpNumber: 1 },
    ]);
  });

  it("moves straight on to the next question after a complete answer", async () => {
    const { client, model } = await setUp([greeting, NEXT, question2]);
    const { interview } = await client.start();

    const turn = await client.answer(interview!.id, "JSX is markup in JS that compiles to createElement calls.");

    expect(turn.text).toBe(question2);
    expect(turn.interview).toMatchObject({ questionNumber: 2, followUpNumber: 0 });
    expect(model.calls).toHaveLength(3);
    expect(model.calls[2]![0]?.content).toContain('ask question 2, on the theme "Props and state"');
  });

  it("moves on once the follow-up is answered well, and counts follow-ups again on the next question", async () => {
    const { client, model } = await setUp([greeting, FOLLOW_UP, followUp1, NEXT, question2, FOLLOW_UP, "Why?"]);
    const { interview } = await client.start();
    await client.answer(interview!.id, "It's like HTML.");

    const afterFollowUp = await client.answer(interview!.id, "It compiles to React.createElement calls.");
    const onQuestion2 = await client.answer(interview!.id, "Props come from the parent.");

    expect(afterFollowUp.interview).toMatchObject({ questionNumber: 2, followUpNumber: 0 });
    expect(onQuestion2.interview).toMatchObject({ questionNumber: 2, followUpNumber: 1 });
    // The second decision on question 1 sees the whole exchange on it, follow-up included.
    const exchange = model.calls[3]![1]!.content;
    expect(exchange).toContain(`Interviewer (follow-up): ${followUp1}`);
    expect(exchange).toContain("Candidate: It compiles to React.createElement calls.");
    // The decision on question 2 only sees question 2.
    expect(model.calls[5]![1]!.content).not.toContain(greeting);
  });

  it("caps follow-ups per question, then moves on without asking the model", async () => {
    const { client, model } = await setUp([greeting, FOLLOW_UP, followUp1, FOLLOW_UP, followUp2, question2]);
    const { interview } = await client.start();
    await client.answer(interview!.id, "It's like HTML.");
    const second = await client.answer(interview!.id, "Not sure.");

    const third = await client.answer(interview!.id, "Still not sure.");

    expect(second.interview).toMatchObject({ questionNumber: 1, followUpNumber: 2 });
    expect(third.text).toBe(question2);
    expect(third.interview).toMatchObject({ questionNumber: 2, followUpNumber: 0 });
    // Greeting, then two decisions and two follow-ups, then question 2 with no decision first.
    expect(model.calls).toHaveLength(6);
    expect(model.calls[5]![0]?.content).toContain("ask question 2");
  });

  it("uses the configured cap", async () => {
    const { client, model } = await setUp([greeting, FOLLOW_UP, followUp1, question2], 1);
    const { interview } = await client.start();
    await client.answer(interview!.id, "It's like HTML.");

    const turn = await client.answer(interview!.id, "Not sure.");

    expect(turn.interview).toMatchObject({ questionNumber: 2, followUpNumber: 0 });
    expect(model.calls).toHaveLength(4);
  });

  it("asks no follow-ups when they are turned off", async () => {
    const { client, model } = await setUp([greeting, question2], 0);
    const { interview } = await client.start();

    const turn = await client.answer(interview!.id, "It's like HTML.");

    expect(turn.interview).toMatchObject({ questionNumber: 2, followUpNumber: 0 });
    expect(model.calls).toHaveLength(2);
  });

  it("moves on when the model's decision can't be read", async () => {
    const { client } = await setUp([greeting, "Hmm, hard to say.", question2]);
    const { interview } = await client.start();

    const turn = await client.answer(interview!.id, "It's like HTML.");

    expect(turn.interview).toMatchObject({ questionNumber: 2, followUpNumber: 0 });
  });

  it("keeps the interview as it was when the decision fails, so the answer can be sent again", async () => {
    const { client } = await setUp([greeting, new Error("The provider is unreachable."), FOLLOW_UP, followUp1]);
    const { interview } = await client.start();

    const failed = await client.answer(interview!.id, "It's like HTML.");

    expect(failed.events).toEqual<TurnEvent[]>([{ type: "error", message: "The provider is unreachable." }]);
    const before = await details(client, interview!.id);
    expect(before).toMatchObject({ questionNumber: 1, followUpNumber: 0 });
    expect(before.transcript).toHaveLength(1);

    const retried = await client.answer(interview!.id, "It's like HTML.");
    expect(retried.interview).toMatchObject({ questionNumber: 1, followUpNumber: 1 });
  });

  it("can follow up on the last question before closing the interview", async () => {
    const { client } = await setUp([
      greeting,
      ...["Q2", "Q3", "Q4", "Q5"].flatMap((question) => [NEXT, question]),
      FOLLOW_UP,
      "An example?",
      NEXT,
      "Bye!",
    ]);
    const { interview } = await client.start();
    for (let question = 1; question <= 4; question++) await client.answer(interview!.id, `Answer ${question}`);

    const followUp = await client.answer(interview!.id, "Answer 5");
    const closing = await client.answer(interview!.id, "Here's an example.");

    expect(followUp.interview).toMatchObject({ status: "asking", questionNumber: 5, followUpNumber: 1 });
    expect(closing.text).toBe("Bye!");
    expect(closing.interview).toMatchObject({ status: "finished", questionNumber: 5, followUpNumber: 0 });
    expect((await details(client, interview!.id)).transcript.at(-1)).toEqual({ role: "interviewer", content: "Bye!" });
  });

  it("groups follow-ups with their main question in the debrief, without counting them as questions", async () => {
    const debriefReply = JSON.stringify({
      questions: [1, 2].map((number) => ({
        number,
        strengths: [`Strength ${number}`],
        gaps: [`Gap ${number}`],
        modelAnswer: `Model answer ${number}.`,
        resource: 1,
      })),
      summary: "Well done!",
    });
    const { client, model } = await setUp([
      greeting,
      FOLLOW_UP,
      followUp1,
      NEXT,
      question2,
      NEXT,
      "Question 3: how does useEffect work?",
      debriefReply,
    ]);
    const { interview } = await client.start();
    const id = interview!.id;
    await client.answer(id, "It's like HTML.");
    await client.answer(id, "It compiles to createElement calls.");
    await client.answer(id, "Props come from the parent; state is internal.");
    await client.end(id);

    const { body: debrief } = await client.debrief(id);

    expect(debrief?.questions.map(({ number, theme }) => ({ number, theme }))).toEqual([
      { number: 1, theme: "Components and JSX" },
      { number: 2, theme: "Props and state" },
    ]);
    const [system, transcript] = model.calls.at(-1)!;
    expect(system?.content).toContain("after answering 2 of the 5 questions");
    expect(system?.content).toContain("Never write a separate entry for a follow-up.");
    expect(transcript?.content).toContain(
      [
        "Question 1",
        `Interviewer: ${greeting}`,
        "Candidate: It's like HTML.",
        `Interviewer (follow-up): ${followUp1}`,
        "Candidate: It compiles to createElement calls.",
      ].join("\n\n"),
    );
    expect(transcript?.content).toContain(
      ["Question 2", `Interviewer: ${question2}`, "Candidate: Props come from the parent; state is internal."].join(
        "\n\n",
      ),
    );
  });
});

describe("Follow-up setting from environment variables", () => {
  it("uses the default when MOCKROOM_FOLLOW_UPS is unset", () => {
    expect(followUpsPerQuestionFromEnv({})).toBeUndefined();
  });

  it("reads a whole number, 0 included", () => {
    expect(followUpsPerQuestionFromEnv({ MOCKROOM_FOLLOW_UPS: " 3 " })).toBe(3);
    expect(followUpsPerQuestionFromEnv({ MOCKROOM_FOLLOW_UPS: "0" })).toBe(0);
  });

  it("rejects anything else", () => {
    expect(() => followUpsPerQuestionFromEnv({ MOCKROOM_FOLLOW_UPS: "lots" })).toThrow(
      'MOCKROOM_FOLLOW_UPS is "lots". Use a whole number, such as 2, or 0 to turn follow-ups off.',
    );
  });
});
