import { useEffect, useState } from "react";
import type { PackSummary } from "../server/api-types";
import { listPacks } from "./api";
import { InterviewRoom } from "./InterviewRoom";
import { useInterview } from "./useInterview";

export function App() {
  const session = useInterview();

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

      {packs && (
        <ul className="packs">
          {packs.map((pack) => (
            <li key={pack.id} className="pack">
              <div>
                <p className="pack-title">{pack.title}</p>
                <p className="pack-meta">
                  {pack.technology} · {pack.level} · {pack.language.toUpperCase()}
                </p>
              </div>
              <button type="button" disabled={starting} onClick={() => onStart(pack.id)}>
                {starting ? "Starting…" : "Start interview"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="status status-unreachable" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
