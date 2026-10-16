import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SavedInterview } from "../src/server/api-types.js";
import { mockroomDataDir } from "../src/server/data-dir.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { makeTemporaryDataDir, startTestServer, type TestServer } from "./support/test-server.js";

const interviewerScript = [
  "Hi, welcome! We'll go through 5 questions. First: what is JSX?",
  "Thanks. Question 2: what is the difference between props and state?",
  "Thanks. Question 3: how does useEffect work?",
  "Thanks. Question 4: why does React need keys in lists?",
  "Thanks. Question 5: what is a controlled input?",
  "Thank you, that's the end of the interview.",
];

const reactPack = { id: "react-junior-en", title: "React — Junior", technology: "React", level: "junior" };

function debriefReply(numbers: number[]): string {
  return JSON.stringify({
    questions: numbers.map((number) => ({
      number,
      strengths: [`Strength ${number}`],
      gaps: [`Gap ${number}`],
      modelAnswer: `Model answer ${number}.`,
      resource: 1,
    })),
    summary: "Great effort!",
  });
}

/** A clock that moves one minute forward each time it is read, from 9:00 on 15 October 2026. */
function steppingClock(): () => Date {
  let minutes = 0;
  return () => new Date(Date.UTC(2026, 9, 15, 9, minutes++));
}

