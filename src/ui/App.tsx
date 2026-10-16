import { useEffect, useState } from "react";
import type { InterviewRequest, PackSummary } from "../server/api-types";
import { fetchSettings, listPacks } from "./api";
import { DebriefView } from "./DebriefView";
import { HistoryList, SavedInterviewView } from "./History";
import { LanguageSwitch, useI18n } from "./i18n";
import { InterviewRoom } from "./InterviewRoom";
import { InterviewSetup } from "./InterviewSetup";
import { Settings } from "./Settings";
import { useInterview } from "./useInterview";

/** Where the candidate is when no interview is going on, or settings opened during one. */
type Screen =
  | { name: "loading" }
  | { name: "home" }
  | { name: "history" }
  | { name: "saved"; interviewId: string }
  | { name: "settings"; firstLaunch: boolean };

export function App() {
  return (
    <>
      <LanguageSwitch />
      <CurrentScreen />
    </>
  );
}

function CurrentScreen() {
  const session = useInterview();
  const [screen, setScreen] = useState<Screen>({ name: "loading" });

  // On first launch, with no AI provider set up, the candidate starts in the settings.
  useEffect(() => {
    fetchSettings()
      .then((settings) => setScreen(settings.configured ? { name: "home" } : { name: "settings", firstLaunch: true }))
      .catch(() => setScreen({ name: "home" }));
  }, []);

  const openSettings = () => setScreen({ name: "settings", firstLaunch: false });

  if (screen.name === "loading") return null;
  // Settings can be opened in the middle of an interview, which picks up where it was afterwards.
  if (screen.name === "settings") {
    return <Settings firstLaunch={screen.firstLaunch} onBack={() => setScreen({ name: "home" })} />;
  }
  if (session.interview && session.debrief.debrief) {
    return (
      <DebriefView
        interview={session.interview}
        debrief={session.debrief.debrief}
        onDone={session.reset}
      />
    );
  }
  if (session.interview) return <InterviewRoom session={session} onOpenSettings={openSettings} />;
  if (screen.name === "history") {
    return (
      <HistoryList
        onOpen={(interviewId) => setScreen({ name: "saved", interviewId })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }
  if (screen.name === "saved") {
    return <SavedInterviewView interviewId={screen.interviewId} onBack={() => setScreen({ name: "history" })} />;
  }
  return (
    <Home
      starting={session.streaming}
      error={session.error}
      onStart={session.start}
      onShowHistory={() => setScreen({ name: "history" })}
      onOpenSettings={openSettings}
    />
  );
}

interface HomeProps {
  starting: boolean;
  error: string | null;
  onStart: (request: InterviewRequest) => void;
  onShowHistory: () => void;
  onOpenSettings: () => void;
}

function Home({ starting, error, onStart, onShowHistory, onOpenSettings }: HomeProps) {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    listPacks()
      .then(setPacks)
      .catch((failure: Error) => setLoadError(failure.message));
  }, []);

  return (
    <main className="home">
      <h1>Mockroom</h1>
      <p className="tagline">{t.home.tagline}</p>
      <p className="home-actions">
        <button type="button" className="secondary-button" onClick={onShowHistory}>
          {t.home.pastInterviews}
        </button>
        <button type="button" className="secondary-button" onClick={onOpenSettings}>
          {t.common.settings}
        </button>
      </p>

      {loadError && (
        <p className="status status-unreachable" role="alert">
          {loadError}
        </p>
      )}
      {!packs && !loadError && <p className="status">{t.home.connecting}</p>}

      {error && (
        <p className="status status-unreachable" role="alert">
          {error}{" "}
          <button type="button" className="link-button" onClick={onOpenSettings}>
            {t.common.openSettings}
          </button>
        </p>
      )}
      {packs && <InterviewSetup packs={packs} starting={starting} onStart={onStart} />}
    </main>
  );
}
