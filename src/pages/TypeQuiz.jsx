import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import QuizResultScreen from "../components/QuizResultScreen";
import TypeBadge from "../components/TypeBadge";
import EvolutionToast from "../components/EvolutionToast";
import CardToast from "../components/CardToast";
import { CheckIcon, XCircleIcon } from "../components/Icons";
import {
  loadPokemonData,
  pickRandom,
  applyGen1OnlyFilter,
  SESSION_LENGTH,
} from "../utils/pokemonData";
import { typesMatch } from "../utils/typeMatch";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";
import { awardCard } from "../utils/cardCollection";
import { primaryBtn } from "../styles/tokens";

// 힌트 단계가 없는 대신(외형만 보고 판단해야 트릭이 성립하므로) 정답 시 항상
// 고정 점수를 준다. 다른 퀴즈의 힌트 미사용 최고 점수(30점)보다는 낮게 잡아
// "정답을 맞히기 쉬운 퀴즈"로 인플레이션되지 않도록 한다.
const FLAT_SCORE = 20;

export default function TypeQuiz() {
  const [all, setAll] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [target, setTarget] = useState(null);
  const [choices, setChoices] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const awardPoints = useAwardPoints();
  const [evolutionResult, setEvolutionResult] = useState(null);
  const [cardResult, setCardResult] = useState(null);

  useEffect(() => {
    loadPokemonData().then((data) => {
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
      const targetPick = questions[index];
      const nonMatching = all.filter((p) => !typesMatch(p.types, targetPick.types));
      const distractors = pickRandom(nonMatching, 3);
      setTarget(targetPick);
      setChoices(shuffle([targetPick, ...distractors]));
      setRevealed(false);
      setCorrect(null);
      setEvolutionResult(null);
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
        title="타입 퀴즈"
        total={sessionQuestions.length}
        correctCount={correctCount}
        score={score}
        onPlayAgain={startSession}
      />
    );
  }

  if (!target) {
    return (
      <AppShell title="타입 퀴즈" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  async function submitChoice(p) {
    const isCorrect = p.id === target.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      setScore((s) => s + FLAT_SCORE);
      setCorrectCount((c) => c + 1);
      setEvolutionResult(await awardPoints(FLAT_SCORE));
      setCardResult(awardCard(target.id));
    }
  }

  return (
    <AppShell title="타입 퀴즈" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {questionIndex + 1}/{sessionQuestions.length}번째 문제 · 점수 {score}점
        </p>

        <p style={{ fontSize: 15, marginTop: 8 }}>
          이 타입을 가진 포켓몬을 고르세요
        </p>
        <div style={{ margin: "8px 0 var(--space-4)" }}>
          {target.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>

        {!revealed && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => submitChoice(c)}
                className="press"
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  minHeight: 120,
                }}
              >
                <img
                  src={c.artwork}
                  alt={c.nameKo}
                  style={{ width: "100%", height: 80, objectFit: "contain" }}
                />
                <div style={{ fontSize: 13, marginTop: 4 }}>{c.nameKo}</div>
              </button>
            ))}
          </div>
        )}

        {revealed && (
          <div style={{ marginTop: 16 }}>
            <ResultHeading correct={correct} />
            <EvolutionToast result={evolutionResult} />
            <CardToast result={cardResult} pokemonName={target.nameKo} />
            <img
              src={target.artwork}
              alt={target.nameKo}
              style={{ width: 140, height: 140, objectFit: "contain" }}
            />
            <p>
              정답은 <b>{target.nameKo}</b> ({target.nameEn}) 이었습니다.
            </p>
            <button onClick={goToNext} style={primaryBtn}>
              다음 문제 →
            </button>
          </div>
        )}
      </div>
    </AppShell>
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
