import { useEffect, useState, useCallback, useRef } from "react";
import AppShell from "../components/AppShell";
import QuizResultScreen from "../components/QuizResultScreen";
import { LightbulbIcon, CheckIcon, XCircleIcon, RepeatIcon, VolumeIcon } from "../components/Icons";
import {
  loadPokemonData,
  pickRandom,
  TYPE_LABEL_KO,
  applyGen1OnlyFilter,
  SESSION_LENGTH,
} from "../utils/pokemonData";
import { getChosung } from "../utils/hangul";
import { primaryBtn, hintBtn, choiceBtn, textInput, pill } from "../styles/tokens";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";
import EvolutionToast from "../components/EvolutionToast";
import { awardCard } from "../utils/cardCollection";
import CardToast from "../components/CardToast";

const HINT_STEPS = ["type", "silhouette", "chosung"];

export default function CryQuiz() {
  const [all, setAll] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [choices, setChoices] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState("choice"); // "choice" | "typed"
  const [typedGuess, setTypedGuess] = useState("");
  const audioRef = useRef(null);
  const awardPoints = useAwardPoints();
  const [evolutionResult, setEvolutionResult] = useState(null);
  const [cardResult, setCardResult] = useState(null);

  useEffect(() => {
    loadPokemonData().then((data) => {
      setAll(applyGen1OnlyFilter(data.filter((p) => p.cry)));
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
      setHintLevel(0);
      setRevealed(false);
      setCorrect(null);
      setEvolutionResult(null);
      setCardResult(null);
      setTypedGuess("");
    },
    [all]
  );

  useEffect(() => {
    if (sessionQuestions.length) setupQuestion(0, sessionQuestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionQuestions]);

  useEffect(() => {
    if (answer && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [answer]);

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
        title="울음소리 퀴즈"
        total={sessionQuestions.length}
        correctCount={correctCount}
        score={score}
        onPlayAgain={startSession}
      />
    );
  }

  if (!answer) {
    return (
      <AppShell title="울음소리 퀴즈" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  function playCry() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
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
    setHintLevel((h) => Math.min(h + 1, HINT_STEPS.length));
  }

  return (
    <AppShell title="울음소리 퀴즈" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {questionIndex + 1}/{sessionQuestions.length}번째 문제 · 점수 {score}점
        </p>

        <audio key={answer.id} ref={audioRef} src={answer.cry} />

        <div
          style={{
            background: "var(--color-surface-2)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            margin: "var(--space-3) 0",
          }}
        >
          {hintLevel >= 2 ? (
            <img
              src={answer.artwork}
              alt="누구일까요"
              style={{
                width: 140,
                height: 140,
                objectFit: "contain",
                filter: revealed ? "none" : "brightness(0)",
                transition: "filter .4s",
              }}
            />
          ) : (
            <VolumeIcon size={48} style={{ color: "var(--color-primary)" }} />
          )}
          <div>
            <button
              onClick={playCry}
              className="press"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 12,
                padding: "8px 16px",
                minHeight: 40,
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <RepeatIcon size={15} />
              소리 다시 듣기
            </button>
          </div>
        </div>

        {!revealed && hintLevel < HINT_STEPS.length && (
          <button onClick={showNextHint} style={hintBtn}>
            <LightbulbIcon size={16} />
            힌트 더보기 ({hintLevel}/{HINT_STEPS.length})
          </button>
        )}

        <div style={{ minHeight: 70, fontSize: 14, color: "var(--color-text)" }}>
          {hintLevel >= 1 && (
            <HintLine>
              이 포켓몬의 타입은{" "}
              <b>{answer.types.map((t) => TYPE_LABEL_KO[t] || t).join(", ")}</b>{" "}
              입니다.
            </HintLine>
          )}
          {hintLevel >= 2 && <HintLine>위 그림자를 참고하세요.</HintLine>}
          {hintLevel >= 3 && (
            <HintLine>
              이름 초성은 <b>{getChosung(answer.nameKo)}</b> 입니다.
            </HintLine>
          )}
        </div>

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
            <img
              src={answer.artwork}
              alt={answer.nameKo}
              style={{ width: 140, height: 140, objectFit: "contain" }}
            />
            <ResultHeading correct={correct} />
            <EvolutionToast result={evolutionResult} />
            <CardToast result={cardResult} pokemonName={answer.nameKo} />
            <p>
              정답은 <b>{answer.nameKo}</b> ({answer.nameEn}) 이었습니다.
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 8 }}>
              {answer.descriptionKo || "한글 설명이 아직 없어요"}
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

function HintLine({ children }) {
  return (
    <p style={{ display: "flex", alignItems: "flex-start", gap: 6, textAlign: "left" }}>
      <LightbulbIcon size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-text-muted)" }} />
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
