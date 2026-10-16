import type { Debrief, DebriefQuestion, InterviewSummary } from "../server/api-types";
import { interviewTitle, useI18n } from "./i18n";
import { PlusIcon } from "./Icons";
import { Avatar, RecruiterBadge, recruiterFor, type Recruiter } from "./Recruiter";

interface DebriefViewProps {
  interview: InterviewSummary;
  debrief: Debrief;
  onDone: () => void;
}

/** The feedback on a finished interview, question by question. Deliberately without any score. */
export function DebriefView({ interview, debrief, onDone }: DebriefViewProps) {
  const { t } = useI18n();
  const recruiter = recruiterFor(interview.id, t);
  return (
    <main className="page">
      <header className="page-header">
        <RecruiterBadge recruiter={recruiter} detail={interviewTitle(interview, t)} />
        <h1>{t.debrief.title}</h1>
      </header>

      <DebriefDetails debrief={debrief} totalQuestions={interview.totalQuestions} recruiter={recruiter} />

      <footer className="page-footer">
        <button type="button" className="primary-button" onClick={onDone}>
          <PlusIcon />
          {t.common.newInterview}
        </button>
      </footer>
    </main>
  );
}

interface DebriefDetailsProps {
  debrief: Debrief;
  totalQuestions: number;
  recruiter: Recruiter;
}

/** The debrief itself: the recruiter's overall summary, then the feedback on each question. */
export function DebriefDetails({ debrief, totalQuestions, recruiter }: DebriefDetailsProps) {
  const { t } = useI18n();
  const answered = debrief.questions.length;

  return (
    <>
      {debrief.endedEarly && answered > 0 && <p className="banner">{t.debrief.endedEarly(answered, totalQuestions)}</p>}
      {debrief.summary && (
        <figure className="debrief-summary">
          <Avatar recruiter={recruiter} />
          <div>
            <figcaption className="eyebrow">{t.recruiter.debriefFrom(recruiter.name)}</figcaption>
            <blockquote>
              <p>{debrief.summary}</p>
            </blockquote>
          </div>
        </figure>
      )}

      {answered === 0 ? (
        <p className="banner">{t.debrief.nothingAnswered}</p>
      ) : (
        <ol className="debrief-questions">
          {debrief.questions.map((question) => (
            <QuestionFeedback key={question.number} question={question} />
          ))}
        </ol>
      )}
    </>
  );
}

function QuestionFeedback({ question }: { question: DebriefQuestion }) {
  const { t } = useI18n();
  return (
    <li className="card feedback">
      <p className="eyebrow feedback-theme">
        {t.common.question(question.number)} · {question.theme}
        {question.uncurated && <span className="uncurated-badge">{t.common.uncurated}</span>}
      </p>
      <h2 className="feedback-question">{question.question}</h2>
      {question.uncurated && <p className="feedback-note">{t.debrief.uncuratedNote}</p>}

      <div className="feedback-columns">
        {question.strengths.length > 0 && (
          <section className="feedback-section feedback-strengths">
            <h3>{t.debrief.strengths}</h3>
            <ul>
              {question.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="feedback-section feedback-gaps">
          <h3>{t.debrief.gaps}</h3>
          {question.gaps.length > 0 ? (
            <ul>
              {question.gaps.map((gap, index) => (
                <li key={index}>{gap}</li>
              ))}
            </ul>
          ) : (
            <p>{t.debrief.noGaps}</p>
          )}
        </section>
      </div>

      <section className="feedback-section">
        <h3>{t.debrief.modelAnswer}</h3>
        <p className="feedback-answer">{question.modelAnswer}</p>
      </section>

      {question.resource && (
        <section className="feedback-section">
          <h3>{t.debrief.toStudy}</h3>
          <p>
            <a href={question.resource.url} target="_blank" rel="noreferrer">
              {question.resource.title}
            </a>
          </p>
        </section>
      )}
    </li>
  );
}
