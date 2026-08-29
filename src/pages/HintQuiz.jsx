import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import QuizResultScreen from "../components/QuizResultScreen";
import EvolutionToast from "../components/EvolutionToast";
import CardToast from "../components/CardToast";
import { LightbulbIcon, CheckIcon, XCircleIcon } from "../components/Icons";
import {
  loadPokemonData,
  pickRandom,
  applyGen1OnlyFilter,
  SESSION_LENGTH,
} from "../utils/pokemonData";
import { buildHints } from "../utils/hintLadder";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";
import { awardCardOnQuizAnswer } from "../utils/cardCollection";
import { primaryBtn, hintBtn, choiceBtn } from "../styles/tokens";

/**
 * 스무고개.
 *
 * **그림이 없는 유일한 퀴즈다.** 힌트가 곧 문제라서, 처음부터 한 줄은 열어 둔다 —
 * 아무것도 없는 화면에 "힌트 보기" 버튼만 있으면 문제가 시작되지 않은 것처럼 보인다.
 *
 * 힌트를 덜 열수록 점수가 높다. 다른 퀴즈와 최고점(30점)을 맞춰서
 * "쉬운 퀴즈로 점수 벌기"가 되지 않게 한다.
 */
const MAX_SCORE = 30;
const STEP_PENALTY = 5;

export default function HintQuiz() {
  const [all, setAll] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [choices, setChoices] = useState([]);
  const [hintLevel, setHintLevel] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const awardPoints = useAwardPoints();
  const [evolutionResult, setEvolutionResult] = useState(null);
  const [cardResult, setCardResult] = useState(null);

  useEffect(() => {
    loadPokemonData().then((data) => {
      // 1세대만 보기 설정을 그대로 따른다. 퀴즈마다 다르게 굴면 아이가 헷갈린다
      setAll(applyGen1OnlyFilter(data));
    });
  }, []);

  const startSession = useCallback(() => {
    if (all.length < 4) return;
    setSessionQuestions(pickRandom(all, SESSION_LENGTH));
    setQuestionIndex(0);
    setSessionComplete(false);
    setCorrectCount(0);
    setScore(0);
  }, [all]);

  useEffect(() => {
    if (all.length) startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const setupQuestion = useCallback(
    (index, questions) => {
      const correctPick = questions[index];
      const distractors = pickRandom(
        all.filter((p) => p.id !== correctPick.id),
        3
      );
      setAnswer(correctPick);
      setChoices(shuffle([correctPick, ...distractors]));
      // 첫 힌트는 열어 둔 채로 시작한다
      setHintLevel(1);
      setRevealed(false);
      setCorrect(null);
      setEvolutionResult(null);
      setCardResult(null);
    },
    [all]
  );

  useEffect(() => {
    if (sessionQuestions.length) setupQuestion(0, sessionQuestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionQuestions]);

  function goToNext() {
    const next = questionIndex + 1;
    if (next >= sessionQuestions.length) {
      setSessionComplete(true);
      return;
    }
    setQuestionIndex(next);
    setupQuestion(next, sessionQuestions);
  }

  if (sessionComplete) {
    return (
      <QuizResultScreen
        title="스무고개"
        total={sessionQuestions.length}
        correctCount={correctCount}
        score={score}
        onPlayAgain={startSession}
      />
    );
  }

  if (!answer) {
    return (
      <AppShell title="스무고개" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  // 이름 목록을 함께 넘긴다 — 분류명에 다른 포켓몬 이름이 들어 있으면
  // 보기에 그것이 끼었을 때 틀린 답을 가리키게 된다
  const hints = buildHints(answer, all.map((p) => p.nameKo));
  // 1세대는 생김새 줄이 하나 더 붙어서 개수가 다르다. 고정값을 쓰지 않는다
  const hintCount = hints.length;

  async function submitChoice(p) {
    const isCorrect = p.id === answer.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(MAX_SCORE - (hintLevel - 1) * STEP_PENALTY, 10);
      setScore((s) => s + earned);
      setCorrectCount((c) => c + 1);
      setEvolutionResult(await awardPoints(earned));
      setCardResult(awardCardOnQuizAnswer(answer.id));
    }
  }

  function showNextHint() {
    setHintLevel((h) => Math.min(h + 1, hintCount));
  }

  return (
    <AppShell title="스무고개" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {questionIndex + 1}/{sessionQuestions.length}번째 문제 · 점수 {score}점
        </p>

        <div
          style={{
            background: "var(--color-surface-2)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            margin: "var(--space-3) 0",
            textAlign: "left",
          }}
        >
          {revealed ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={answer.artwork}
                alt={answer.nameKo}
                style={{ width: 180, height: 180, objectFit: "contain" }}
              />
              <div style={{ fontWeight: 700, fontSize: 18 }}>{answer.nameKo}</div>
            </div>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 var(--space-3)",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                나는 누구일까요?
              </p>
              {hints.slice(0, hintLevel).map((line) => (
                <HintLine key={line}>{line}</HintLine>
              ))}
            </>
          )}
        </div>

        {!revealed && hintLevel < hintCount && (
          <button onClick={showNextHint} style={hintBtn}>
            <LightbulbIcon size={16} />힌트 더보기 ({hintLevel}/{hintCount})
          </button>
        )}

        {!revealed && (
          <div style={{ display: "grid", gap: 8, marginTop: "var(--space-4)" }}>
            {choices.map((p) => (
              <button key={p.id} onClick={() => submitChoice(p)} style={choiceBtn}>
                {p.nameKo}
              </button>
            ))}
          </div>
        )}

        {revealed && (
          <div>
            <ResultHeading correct={correct} />
            {evolutionResult && <EvolutionToast result={evolutionResult} />}
            {cardResult && <CardToast result={cardResult} />}
            <button onClick={goToNext} style={primaryBtn}>
              다음 문제 →
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function HintLine({ children }) {
  return (
    <p style={{ display: "flex", alignItems: "flex-start", gap: 6, margin: "6px 0" }}>
      <LightbulbIcon
        size={16}
        style={{ flexShrink: 0, marginTop: 2, color: "var(--color-text-muted)" }}
      />
      <span>{children}</span>
    </p>
  );
}

function ResultHeading({ correct }) {
  const Icon = correct ? CheckIcon : XCircleIcon;
  return (
    <h2
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: correct ? "var(--color-success)" : "var(--color-danger)",
      }}
    >
      <Icon size={24} />
      {correct ? "정답입니다!" : "아쉬워요!"}
    </h2>
  );
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