describe("Interview history API", () => {
  const servers: TestServer[] = [];
  const folders: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(servers.splice(0).map((server) => server.close()));
    await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
  });

  async function setUp(replies: (string | Error)[], options: { followUpsPerQuestion?: number; dataDir?: string } = {}) {
    const server = await startTestServer({
      model: new ScriptedModel(replies),
      followUpsPerQuestion: options.followUpsPerQuestion ?? 0,
      dataDir: options.dataDir,
      now: steppingClock(),
    });
    servers.push(server);
    return { server, client: new InterviewClient(server.url) };
  }

  /** A data folder that outlives one server, deleted after the test. */
  async function sharedDataDir(): Promise<string> {
    const folder = await makeTemporaryDataDir();
    folders.push(folder);
    return folder;
  }

  /** Plays a whole interview: every question answered, then the debrief. */
  async function playFullInterview(client: InterviewClient): Promise<string> {
    const { interview } = await client.start();
    for (let question = 1; question <= 5; question++) await client.answer(interview!.id, `Answer ${question}`);
    await client.debrief(interview!.id);
    return interview!.id;
  }

  it("saves a finished interview with its setup, transcript and debrief", async () => {
    const { client, server } = await setUp([...interviewerScript, debriefReply([1, 2, 3, 4, 5])]);
    const { interview } = await client.start();
    const id = interview!.id;
    for (let question = 1; question <= 5; question++) await client.answer(id, `Answer ${question}`);

    // Saved as soon as the interview is over, before the debrief is written.
    expect((await client.history()).body).toEqual([
      {
        id,
        startedAt: "2026-10-15T09:00:00.000Z",
        finishedAt: "2026-10-15T09:01:00.000Z",
        packs: [reactPack],
        technologies: [],
        uncurated: [],
        level: "junior",
        language: "en",
        totalQuestions: 5,
        answeredQuestions: 5,
        endedEarly: false,
        hasDebrief: false,
      },
    ]);

    const { body: debrief } = await client.debrief(id);
    const { status, body: saved } = await client.savedInterview(id);

    expect(status).toBe(200);
    expect(saved).toMatchObject({
      formatVersion: 1,
      id,
      packs: [reactPack],
      language: "en",
      endedEarly: false,
      debrief,
    });
    expect(saved?.debrief?.questions).toHaveLength(5);
    expect(saved?.transcript).toHaveLength(11);
    expect(saved?.transcript.at(-2)).toEqual({ role: "candidate", content: "Answer 5", questionNumber: 5 });
    expect(saved?.transcript.at(-1)).toEqual({ role: "interviewer", content: interviewerScript[5] });
    expect((await client.history()).body?.[0]?.hasDebrief).toBe(true);

    // One plain JSON file per interview, in the data folder.
    const file = JSON.parse(await readFile(join(server.dataDir, "interviews", `${id}.json`), "utf8")) as SavedInterview;
    expect(file).toEqual(saved);
  });

  it("saves an interview ended early, follow-ups included", async () => {
    const followUp = "Can you tell me more about what JSX turns into?";
    const { client } = await setUp(
      [interviewerScript[0]!, "FOLLOW-UP", followUp, interviewerScript[1]!, debriefReply([1])],
      { followUpsPerQuestion: 1 },
    );
    const { interview } = await client.start();
    const id = interview!.id;
    await client.answer(id, "It's like HTML.");
    await client.answer(id, "It becomes createElement calls.");

    await client.end(id);
    const { body: debrief } = await client.debrief(id);
    const { body: saved } = await client.savedInterview(id);

    expect(saved).toMatchObject({ endedEarly: true, answeredQuestions: 1, totalQuestions: 5, debrief });
    expect(saved?.debrief?.endedEarly).toBe(true);
    expect(saved?.transcript).toEqual([
      { role: "interviewer", content: interviewerScript[0], questionNumber: 1 },
      { role: "candidate", content: "It's like HTML.", questionNumber: 1 },
      { role: "interviewer", content: followUp, questionNumber: 1, followUpNumber: 1 },
      { role: "candidate", content: "It becomes createElement calls.", questionNumber: 1 },
      { role: "interviewer", content: interviewerScript[1], questionNumber: 2 },
    ]);
  });

  it("lists past interviews most recent first, and keeps them when Mockroom restarts", async () => {
    const dataDir = await sharedDataDir();
    const first = await setUp([...interviewerScript, debriefReply([1, 2, 3, 4, 5])], { dataDir });
    const olderId = await playFullInterview(first.client);
    await servers.pop()!.close();

    // The restarted server's clock starts again at 9:00, so use one that is a day ahead.
    const later = await startTestServer({
      model: new ScriptedModel([...interviewerScript.slice(0, 2), interviewerScript[0]!]),
      followUpsPerQuestion: 0,
      dataDir,
      now: () => new Date(Date.UTC(2026, 9, 16, 9, 0)),
    });
    servers.push(later);
    const client = new InterviewClient(later.url);
    const { interview } = await client.start();
    await client.answer(interview!.id, "Answer 1");
    await client.end(interview!.id);

    // An interview still in progress isn't in the history.
    await client.start();

    const { status, body: entries } = await client.history();

    expect(status).toBe(200);
    expect(entries?.map((entry) => entry.id)).toEqual([interview!.id, olderId]);
    expect(entries?.[0]).toMatchObject({ endedEarly: true, answeredQuestions: 1, hasDebrief: false });
    expect((await client.savedInterview(olderId)).body?.debrief?.questions).toHaveLength(5);
  });

  it("deletes an interview's file, and forgets it for good", async () => {
    const { client, server } = await setUp([
      ...interviewerScript,
      debriefReply([1, 2, 3, 4, 5]),
      ...interviewerScript.slice(0, 2),
      debriefReply([1]),
    ]);
    const keptId = await playFullInterview(client);
    const { interview } = await client.start();
    const id = interview!.id;
    await client.answer(id, "Answer 1");
    await client.end(id);
    const file = join(server.dataDir, "interviews", `${id}.json`);
    expect(existsSync(file)).toBe(true);

    expect(await client.deleteSavedInterview(id)).toEqual({ status: 204 });

    expect(existsSync(file)).toBe(false);
    expect((await client.history()).body?.map((entry) => entry.id)).toEqual([keptId]);
    expect(await client.savedInterview(id)).toEqual({ status: 404, error: "This interview isn't in your history." });
    expect(await client.deleteSavedInterview(id)).toEqual({
      status: 404,
      error: "This interview isn't in your history.",
    });

    // Its debrief, written after the delete, doesn't bring it back.
    expect((await client.debrief(id)).status).toBe(200);
    expect(existsSync(file)).toBe(false);
  });

  it("refuses unknown interviews and ids that aren't interview ids", async () => {
    const { client } = await setUp([]);

    expect(await client.history()).toEqual({ status: 200, body: [] });
    for (const id of ["0b6d1c1e-6f1e-4a52-9a43-2c1d3e4f5a6b", "not-an-id", "..%2F..%2Fsecret"]) {
      expect(await client.savedInterview(id)).toEqual({ status: 404, error: "This interview isn't in your history." });
      expect((await client.deleteSavedInterview(id)).status).toBe(404);
    }
  });

  it("leaves a damaged file out of the list, and says so when it is opened", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client, server } = await setUp([...interviewerScript, debriefReply([1, 2, 3, 4, 5])]);
    const id = await playFullInterview(client);
    const damagedId = "0b6d1c1e-6f1e-4a52-9a43-2c1d3e4f5a6b";
    const damaged = join(server.dataDir, "interviews", `${damagedId}.json`);
    await writeFile(damaged, '{"formatVersion": 1, "id": "0b6d', "utf8");

    expect((await client.history()).body?.map((entry) => entry.id)).toEqual([id]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(damaged));
    expect(await client.savedInterview(damagedId)).toEqual({
      status: 500,
      error: `The saved interview ${damaged} is damaged or from an unknown version, so it was skipped.`,
    });
  });

  it("still finishes the interview and writes the debrief when saving fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // A file where the data folder should be: nothing can be saved under it.
    const blocked = join(await sharedDataDir(), "not-a-folder");
    await writeFile(blocked, "", "utf8");
    const { client } = await setUp([...interviewerScript.slice(0, 2), debriefReply([1])], { dataDir: blocked });
    const { interview } = await client.start();
    await client.answer(interview!.id, "Answer 1");

    expect((await client.end(interview!.id)).status).toBe(200);
    expect((await client.debrief(interview!.id)).body?.questions).toHaveLength(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("This interview couldn't be saved to the history"));
  });
});

describe("Mockroom data folder", () => {
  it("is MOCKROOM_DATA_DIR when it is set", () => {
    const folder = join(process.cwd(), "some-data");
    expect(mockroomDataDir({ MOCKROOM_DATA_DIR: "some-data" }, "linux", "/home/ada")).toBe(folder);
  });

  it("is the usual place for app data on each system", () => {
    expect(mockroomDataDir({ APPDATA: "C:\\Users\\Ada\\AppData\\Roaming" }, "win32", "C:\\Users\\Ada")).toBe(
      join("C:\\Users\\Ada\\AppData\\Roaming", "Mockroom"),
    );
    expect(mockroomDataDir({}, "darwin", "/Users/ada")).toBe(join("/Users/ada", "Library", "Application Support", "Mockroom"));
    expect(mockroomDataDir({}, "linux", "/home/ada")).toBe(join("/home/ada", ".local", "share", "mockroom"));
    expect(mockroomDataDir({ XDG_DATA_HOME: "/data/ada" }, "linux", "/home/ada")).toBe(join("/data/ada", "mockroom"));
  });
});
