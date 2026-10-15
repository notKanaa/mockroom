import { useEffect, useState } from "react";

type ServerStatus = "checking" | "ok" | "unreachable";

export function App() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((response) => setStatus(response.ok ? "ok" : "unreachable"))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main className="home">
      <h1>Mockroom</h1>
      <p className="tagline">AI technical interview simulator, running on your machine.</p>
      <p className={`status status-${status}`} role="status">
        {status === "checking" && "Connecting to the local server…"}
        {status === "ok" && "Local server connected."}
        {status === "unreachable" && "The local server can't be reached."}
      </p>
    </main>
  );
}
