import type { TranscriptEntry } from "../server/api-types";
import { useI18n } from "./i18n";

interface MessageProps {
  message: TranscriptEntry;
  /** True while the interviewer's message is still streaming in. */
  typing?: boolean;
}

/** One message of the conversation, as a chat bubble. */
export function Message({ message, typing = false }: MessageProps) {
  const { t } = useI18n();
  return (
    <li className={`message message-${message.role}`}>
      <span className="message-author">
        {message.role === "interviewer" ? t.common.interviewer : t.common.you}
        {message.followUpNumber !== undefined && <span className="message-tag">{t.common.followUp}</span>}
      </span>
      <p className={typing ? "message-text typing" : "message-text"}>{message.content}</p>
    </li>
  );
}
