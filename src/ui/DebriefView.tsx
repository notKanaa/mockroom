import type { Debrief, DebriefQuestion, InterviewSummary } from "../server/api-types";
import { interviewTitle, useI18n } from "./i18n";

interface DebriefViewProps {
  interview: InterviewSummary;
  debrief: Debrief;
  onDone: () => void;
}

/** The feedback on a finished interview, question by question. Deliberately without any score. */
export function DebriefView({ interview, debrief, onDone }: DebriefViewProps) {
  const { t } = useI18n();
  return (
    <main className="debrief">
      <header className="debrief-header">
        <p className="room-pack">{interviewTitle(interview, t)}</p>
        <h1>{t.debrief.title}</h1>
      </header>

      <DebriefDetails debrief={debrief} totalQuestions={interview.totalQuestions} />

      <footer className="debrief-footer">
        <button type="button" onClick={onDone}>
          {t.common.backToPacks}
        </button>
      </footer>
    </main>
  );
}

interface DebriefDetailsProps {
  debrief: Debrief;
  totalQuestions: number;
}

/** The debrief itself: the overall summary, then the feedback on each question. */
export function DebriefDetails({ debrief, totalQuestions }: DebriefDetailsProps) {
  const { t } = useI18n();
  const answered = debrief.questions.length;

  return (
    <>
      {debrief.endedEarly && answered > 0 && (
        <p className="debrief-note">{t.debrief.endedEarly(answered, totalQuestions)}</p>
      )}
      {debrief.summary && <p className="debrief-summary">{debrief.summary}</p>}

      {answered === 0 ? (
        <p className="debrief-note">{t.debrief.nothingAnswered}</p>
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
    <li className="feedback">
      <p className="feedback-theme">
        {t.common.question(question.number)} · {question.theme}
        {question.uncurated && <span className="uncurated-badge">{t.common.uncurated}</span>}
      </p>
      <h2 className="feedback-question">{question.question}</h2>
      {question.uncurated && <p className="feedback-note">{t.debrief.uncuratedNote}</p>}

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
