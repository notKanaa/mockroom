import { useEffect, useState } from "react";
import type { PackSummary } from "../server/api-types";
import { listPacks } from "./api";
import { DebriefView } from "./DebriefView";
import { InterviewRoom } from "./InterviewRoom";
import { PackPicker } from "./PackPicker";
import { useInterview } from "./useInterview";

export function App() {
  const session = useInterview();

  if (session.interview && session.debrief.debrief) {
    return (
      <DebriefView
        interview={session.interview}
        debrief={session.debrief.debrief}
        onDone={session.reset}
      />
    );
  }
  if (session.interview) return <InterviewRoom session={session} />;
  return <Home starting={session.streaming} error={session.error} onStart={session.start} />;
}

interface HomeProps {
  starting: boolean;
  error: string | null;
  onStart: (packId: string) => void;
}

function Home({ starting, error, onStart }: HomeProps) {
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

      {loadError && (
        <p className="status status-unreachable" role="alert">
          {loadError}
        </p>
      )}
      {!packs && !loadError && <p className="status">Connecting to the local server…</p>}

      {error && (
        <p className="status status-unreachable" role="alert">
          {error}
        </p>
      )}
      {packs && <PackPicker packs={packs} starting={starting} onStart={onStart} />}
    </main>
  );
}
