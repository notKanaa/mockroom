import { useEffect, useState } from "react";
import type { HistoryEntry } from "../server/api-types";
import { deleteSavedInterview, listHistory } from "./api";
import { formatDateTime, interviewTitle, LanguageSwitch, useI18n } from "./i18n";
import { GearIcon, PlusIcon, SidebarIcon, TrashIcon } from "./Icons";
import { IconButton } from "./kit";
import { ThemeSwitch } from "./theme";

interface SidebarProps {
  /** The past interview open in the main area, if any. */
  openId: string | null;
  /** Changes whenever the history may have changed elsewhere, so the list loads again. */
  version: number;
  onNewInterview: () => void;
  onOpen: (interviewId: string) => void;
  onDeleted: (interviewId: string) => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  onHide: () => void;
  /** True in focus mode: the sidebar is folded away and can't be reached. */
  hidden?: boolean;
}

/** The left column, like a chat app's: a new interview, the past ones, and the settings. */
export function Sidebar({
  openId,
  version,
  onNewInterview,
  onOpen,
  onDeleted,
  onOpenSettings,
  settingsOpen,
  onHide,
  hidden = false,
}: SidebarProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { language, t } = useI18n();

  useEffect(() => {
    listHistory()
      .then((loaded) => {
        setEntries(loaded);
        setError(null);
      })
      .catch((failure: Error) => setError(failure.message));
  }, [version]);

  async function remove(entry: HistoryEntry) {
    if (!window.confirm(t.history.deletePrompt)) return;
    setError(null);
    setDeletingId(entry.id);
    try {
      await deleteSavedInterview(entry.id);
      setEntries((current) => current?.filter((candidate) => candidate.id !== entry.id) ?? null);
      onDeleted(entry.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <nav className="sidebar" id="sidebar" aria-label={t.sidebar.label} inert={hidden}>
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <Brand />
          <IconButton label={t.sidebar.hide} icon={<SidebarIcon />} onClick={onHide} aria-controls="sidebar" />
        </div>

        <button type="button" className="sidebar-row sidebar-new" onClick={onNewInterview}>
          <PlusIcon />
          {t.common.newInterview}
        </button>

        <div className="sidebar-history">
          <h2 className="sidebar-heading">{t.sidebar.history}</h2>
          {error && (
            <p className="sidebar-note sidebar-error" role="alert">
              {error}
            </p>
          )}
          {!entries && !error && <p className="sidebar-note">{t.history.loading}</p>}
          {entries?.length === 0 && <p className="sidebar-note">{t.history.empty}</p>}
          {entries && entries.length > 0 && (
            <ul className="history-list">
              {entries.map((entry) => {
                const title = interviewTitle(entry, t);
                return (
                  <li key={entry.id} className="history-item">
                    <button
                      type="button"
                      className="history-open"
                      aria-current={entry.id === openId ? "page" : undefined}
                      onClick={() => onOpen(entry.id)}
                    >
                      <span className="history-title">{title}</span>
                      <span className="history-meta">
                        {formatDateTime(entry.startedAt, language)}
                        {!entry.hasDebrief && ` · ${t.history.noDebrief}`}
                      </span>
                    </button>
                    <IconButton
                      className="history-delete"
                      label={t.sidebar.delete(title)}
                      icon={<TrashIcon />}
                      onClick={() => void remove(entry)}
                      disabled={deletingId === entry.id}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-row"
            onClick={onOpenSettings}
            aria-current={settingsOpen ? "page" : undefined}
          >
            <GearIcon />
            {t.common.settings}
          </button>
          <div className="sidebar-switches">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
      </div>
    </nav>
  );
}

/** Mockroom's name with its mark: two discs face to face, a recruiter and a candidate. */
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true" />
      Mockroom
    </span>
  );
}
