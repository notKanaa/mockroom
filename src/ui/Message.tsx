import type { TranscriptEntry } from "../server/api-types";
import { useI18n } from "./i18n";
import { Thinking } from "./kit";
import { Avatar, type Recruiter } from "./Recruiter";

interface MessageProps {
  message: TranscriptEntry;
  recruiter: Recruiter;
  /** True while the recruiter's message is still streaming in. */
  typing?: boolean;
}

/**
 * One message of the conversation. The recruiter's are plain text next to their
 * avatar, like an AI chat; the candidate's are bubbles on the right.
 */
export function Message({ message, recruiter, typing = false }: MessageProps) {
  const { t } = useI18n();
  const fromRecruiter = message.role === "interviewer";
  const waiting = typing && message.content === "";

  return (
    <li className={`message message-${message.role}`}>
      {fromRecruiter && <Avatar recruiter={recruiter} thinking={typing} />}
      <div className="message-body">
        <p className={fromRecruiter ? "message-author" : "message-author visually-hidden"}>
          {fromRecruiter ? recruiter.name : t.common.you}
          {message.followUpNumber !== undefined && <span className="message-tag">{t.common.followUp}</span>}
        </p>
        {waiting ? (
          <p className="message-waiting">
            <Thinking label={t.recruiter.thinking(recruiter.name)} />
          </p>
        ) : (
          <p className={typing ? "message-text streaming" : "message-text"}>{message.content}</p>
        )}
      </div>
    </li>
  );
}
