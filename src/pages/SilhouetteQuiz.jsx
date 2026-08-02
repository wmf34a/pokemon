import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import AudioButton from "../components/AudioButton";
import { LightbulbIcon, CheckIcon, XCircleIcon } from "../components/Icons";
import {
  loadPokemonData,
  pickRandom,
  TYPE_LABEL_KO,
  applyGen1OnlyFilter,
} from "../utils/pokemonData";
import { getChosung } from "../utils/hangul";
import { primaryBtn, hintBtn, choiceBtn, textInput, pill } from "../styles/tokens";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";

const HINT_STEPS = ["type", "color", "chosung"];
const COLOR_LABEL_KO = {
  black: "검은색", blue: "파란색", brown: "갈색", gray: "회색",
  green: "초록색", pink: "분홍색", purple: "보라색", red: "빨간색",
  white: "흰색", yellow: "노란색",
};

export default function SilhouetteQuiz() {
  const [all, setAll] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [choices, setChoices] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState("choice"); // "choice" | "typed"
  const [typedGuess, setTypedGuess] = useState("");
  const awardPoints = useAwardPoints();

  useEffect(() => {
    loadPokemonData().then((data) => {
      setAll(applyGen1OnlyFilter(data));
    });
  }, []);

  const nextRound = useCallback(() => {
    if (all.length < 4) return;
    const [correctPick, ...distractors] = pickRandom(all, 4);
    setAnswer(correctPick);
    setChoices(shuffle([correctPick, ...distractors]));
    setHintLevel(0);
    setRevealed(false);
    setCorrect(null);
    setTypedGuess("");
    setRound((r) => r + 1);
  }, [all]);

  useEffect(() => {
    if (all.length) nextRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  if (!answer) {
    return (
      <AppShell title="실루엣 퀴즈" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  function submitChoice(p) {
    const isCorrect = p.id === answer.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(30 - hintLevel * 10, 10);
      setScore((s) => s + earned);
      awardPoints(earned);
    }
  }

  function submitTyped() {
    const guess = typedGuess.trim();
    const isCorrect =
      guess === answer.nameKo || guess.toLowerCase() === answer.nameEn;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(30 - hintLevel * 10, 10);
      setScore((s) => s + earned);
      awardPoints(earned);
    }
  }

  function showNextHint() {
    setHintLevel((h) => Math.min(h + 1, HINT_STEPS.length));
  }

  return (
    <AppShell title="실루엣 퀴즈" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {round}번째 문제 · 점수 {score}점
        </p>

        <div
          style={{
            background: "var(--color-surface-2)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            margin: "var(--space-3) 0",
          }}
        >
          <img
            src={answer.artwork}
            alt="누구일까요"
            style={{
              width: 180,
              height: 180,
              objectFit: "contain",
              filter: revealed ? "none" : "brightness(0)",
              transition: "filter .4s",
            }}
          />
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
          {hintLevel >= 2 && (
            <HintLine>
              대표 색상은 <b>{COLOR_LABEL_KO[answer.color] || answer.color}</b>{" "}
              입니다.
            </HintLine>
          )}
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
            <ResultHeading correct={correct} />
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
            <button onClick={nextRound} style={primaryBtn}>
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
