import type { TranscriptEntry } from "../server/api-types";

interface MessageProps {
  message: TranscriptEntry;
  /** True while the interviewer's message is still streaming in. */
  typing?: boolean;
}

/** One message of the conversation, as a chat bubble. */
export function Message({ message, typing = false }: MessageProps) {
  return (
    <li className={`message message-${message.role}`}>
      <span className="message-author">
        {message.role === "interviewer" ? "Interviewer" : "You"}
        {message.followUpNumber !== undefined && <span className="message-tag">Follow-up</span>}
      </span>
      <p className={typing ? "message-text typing" : "message-text"}>{message.content}</p>
    </li>
  );
}
