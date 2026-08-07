import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import QuizResultScreen from "../components/QuizResultScreen";
import { LightbulbIcon, CheckIcon, XCircleIcon } from "../components/Icons";
import {
  loadPokemonData,
  pickRandom,
  TYPE_LABEL_KO,
  applyGen1OnlyFilter,
  SESSION_LENGTH,
} from "../utils/pokemonData";
import { getEvolutionQuizCandidates, buildEvolutionChain } from "../utils/evolutionQuizChain";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";
import { awardCard } from "../utils/cardCollection";
import EvolutionToast from "../components/EvolutionToast";
import CardToast from "../components/CardToast";
import { primaryBtn, hintBtn } from "../styles/tokens";

const HINT_STEPS = ["type", "description"];

function buildSessionChains(all) {
  const candidates = getEvolutionQuizCandidates(all);
  const picked = pickRandom(candidates, SESSION_LENGTH);
  return picked
    .map((start) => buildEvolutionChain(start, all))
    .filter((chain) => chain.length >= 2);
}

export default function EvolutionQuiz() {
  const [all, setAll] = useState([]);
  const [sessionChains, setSessionChains] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [chain, setChain] = useState(null); // 정답 순서 (첫 단계 -> 마지막 단계)
  const [display, setDisplay] = useState([]); // 화면에 보여줄 섞인 순서
  const [tappedIds, setTappedIds] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
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
    const chains = buildSessionChains(all);
    if (chains.length === 0) return; // 방어적: 후보가 부족하면(데이터/필터 문제) 세션을 시작하지 않음
    setSessionChains(chains);
    setQuestionIndex(0);
    setSessionComplete(false);
    setCorrectCount(0);
    setScore(0);
  }, [all]);

  useEffect(() => {
    if (all.length) startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const setupQuestion = useCallback((index, chains) => {
    const picked = chains[index];
    setChain(picked);
    setDisplay(shuffle(picked));
    setTappedIds([]);
    setHintLevel(0);
    setRevealed(false);
    setCorrect(null);
    setEvolutionResult(null);
  }, []);

  useEffect(() => {
    if (sessionChains.length) setupQuestion(0, sessionChains);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChains]);

  function goToNext() {
    const next = questionIndex + 1;
    if (next >= sessionChains.length) {
      setSessionComplete(true);
      return;
    }
    setQuestionIndex(next);
    setupQuestion(next, sessionChains);
  }

  if (sessionComplete) {
    return (
      <QuizResultScreen
        title="진화 순서 맞추기"
        total={sessionChains.length}
        correctCount={correctCount}
        score={score}
        onPlayAgain={startSession}
      />
    );
  }

  if (!chain) {
    return (
      <AppShell title="진화 순서 맞추기" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  const start = chain[0];

  async function handleTap(id) {
    if (revealed || tappedIds.includes(id)) return;
    const updated = [...tappedIds, id];
    setTappedIds(updated);
    if (updated.length === chain.length) {
      const isCorrect = updated.every((tid, i) => tid === chain[i].id);
      setCorrect(isCorrect);
      setRevealed(true);
      if (isCorrect) {
        const earned = Math.max(30 - hintLevel * 10, 10);
        setScore((s) => s + earned);
        setCorrectCount((c) => c + 1);
        setEvolutionResult(await awardPoints(earned));
        setCardResult(awardCard(start.id));
      }
    }
  }

  function handleResetOrder() {
    if (revealed) return;
    setTappedIds([]);
  }

  function showNextHint() {
    setHintLevel((h) => Math.min(h + 1, HINT_STEPS.length));
  }

  return (
    <AppShell title="진화 순서 맞추기" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {questionIndex + 1}/{sessionChains.length}번째 문제 · 점수 {score}점
        </p>
        <p style={{ fontSize: 14, marginTop: 4 }}>
          진화하는 순서대로 탭해서 골라보세요
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${display.length}, 1fr)`,
            gap: 10,
            margin: "var(--space-4) 0",
          }}
        >
          {display.map((p) => {
            const order = tappedIds.indexOf(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleTap(p.id)}
                className="press"
                disabled={revealed}
                style={{
                  position: "relative",
                  border:
                    order >= 0
                      ? "2px solid var(--color-primary)"
                      : "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  minHeight: 110,
                }}
              >
                {order >= 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      color: "var(--color-text-on-primary)",
                      fontSize: 13,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {order + 1}
                  </span>
                )}
                <img
                  src={p.artwork}
                  alt=""
                  style={{ width: "100%", height: 70, objectFit: "contain" }}
                />
                {revealed && (
                  <div style={{ fontSize: 11, marginTop: 4, color: "var(--color-text-muted)" }}>
                    {p.nameKo}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!revealed && tappedIds.length > 0 && (
          <button
            type="button"
            onClick={handleResetOrder}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: 13,
              textDecoration: "underline",
              marginBottom: "var(--space-2)",
              cursor: "pointer",
            }}
          >
            순서 다시 정하기
          </button>
        )}

        {!revealed && hintLevel < HINT_STEPS.length && (
          <button onClick={showNextHint} style={hintBtn}>
            <LightbulbIcon size={16} />
            힌트 더보기 ({hintLevel}/{HINT_STEPS.length})
          </button>
        )}

        <div style={{ minHeight: 60, fontSize: 14, color: "var(--color-text)" }}>
          {hintLevel >= 1 && (
            <HintLine>
              첫 단계 포켓몬의 타입은{" "}
              <b>{start.types.map((t) => TYPE_LABEL_KO[t] || t).join(", ")}</b> 입니다.
            </HintLine>
          )}
          {hintLevel >= 2 && <HintLine>{start.descriptionKo || start.descriptionEn}</HintLine>}
        </div>

        {revealed && (
          <div style={{ marginTop: 16 }}>
            <ResultHeading correct={correct} />
            <EvolutionToast result={evolutionResult} />
            <CardToast result={cardResult} pokemonName={start.nameKo} />
            <p>
              정답 순서는 <b>{chain.map((p) => p.nameKo).join(" → ")}</b> 였습니다.
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
