import { useEffect, useState } from "react";
import type { PackSummary } from "../server/api-types";
import { fetchSettings, listPacks } from "./api";
import { DebriefView } from "./DebriefView";
import { HistoryList, SavedInterviewView } from "./History";
import { InterviewRoom } from "./InterviewRoom";
import { PackPicker } from "./PackPicker";
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
  onStart: (packId: string) => void;
  onShowHistory: () => void;
  onOpenSettings: () => void;
}

function Home({ starting, error, onStart, onShowHistory, onOpenSettings }: HomeProps) {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listPacks()
      .then(setPacks)
      .catch((failure: Error) => setLoadError(failure.message));
  }, []);

  return (
    <main className="home">
      <h1>Mockroom</h1>
      <p className="tagline">AI technical interview simulator, running on your machine.</p>
      <p className="home-actions">
        <button type="button" className="secondary-button" onClick={onShowHistory}>
          Past interviews
        </button>
        <button type="button" className="secondary-button" onClick={onOpenSettings}>
          Settings
        </button>
      </p>

      {loadError && (
        <p className="status status-unreachable" role="alert">
          {loadError}
        </p>
      )}
      {!packs && !loadError && <p className="status">Connecting to the local server…</p>}

      {error && (
        <p className="status status-unreachable" role="alert">
          {error}{" "}
          <button type="button" className="link-button" onClick={onOpenSettings}>
            Open settings
          </button>
        </p>
      )}
      {packs && <PackPicker packs={packs} starting={starting} onStart={onStart} />}
    </main>
  );
}
