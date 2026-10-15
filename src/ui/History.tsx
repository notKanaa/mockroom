import { useEffect, useState } from "react";
import type { HistoryEntry, SavedInterview, TranscriptEntry } from "../server/api-types";
import { deleteSavedInterview, fetchSavedInterview, listHistory } from "./api";
import { DebriefDetails } from "./DebriefView";
import { formatDateTime, languageLabels } from "./labels";
import { Message } from "./Message";

const deletePrompt = "Delete this interview from your history? Its transcript and debrief will be gone for good.";

interface HistoryListProps {
  onOpen: (interviewId: string) => void;
  onBack: () => void;
}

/** The past interviews saved on this machine, most recent first. */
export function HistoryList({ onOpen, onBack }: HistoryListProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listHistory()
      .then(setEntries)
      .catch((failure: Error) => setError(failure.message));
  }, []);

  async function remove(entry: HistoryEntry) {
    if (!window.confirm(deletePrompt)) return;
    setError(null);
    setDeletingId(entry.id);
    try {
      await deleteSavedInterview(entry.id);
      setEntries((current) => current?.filter((candidate) => candidate.id !== entry.id) ?? null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="history">
      <header className="history-header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Back to packs
        </button>
        <h1>Past interviews</h1>
        <p className="history-note">Saved on this computer only. Nothing is sent anywhere.</p>
      </header>

      {error && (
        <p className="status status-unreachable" role="alert">
          {error}
        </p>
      )}
      {!entries && !error && <p className="status">Loading your interviews…</p>}
      {entries?.length === 0 && (
        <p className="history-note">No interview yet. Once you finish or end one, it shows up here.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="packs">
          {entries.map((entry) => (
            <li key={entry.id} className="pack">
              <div className="pack-info">
                <p className="pack-title">{entry.packs.map((pack) => pack.title).join(" + ")}</p>
                <p className="pack-meta">
                  {formatDateTime(entry.startedAt)} · {languageLabels[entry.language]}
                </p>
                <p className="pack-themes">
                  {progressLabel(entry)}
                  {!entry.hasDebrief && " · No debrief"}
                </p>
              </div>
              <div className="history-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void remove(entry)}
                  disabled={deletingId === entry.id}
                >
                  {deletingId === entry.id ? "Deleting…" : "Delete"}
                </button>
                <button type="button" onClick={() => onOpen(entry.id)}>
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

interface SavedInterviewViewProps {
  interviewId: string;
  onBack: () => void;
}

type Tab = "debrief" | "transcript";

/** A past interview, read back from the history: its debrief and its whole transcript. */
export function SavedInterviewView({ interviewId, onBack }: SavedInterviewViewProps) {
  const [interview, setInterview] = useState<SavedInterview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("debrief");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSavedInterview(interviewId)
      .then((saved) => {
        setInterview(saved);
        if (!saved.debrief) setTab("transcript");
      })
      .catch((failure: Error) => setError(failure.message));
  }, [interviewId]);

  async function remove() {
    if (!window.confirm(deletePrompt)) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteSavedInterview(interviewId);
      onBack();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setDeleting(false);
    }
  }

  return (
    <main className="debrief">
      <header className="debrief-header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Past interviews
        </button>
        {interview && (
          <>
            <p className="room-pack history-pack">{interview.packs.map((pack) => pack.title).join(" + ")}</p>
            <h1>{formatDateTime(interview.startedAt)}</h1>
            <p className="history-note">
              {languageLabels[interview.language]} · {progressLabel(interview)}
            </p>
          </>
        )}
      </header>

      {error && (
        <p className="status status-unreachable" role="alert">
          {error}
        </p>
      )}
      {!interview && !error && <p className="status">Loading the interview…</p>}

      {interview && (
        <>
          <div className="tabs" role="tablist" aria-label="Interview">
            <TabButton tab="debrief" current={tab} onSelect={setTab}>
              Debrief
            </TabButton>
            <TabButton tab="transcript" current={tab} onSelect={setTab}>
              Transcript
            </TabButton>
          </div>

          <section role="tabpanel" aria-label={tab === "debrief" ? "Debrief" : "Transcript"}>
            {tab === "debrief" &&
              (interview.debrief ? (
                <DebriefDetails debrief={interview.debrief} totalQuestions={interview.totalQuestions} />
              ) : (
                <p className="debrief-note">
                  This interview has no debrief: it couldn't be written, or Mockroom was closed before it was ready.
                  The transcript is still here.
                </p>
              ))}
            {tab === "transcript" && <Transcript interview={interview} />}
          </section>

          <footer className="debrief-footer">
            <button type="button" className="secondary-button" onClick={() => void remove()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete this interview"}
            </button>
          </footer>
        </>
      )}
    </main>
  );
}

interface TabButtonProps {
  tab: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  children: string;
}

function TabButton({ tab, current, onSelect, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={tab === current}
      className={tab === current ? "tab tab-current" : "tab"}
      onClick={() => onSelect(tab)}
    >
      {children}
    </button>
  );
}

/** The whole conversation, grouped under each main question with its follow-ups. */
function Transcript({ interview }: { interview: SavedInterview }) {
  const groups: { questionNumber?: number; messages: TranscriptEntry[] }[] = [];
  for (const message of interview.transcript) {
    const last = groups.at(-1);
    if (last && last.questionNumber === message.questionNumber) last.messages.push(message);
    else groups.push({ questionNumber: message.questionNumber, messages: [message] });
  }

  return (
    <div className="transcript">
      {groups.map((group, index) => {
        const theme = interview.debrief?.questions.find((question) => question.number === group.questionNumber)?.theme;
        return (
          <section key={index} className="transcript-group">
            {group.questionNumber !== undefined && (
              <h2 className="feedback-theme">
                Question {group.questionNumber}
                {theme && ` · ${theme}`}
              </h2>
            )}
            <ol className="transcript-messages">
              {group.messages.map((message, messageIndex) => (
                <Message key={messageIndex} message={message} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function progressLabel({ endedEarly, answeredQuestions, totalQuestions }: HistoryEntry | SavedInterview): string {
  if (!endedEarly) return `All ${totalQuestions} questions answered`;
  return `Ended early · ${answeredQuestions} of ${totalQuestions} questions answered`;
}
