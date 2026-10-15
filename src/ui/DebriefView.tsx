import type { Debrief, DebriefQuestion, InterviewSummary } from "../server/api-types";

interface DebriefViewProps {
  interview: InterviewSummary;
  debrief: Debrief;
  onDone: () => void;
}

/** The feedback on a finished interview, question by question. Deliberately without any score. */
export function DebriefView({ interview, debrief, onDone }: DebriefViewProps) {
  return (
    <main className="debrief">
      <header className="debrief-header">
        <p className="room-pack">{interview.pack.title}</p>
        <h1>Your debrief</h1>
      </header>

      <DebriefDetails debrief={debrief} totalQuestions={interview.totalQuestions} />

      <footer className="debrief-footer">
        <button type="button" onClick={onDone}>
          Back to packs
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
  const answered = debrief.questions.length;

  return (
    <>
      {debrief.endedEarly && answered > 0 && (
        <p className="debrief-note">
          You ended the interview after {answered} of {totalQuestions} questions, so this debrief covers the{" "}
          {answered === 1 ? "question" : `${answered} questions`} you answered.
        </p>
      )}
      {debrief.summary && <p className="debrief-summary">{debrief.summary}</p>}

      {answered === 0 ? (
        <p className="debrief-note">
          You ended the interview before answering any question, so there is nothing to give feedback on yet. Start
          a new one whenever you're ready.
        </p>
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
  return (
    <li className="feedback">
      <p className="feedback-theme">
        Question {question.number} · {question.theme}
      </p>
      <h2 className="feedback-question">{question.question}</h2>

      {question.strengths.length > 0 && (
        <section className="feedback-section feedback-strengths">
          <h3>What went well</h3>
          <ul>
            {question.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="feedback-section feedback-gaps">
        <h3>What to add next time</h3>
        {question.gaps.length > 0 ? (
          <ul>
            {question.gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        ) : (
          <p>Nothing important was missing. Well done!</p>
        )}
      </section>

      <section className="feedback-section">
        <h3>A model answer</h3>
        <p className="feedback-answer">{question.modelAnswer}</p>
      </section>

      <section className="feedback-section">
        <h3>To study</h3>
        <p>
          <a href={question.resource.url} target="_blank" rel="noreferrer">
            {question.resource.title}
          </a>
        </p>
      </section>
    </li>
  );
}
