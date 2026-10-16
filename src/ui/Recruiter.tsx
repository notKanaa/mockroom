import type { UIMessages } from "./messages";

/** Who plays the recruiter in an interview. Only shown in the UI: the server doesn't know about it. */
export interface Recruiter {
  name: string;
  role: string;
}

/** The recruiter of an interview, always the same one for the same interview. */
export function recruiterFor(interviewId: string, t: UIMessages): Recruiter {
  let hash = 0;
  for (const character of interviewId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return {
    name: t.recruiter.names[hash % t.recruiter.names.length]!,
    role: t.recruiter.roles[Math.floor(hash / 7) % t.recruiter.roles.length]!,
  };
}

interface AvatarProps {
  recruiter: Recruiter;
  size?: "sm" | "md";
  /** True while the recruiter is writing: a ring pulses around the avatar. */
  thinking?: boolean;
}

/** The recruiter's initial in a disc. Decorative: the name is always written next to it. */
export function Avatar({ recruiter, size = "sm", thinking = false }: AvatarProps) {
  return (
    <span className={`avatar avatar-${size}${thinking ? " avatar-thinking" : ""}`} aria-hidden="true">
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
      <Avatar recruiter={recruiter} size="md" thinking={thinking} />
      <div className="recruiter-text">
        <p className="recruiter-name">
          {recruiter.name}
          <span className="recruiter-role"> · {recruiter.role}</span>
        </p>
        {detail && <p className="recruiter-detail">{detail}</p>}
      </div>
    </div>
  );
}
