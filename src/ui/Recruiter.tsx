import type { CSSProperties } from "react";
import type { UIMessages } from "./messages";

/** Who plays the recruiter in an interview. Only shown in the UI: the server doesn't know about it. */
export interface Recruiter {
  name: string;
  role: string;
  /** A hue for the avatar, so each recruiter keeps the same colour. */
  hue: number;
}

const hues = [168, 205, 28, 262, 340, 96];

/** The recruiter of an interview, always the same one for the same interview. */
export function recruiterFor(interviewId: string, t: UIMessages): Recruiter {
  let hash = 0;
  for (const character of interviewId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const nameIndex = hash % t.recruiter.names.length;
  return {
    name: t.recruiter.names[nameIndex]!,
    role: t.recruiter.roles[Math.floor(hash / 7) % t.recruiter.roles.length]!,
    hue: hues[nameIndex % hues.length]!,
  };
}

interface AvatarProps {
  recruiter: Recruiter;
  size?: "small" | "large";
  /** True while the recruiter is writing: the avatar's ring pulses. */
  thinking?: boolean;
}

/** The recruiter's initial in a coloured disc. Decorative: the name is always written next to it. */
export function Avatar({ recruiter, size = "small", thinking = false }: AvatarProps) {
  return (
    <span
      className={`avatar avatar-${size}${thinking ? " avatar-thinking" : ""}`}
      style={{ "--avatar-hue": recruiter.hue } as CSSProperties}
      aria-hidden="true"
    >
      {recruiter.name.charAt(0)}
    </span>
  );
}

interface RecruiterBadgeProps {
  recruiter: Recruiter;
  /** What the interview is about, under the name. */
  detail?: string;
  thinking?: boolean;
}

/** The recruiter's avatar, name and role, as shown in the interview and debrief headers. */
export function RecruiterBadge({ recruiter, detail, thinking = false }: RecruiterBadgeProps) {
  return (
    <div className="recruiter">
      <Avatar recruiter={recruiter} size="large" thinking={thinking} />
      <div className="recruiter-text">
        <p className="recruiter-name">
          {recruiter.name} <span className="recruiter-role">· {recruiter.role}</span>
        </p>
        {detail && <p className="recruiter-detail">{detail}</p>}
      </div>
    </div>
  );
}
