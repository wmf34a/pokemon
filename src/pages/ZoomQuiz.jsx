import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import AudioButton from "../components/AudioButton";
import QuizResultScreen from "../components/QuizResultScreen";
import { LightbulbIcon, CheckIcon, XCircleIcon } from "../components/Icons";
import {
  loadPokemonData,
  pickRandom,
  applyGen1OnlyFilter,
  SESSION_LENGTH,
} from "../utils/pokemonData";
import { primaryBtn, hintBtn, choiceBtn, textInput, pill } from "../styles/tokens";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";
import EvolutionToast from "../components/EvolutionToast";
import { awardCard } from "../utils/cardCollection";
import CardToast from "../components/CardToast";

// 힌트를 누를 때마다(0~3단계) 배경 확대 배율이 점점 줄어들어 조금씩 더 넓은 범위가
// 보인다. 정답을 맞히기 전까지는 마지막 단계(140%)에서도 전체 모습은 보이지 않는다.
const ZOOM_LEVELS = [450, 320, 220, 140];

function randomCropPosition() {
  const x = Math.round(20 + Math.random() * 60);
  const y = Math.round(20 + Math.random() * 60);
  return `${x}% ${y}%`;
}

export default function ZoomQuiz() {
  const [all, setAll] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [choices, setChoices] = useState([]);
  const [cropPosition, setCropPosition] = useState("50% 50%");
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState("choice"); // "choice" | "typed"
  const [typedGuess, setTypedGuess] = useState("");
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
      const correctPick = questions[index];
      const distractors = pickRandom(
        all.filter((p) => p.id !== correctPick.id),
        3
      );
      setAnswer(correctPick);
      setChoices(shuffle([correctPick, ...distractors]));
      setCropPosition(randomCropPosition());
      setHintLevel(0);
      setRevealed(false);
      setCorrect(null);
      setEvolutionResult(null);
      setTypedGuess("");
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
        title="누구냔 넌"
        total={sessionQuestions.length}
        correctCount={correctCount}
        score={score}
        onPlayAgain={startSession}
      />
    );
  }

  if (!answer) {
    return (
      <AppShell title="누구냔 넌" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  async function submitChoice(p) {
    const isCorrect = p.id === answer.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(30 - hintLevel * 10, 10);
      setScore((s) => s + earned);
      setCorrectCount((c) => c + 1);
      setEvolutionResult(await awardPoints(earned));
      setCardResult(awardCard(answer.id));
    }
  }

  async function submitTyped() {
    const guess = typedGuess.trim();
    const isCorrect =
      guess === answer.nameKo || guess.toLowerCase() === answer.nameEn;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(30 - hintLevel * 10, 10);
      setScore((s) => s + earned);
      setCorrectCount((c) => c + 1);
      setEvolutionResult(await awardPoints(earned));
      setCardResult(awardCard(answer.id));
    }
  }

  function showNextHint() {
    setHintLevel((h) => Math.min(h + 1, ZOOM_LEVELS.length - 1));
  }

  return (
    <AppShell title="누구냔 넌" backTo="/quiz">
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
            height: 220,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {revealed ? (
            <img
              src={answer.artwork}
              alt={answer.nameKo}
              style={{ width: 180, height: 180, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${answer.artwork})`,
                backgroundSize: `${ZOOM_LEVELS[hintLevel]}%`,
                backgroundPosition: cropPosition,
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </div>

        {!revealed && hintLevel < ZOOM_LEVELS.length - 1 && (
          <button onClick={showNextHint} style={hintBtn}>
            <LightbulbIcon size={16} />
            더 넓게 보기 ({hintLevel}/{ZOOM_LEVELS.length - 1})
          </button>
        )}

        {!revealed && (
          <div style={{ margin: "var(--space-4) 0" }}>
            <div style={{ marginBottom: 8 }}>
              <button onClick={() => setMode("choice")} style={pill(mode === "choice")}>
                객관식 (아이 모드)
              </button>
              <button onClick={() => setMode("typed")} style={pill(mode === "typed")}>
                주관식 (성인 모드)
              </button>
            </div>

            {mode === "choice" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {choices.map((c) => (
                  <button key={c.id} onClick={() => submitChoice(c)} style={choiceBtn}>
                    {c.nameKo}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={typedGuess}
                  onChange={(e) => setTypedGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitTyped()}
                  placeholder="포켓몬 이름을 입력하세요"
                  style={textInput}
                />
                <button onClick={submitTyped} style={primaryBtn}>
                  제출
                </button>
              </div>
            )}
          </div>
        )}

        {revealed && (
          <div style={{ marginTop: 16 }}>
            <ResultHeading correct={correct} />
            <EvolutionToast result={evolutionResult} />
            <CardToast result={cardResult} pokemonName={answer.nameKo} />
            <p>
              정답은 <b>{answer.nameKo}</b> ({answer.nameEn}) 이었습니다.
            </p>
            {answer.cry && (
              <div style={{ margin: "10px 0" }}>
                <AudioButton src={answer.cry} trackKey={answer.id} autoPlay label="울음소리 듣기" />
              </div>
            )}
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 8 }}>
              {answer.descriptionKo || answer.descriptionEn}
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
