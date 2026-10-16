import { useEffect, useState } from "react";
import type { HistoryEntry, SavedInterview, TranscriptEntry } from "../server/api-types";
import { deleteSavedInterview, fetchSavedInterview } from "./api";
import { DebriefDetails } from "./DebriefView";
import { formatDateTime, interviewTitle, useI18n } from "./i18n";
import type { UIMessages } from "./messages";
import { TrashIcon } from "./Icons";
import { Banner, Button, PageHeader } from "./kit";
import { Message } from "./Message";
import { RecruiterBadge, recruiterFor, type Recruiter } from "./Recruiter";

interface SavedInterviewViewProps {
  interviewId: string;
  onDeleted: () => void;
}

type Tab = "debrief" | "transcript";

/** A past interview, opened from the sidebar: its debrief and its whole transcript. */
export function SavedInterviewView({ interviewId, onDeleted }: SavedInterviewViewProps) {
  const [interview, setInterview] = useState<SavedInterview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("debrief");
  const [deleting, setDeleting] = useState(false);
  const { language, t } = useI18n();

  useEffect(() => {
    setInterview(null);
    setError(null);
    setTab("debrief");
    fetchSavedInterview(interviewId)
      .then((saved) => {
        setInterview(saved);
        if (!saved.debrief) setTab("transcript");
      })
      .catch((failure: Error) => setError(failure.message));
  }, [interviewId]);

  async function remove() {
    if (!window.confirm(t.history.deletePrompt)) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteSavedInterview(interviewId);
      onDeleted();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setDeleting(false);
    }
  }

  const recruiter = recruiterFor(interviewId, t);

  return (
    <main className="page">
      {error && <Banner tone="error">{error}</Banner>}
      {!interview && !error && <p className="page-status">{t.history.loadingInterview}</p>}

      {interview && (
        <>
          <PageHeader
            lead={<RecruiterBadge recruiter={recruiter} detail={interviewTitle(interview, t)} />}
            title={formatDateTime(interview.startedAt, language)}
            intro={`${t.history.interviewIn(t.languageNames[interview.language])} · ${progressLabel(interview, t)}`}
          />

          <div
            className="tabs"
            role="tablist"
            aria-label={t.history.tabs}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              const next = tab === "debrief" ? "transcript" : "debrief";
              setTab(next);
              document.getElementById(`tab-${next}`)?.focus();
            }}
          >
            <TabButton tab="debrief" current={tab} onSelect={setTab}>
              {t.history.debriefTab}
            </TabButton>
            <TabButton tab="transcript" current={tab} onSelect={setTab}>
              {t.history.transcriptTab}
            </TabButton>
          </div>

          <section id={`tabpanel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="tabpanel">
            {tab === "debrief" &&
              (interview.debrief ? (
                <DebriefDetails
                  debrief={interview.debrief}
                  totalQuestions={interview.totalQuestions}
                  recruiter={recruiter}
                />
              ) : (
                <Banner>{t.history.missingDebrief}</Banner>
              ))}
            {tab === "transcript" && <Transcript interview={interview} recruiter={recruiter} />}
          </section>

          <footer className="page-footer">
            <Button variant="danger" icon={<TrashIcon />} onClick={() => void remove()} disabled={deleting}>
              {deleting ? t.common.deleting : t.history.deleteInterview}
            </Button>
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
      id={`tab-${tab}`}
      aria-selected={tab === current}
      tabIndex={tab === current ? 0 : -1}
      aria-controls={`tabpanel-${tab}`}
      className="tab"
      onClick={() => onSelect(tab)}
    >
      {children}
    </button>
  );
}

/** The whole conversation, grouped under each main question with its follow-ups. */
function Transcript({ interview, recruiter }: { interview: SavedInterview; recruiter: Recruiter }) {
  const { t } = useI18n();
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
              <h2 className="transcript-heading">
                {t.common.question(group.questionNumber)}
                {theme && ` · ${theme}`}
              </h2>
            )}
            <ol className="chat">
              {group.messages.map((message, messageIndex) => (
                <Message key={messageIndex} message={message} recruiter={recruiter} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function progressLabel(
  { endedEarly, answeredQuestions, totalQuestions }: HistoryEntry | SavedInterview,
  t: UIMessages,
): string {
  return endedEarly ? t.history.endedEarly(answeredQuestions, totalQuestions) : t.history.allAnswered(totalQuestions);
}
