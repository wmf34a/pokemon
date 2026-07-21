import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  loadPokemonData,
  pickRandom,
  TYPE_LABEL_KO,
  applyGen1OnlyFilter,
} from "../utils/pokemonData";
import { getChosung } from "../utils/hangul";

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

  if (!answer) return <div style={{ padding: 20 }}>불러오는 중...</div>;

  function submitChoice(p) {
    const isCorrect = p.id === answer.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      setScore((s) => s + Math.max(30 - hintLevel * 10, 10));
    }
  }

  function submitTyped() {
    const guess = typedGuess.trim();
    const isCorrect =
      guess === answer.nameKo || guess.toLowerCase() === answer.nameEn;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      setScore((s) => s + Math.max(30 - hintLevel * 10, 10));
    }
  }

  function showNextHint() {
    setHintLevel((h) => Math.min(h + 1, HINT_STEPS.length));
  }

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <Link to="/quiz">← 퀴즈 목록</Link>
      <h1 style={{ fontSize: 22, margin: "10px 0" }}>🔤 초성 퀴즈</h1>
      <p style={{ fontSize: 13, color: "#888" }}>
        {round}번째 문제 · 점수 {score}점
      </p>

      <div
        style={{
          background: "#f2f2f2",
          borderRadius: 16,
          padding: 24,
          margin: "12px 0",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 6 }}>
          {getChosung(answer.nameKo)}
        </div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
          초성 {getChosung(answer.nameKo).length}글자
        </div>
      </div>

      {!revealed && hintLevel < HINT_STEPS.length && (
        <button onClick={showNextHint} style={secondaryBtn}>
          힌트 더보기 ({hintLevel}/{HINT_STEPS.length})
        </button>
      )}

      <div style={{ minHeight: 90, fontSize: 14, color: "#444" }}>
        {hintLevel >= 1 && (
          <p>
            💡 이 포켓몬의 타입은{" "}
            <b>{answer.types.map((t) => TYPE_LABEL_KO[t] || t).join(", ")}</b>{" "}
            입니다.
          </p>
        )}
        {hintLevel >= 2 && (
          <p style={{ padding: "0 8px" }}>
            📖 {answer.descriptionKo || answer.descriptionEn}
          </p>
        )}
        {hintLevel >= 3 && (
          <p>
            🌍{" "}
            <b>{GENERATION_LABEL_KO[answer.generation] || answer.generation}</b>{" "}
            포켓몬입니다.
          </p>
        )}
      </div>

      {!revealed && (
        <div style={{ margin: "16px 0" }}>
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => setMode("choice")}
              style={pill(mode === "choice")}
            >
              객관식 (아이 모드)
            </button>
            <button
              onClick={() => setMode("typed")}
              style={pill(mode === "typed")}
            >
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
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
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
          <h2 style={{ color: correct ? "#2e7d32" : "#c62828" }}>
            {correct ? "정답입니다! 🎉" : "아쉬워요!"}
          </h2>
          <p>
            정답은 <b>{answer.nameKo}</b> ({answer.nameEn}) 이었습니다.
          </p>
          {answer.cry && (
            <audio key={answer.id} controls autoPlay src={answer.cry} />
          )}
          <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
            {answer.descriptionKo || answer.descriptionEn}
          </p>
          <button onClick={nextRound} style={primaryBtn}>
            다음 문제 →
          </button>
        </div>
      )}
    </div>
  );
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const choiceBtn = {
  padding: "12px 8px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 15,
  cursor: "pointer",
};

const primaryBtn = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#1F3864",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 10,
};

const secondaryBtn = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #F2C31A",
  background: "#FFF7DD",
  color: "#7a5c00",
  cursor: "pointer",
  marginBottom: 8,
};

function pill(active) {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: active ? "2px solid #1F3864" : "1px solid #ddd",
    background: active ? "#1F3864" : "#fff",
    color: active ? "#fff" : "#333",
    fontSize: 12,
    marginRight: 6,
    cursor: "pointer",
  };
}
