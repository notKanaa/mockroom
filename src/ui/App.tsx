import { useEffect, useState } from "react";
import type { PackSummary } from "../server/api-types";
import { fetchSettings, listPacks } from "./api";
import { DebriefView } from "./DebriefView";
import { SavedInterviewView } from "./History";
import { Home } from "./Home";
import { LanguageSwitch, useI18n } from "./i18n";
import { SidebarIcon } from "./Icons";
import { InterviewRoom } from "./InterviewRoom";
import { Settings } from "./Settings";
import { IconButton } from "./kit";
import { Brand, Sidebar } from "./Sidebar";
import { ThemeSwitch } from "./theme";
import { useInterview } from "./useInterview";

/** What the main area shows when no interview is going on, or settings opened during one. */
type Screen =
  | { name: "loading" }
  | { name: "home" }
  | { name: "saved"; interviewId: string }
  | { name: "settings"; firstLaunch: boolean };

const sidebarKey = "mockroom.sidebar";
// Below this width the sidebar slides over the page instead of sitting beside it (see styles.css).
const narrowScreen = "(max-width: 820px)";

export function App() {
  const session = useInterview();
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // On first launch, with no AI provider set up, the candidate starts in the settings.
  useEffect(() => {
    fetchSettings()
      .then((settings) => setScreen(settings.configured ? { name: "home" } : { name: "settings", firstLaunch: true }))
      .catch(() => setScreen({ name: "home" }));
    listPacks()
      .then(setPacks)
      .catch((failure: Error) => setPacksError(failure.message));
  }, []);

  // A finished interview is saved to the history: the sidebar loads it again.
  const finishedId = session.interview?.status === "finished" ? session.interview.id : null;
  useEffect(() => {
    if (finishedId) setHistoryVersion((version) => version + 1);
  }, [finishedId, session.debrief.debrief]);

  useEffect(() => {
    try {
      localStorage.setItem(sidebarKey, sidebarOpen ? "open" : "closed");
    } catch {
      // No storage: the sidebar opens again next time.
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    // The drawer covers the page: keyboard users land in it, and Escape closes it.
    document.querySelector<HTMLElement>("#sidebar .new-interview")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawerOpen(false);
      document.querySelector<HTMLElement>(".sidebar-show")?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  if (screen.name === "loading") return null;

  const interviewGoing = session.interview !== null && session.debrief.debrief === null;
  const firstLaunch = screen.name === "settings" && screen.firstLaunch;
  // Focus mode: no sidebar while the interview is going on, or while the candidate sets up their AI.
  const showSidebar = !interviewGoing && !firstLaunch;

  /** Leaves whatever the main area shows, finished interview included, for another screen. */
  function go(next: Screen) {
    if (!interviewGoing) session.reset();
    setScreen(next);
    setDrawerOpen(false);
  }

  function setSidebar(open: boolean) {
    if (window.matchMedia(narrowScreen).matches) setDrawerOpen(open);
    else setSidebarOpen(open);
  }

  const openSettings = () => {
    // During an interview, the settings open over it, and the interview picks up where it was afterwards.
    setScreen({ name: "settings", firstLaunch: false });
    setDrawerOpen(false);
  };

  let content;
  if (screen.name === "settings") {
    content = <Settings firstLaunch={screen.firstLaunch} onBack={() => setScreen({ name: "home" })} />;
  } else if (session.interview && session.debrief.debrief) {
    content = (
      <DebriefView
        interview={session.interview}
        debrief={session.debrief.debrief}
        onDone={() => go({ name: "home" })}
      />
    );
  } else if (session.interview) {
    content = <InterviewRoom session={session} onOpenSettings={openSettings} />;
  } else if (screen.name === "saved") {
    content = (
      <SavedInterviewView
        interviewId={screen.interviewId}
        onDeleted={() => {
          setHistoryVersion((version) => version + 1);
          go({ name: "home" });
        }}
      />
    );
  } else {
    content = (
      <Home
        packs={packs}
        loadError={packsError}
        starting={session.streaming}
        error={session.error}
        onStart={session.start}
        onOpenSettings={openSettings}
      />
    );
  }

  if (!showSidebar) {
    return (
      <div className="shell shell-focus">
        {firstLaunch && (
          <div className="corner-switches">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        )}
        {content}
      </div>
    );
  }

  return (
    <div className={`shell${sidebarOpen ? " sidebar-open" : ""}${drawerOpen ? " drawer-open" : ""}`}>
      <Sidebar
        openId={screen.name === "saved" ? screen.interviewId : null}
        version={historyVersion}
        onNewInterview={() => go({ name: "home" })}
        onOpen={(interviewId) => go({ name: "saved", interviewId })}
        onDeleted={(interviewId) => {
          if (screen.name === "saved" && screen.interviewId === interviewId) go({ name: "home" });
        }}
        onOpenSettings={() => go({ name: "settings", firstLaunch: false })}
        settingsOpen={screen.name === "settings"}
        onHide={() => setSidebar(false)}
      />
      <div className="scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      <div className="main">
        <div className="topbar">
          <IconButton
            className="sidebar-show"
            label={t.sidebar.show}
            icon={<SidebarIcon />}
            onClick={() => setSidebar(true)}
            aria-controls="sidebar"
          />
          <Brand />
        </div>
        {content}
      </div>
    </div>
  );
}

function initialSidebarOpen(): boolean {
  try {
    return localStorage.getItem(sidebarKey) !== "closed";
  } catch {
    return true;
  }
}
