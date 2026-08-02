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

const HINT_STEPS = ["type", "description", "generation"];
const GENERATION_LABEL_KO = {
  "generation-i": "1세대",
  "generation-ii": "2세대",
  "generation-iii": "3세대",
  "generation-iv": "4세대",
  "generation-v": "5세대",
  "generation-vi": "6세대",
  "generation-vii": "7세대",
  "generation-viii": "8세대",
  "generation-ix": "9세대",
};

export default function ChosungQuiz() {
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
      setAll(applyGen1OnlyFilter(data.filter((p) => p.nameKo)));
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
      <AppShell title="초성 퀴즈" backTo="/quiz">
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
    <AppShell title="초성 퀴즈" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {round}번째 문제 · 점수 {score}점
        </p>

        <div
          style={{
            background: "var(--color-surface-2)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-6) var(--space-4)",
            margin: "var(--space-3) 0",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 6 }}>
            {getChosung(answer.nameKo)}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            초성 {getChosung(answer.nameKo).length}글자
          </div>
        </div>

        {!revealed && hintLevel < HINT_STEPS.length && (
          <button onClick={showNextHint} style={hintBtn}>
            <LightbulbIcon size={16} />
            힌트 더보기 ({hintLevel}/{HINT_STEPS.length})
          </button>
        )}

        <div style={{ minHeight: 90, fontSize: 14, color: "var(--color-text)" }}>
          {hintLevel >= 1 && (
            <HintLine>
              이 포켓몬의 타입은{" "}
              <b>{answer.types.map((t) => TYPE_LABEL_KO[t] || t).join(", ")}</b>{" "}
              입니다.
            </HintLine>
          )}
          {hintLevel >= 2 && <HintLine>{answer.descriptionKo || answer.descriptionEn}</HintLine>}
          {hintLevel >= 3 && (
            <HintLine>
              <b>{GENERATION_LABEL_KO[answer.generation] || answer.generation}</b> 포켓몬입니다.
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
