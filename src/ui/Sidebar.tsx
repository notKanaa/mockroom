import { useEffect, useState } from "react";
import type { HistoryEntry } from "../server/api-types";
import { deleteSavedInterview, listHistory } from "./api";
import { formatDateTime, interviewTitle, LanguageSwitch, useI18n } from "./i18n";
import { GearIcon, PlusIcon, SidebarIcon, TrashIcon } from "./Icons";
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
    <nav className="sidebar" id="sidebar" aria-label={t.sidebar.label}>
      <div className="sidebar-top">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Mockroom
        </span>
        <button
          type="button"
          className="icon-button"
          onClick={onHide}
          aria-label={t.sidebar.hide}
          title={t.sidebar.hide}
          aria-controls="sidebar"
          aria-expanded="true"
        >
          <SidebarIcon />
        </button>
      </div>

      <button type="button" className="new-interview" onClick={onNewInterview}>
        <PlusIcon />
        {t.common.newInterview}
      </button>

      <h2 className="eyebrow sidebar-heading">{t.sidebar.history}</h2>
      <div className="sidebar-history">
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
                  <button
                    type="button"
                    className="icon-button history-delete"
                    onClick={() => void remove(entry)}
                    disabled={deletingId === entry.id}
                    aria-label={t.sidebar.delete(title)}
                    title={t.sidebar.delete(title)}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="sidebar-note sidebar-privacy">{t.history.privacy}</p>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-link"
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
    </nav>
  );
}
