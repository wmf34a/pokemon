# 퀴즈 세션 길이 제한 (20문제) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `SilhouetteQuiz`, `CryQuiz`, `EvolutionQuiz` 세 퀴즈를 무한 라운드에서 세션당 20문제로 제한하고, 20문제를 다 풀면 결과 요약 화면(정답 수 · 총점 · "다시 하기"/"퀴즈 목록으로")을 보여주도록 바꾼다.

**Architecture:** 세션 시작 시 `pickRandom(all, SESSION_LENGTH)`(기존 `src/utils/pokemonData.js`의 `pickRandom`, 이미 중복 없이 샘플링하고 풀이 작으면 있는 만큼만 반환하도록 테스트되어 있음)로 "이번 세션의 정답 포켓몬 20개"를 미리 뽑아 `sessionQuestions` state에 저장한다. `questionIndex`로 진행 상황을 추적하고, 마지막 문제를 넘기면 결과 화면으로 전환한다. `EvolutionQuiz`는 정답이 포켓몬 1개가 아니라 진화 체인이므로, 시작 후보를 `pickRandom`으로 20개 뽑은 뒤 기존 `buildEvolutionChain`으로 각각 체인을 만든다.

**Tech Stack:** React 19 + react-router-dom v7 + Vite, Vitest + @testing-library/react.

## Global Constraints

- 세션 길이는 `SESSION_LENGTH = 20`으로 고정, 매직 넘버로 흩뿌리지 않고 `src/utils/pokemonData.js`의 named export 하나로 관리한다.
- 세션마다(재진입이든 "다시 하기"든) 순수 랜덤으로 새로 뽑는다 — 직전 세션과의 중복 회피 로직을 추가하지 않는다.
- 오답 보기(distractors)는 세션에 고정하지 않고 지금처럼 매 문제 전체 풀에서 새로 뽑는다.
- 새 순수 로직 모듈을 추가하지 않는다 — `pickRandom`(이미 `src/utils/pokemonData.test.js`에서 중복 없음/count 초과 방지/풀 부족 시 방어를 테스트 중)을 그대로 재사용한다. 디자인 스펙 초안은 별도 `pickSessionAnswers` 함수를 제안했으나, 이미 동일한 동작을 하는 `pickRandom`이 존재하므로 중복 구현하지 않는다(DRY).
- `ChosungQuiz.jsx`는 건드리지 않는다(별도 작업으로 곧 삭제 예정).
- 이 코드베이스는 `loadPokemonData()`(fetch 기반)에 의존하는 페이지에 대해 페이지 단위 자동 테스트를 작성하지 않는 기존 관례가 있다 — 이번 세 페이지 wiring도 자동 테스트 없이 수동 검증으로 확인한다.
- 결과 화면의 분모는 항상 실제 `sessionQuestions.length`를 쓴다(`EvolutionQuiz`는 후보 풀 사정상 20보다 적게 채워질 수 있음) — "20문제 중" 같은 고정 문구를 쓰지 않는다.

---

## File Structure

**Modified:**
- `src/utils/pokemonData.js` — `SESSION_LENGTH = 20` named export 추가.
- `src/pages/SilhouetteQuiz.jsx` — 세션 state/로직 추가, 결과 요약 화면 추가.
- `src/pages/CryQuiz.jsx` — 위와 동일한 패턴.
- `src/pages/EvolutionQuiz.jsx` — 후보 샘플링 + `buildEvolutionChain` 기반 세션 준비, 결과 요약 화면 추가.

---

### Task 1: `SESSION_LENGTH` 상수 추가 + `SilhouetteQuiz.jsx`에 세션 제한 적용

**Files:**
- Modify: `src/utils/pokemonData.js`
- Modify: `src/pages/SilhouetteQuiz.jsx`

**Interfaces:**
- Consumes: `pickRandom(list, n)` from `src/utils/pokemonData.js`(기존, 변경 없음 — 중복 없이 최대 `n`개, 풀이 작으면 있는 만큼만 반환).
- Produces: `SESSION_LENGTH`(`= 20`) named export from `src/utils/pokemonData.js` — Task 2/3이 그대로 import해서 쓴다.

- [ ] **Step 1: `src/utils/pokemonData.js`에 `SESSION_LENGTH` 추가**

`export const SORT_OPTIONS = {` 바로 위 줄에 추가:

```js
// 퀴즈 한 세션에서 출제할 문제 수. 다 풀면 결과 요약 화면으로 전환되고,
// "다시 하기"나 재진입 시 매번 새로 순수 랜덤으로 20문제를 뽑는다(직전
// 세션과의 중복 회피는 하지 않음).
export const SESSION_LENGTH = 20;

```

- [ ] **Step 2: `src/pages/SilhouetteQuiz.jsx` 전체 내용을 다음으로 교체**

```jsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import AudioButton from "../components/AudioButton";
import { LightbulbIcon, CheckIcon, XCircleIcon } from "../components/Icons";
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

const HINT_STEPS = ["type", "color", "chosung"];
const COLOR_LABEL_KO = {
  black: "검은색", blue: "파란색", brown: "갈색", gray: "회색",
  green: "초록색", pink: "분홍색", purple: "보라색", red: "빨간색",
  white: "흰색", yellow: "노란색",
};

export default function SilhouetteQuiz() {
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
  const awardPoints = useAwardPoints();
  const [evolutionResult, setEvolutionResult] = useState(null);

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
      <AppShell title="실루엣 퀴즈" backTo="/quiz">
        <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
          <h2>세션 완료!</h2>
          <p style={{ marginTop: 8, fontSize: 15 }}>
            {sessionQuestions.length}문제 중 <b>{correctCount}문제</b> 정답 · 총{" "}
            <b>{score}점</b>
          </p>
          <button onClick={startSession} style={primaryBtn}>
            다시 하기
          </button>
          <div style={{ marginTop: 8 }}>
            <Link
              to="/quiz"
              style={{
                color: "var(--color-text-muted)",
                fontSize: 13,
                textDecoration: "underline",
              }}
            >
              퀴즈 목록으로
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!answer) {
    return (
      <AppShell title="실루엣 퀴즈" backTo="/quiz">
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
    }
  }

  function showNextHint() {
    setHintLevel((h) => Math.min(h + 1, HINT_STEPS.length));
  }

  return (
    <AppShell title="실루엣 퀴즈" backTo="/quiz">
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
            <EvolutionToast result={evolutionResult} />
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
```

- [ ] **Step 3: 수동 검증**

```bash
npm run dev
```

1. `/quiz/silhouette`로 이동, 헤더에 "1/20번째 문제 · 점수 0점"이 뜨는지 확인.
2. 문제를 몇 개 풀어보며 인덱스가 "2/20", "3/20"으로 올라가는지 확인. 기존처럼 힌트/객관식/주관식/진화 토스트가 정상 작동하는지도 함께 확인.
3. 브라우저 콘솔에서 `questionIndex`를 19까지 강제로 넘기기보다, 실제로 20문제를 끝까지 풀어(또는 코드상 임시로 `SESSION_LENGTH`를 낮춰 로컬에서만 확인 후 되돌리기) 결과 화면("세션 완료! N문제 중 M문제 정답 · 총 X점")이 뜨는지 확인.
4. "다시 하기" 클릭 시 "1/20번째 문제"로 리셋되고 점수/정답 수도 0으로 돌아가는지 확인.
5. "퀴즈 목록으로" 클릭 시 `/quiz`로 이동하는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/utils/pokemonData.js src/pages/SilhouetteQuiz.jsx
git commit -m "feat: cap SilhouetteQuiz sessions at 20 questions with a results screen"
```

---

### Task 2: `CryQuiz.jsx`에 세션 제한 적용

**Files:**
- Modify: `src/pages/CryQuiz.jsx`

**Interfaces:** Task 1과 동일 (`pickRandom`, `SESSION_LENGTH` — 이미 `pokemonData.js`에 존재).

Task 1과 완전히 같은 패턴이지만, `CryQuiz`는 오디오 재생용 `audioRef`/`playCry`, 결과 화면의 아트워크 `<img>` 위치가 다르다.

- [ ] **Step 1: `src/pages/CryQuiz.jsx` 전체 내용을 다음으로 교체**

```jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
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
      <AppShell title="울음소리 퀴즈" backTo="/quiz">
        <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
          <h2>세션 완료!</h2>
          <p style={{ marginTop: 8, fontSize: 15 }}>
            {sessionQuestions.length}문제 중 <b>{correctCount}문제</b> 정답 · 총{" "}
            <b>{score}점</b>
          </p>
          <button onClick={startSession} style={primaryBtn}>
            다시 하기
          </button>
          <div style={{ marginTop: 8 }}>
            <Link
              to="/quiz"
              style={{
                color: "var(--color-text-muted)",
                fontSize: 13,
                textDecoration: "underline",
              }}
            >
              퀴즈 목록으로
            </Link>
          </div>
        </div>
      </AppShell>
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
            <p>
              정답은 <b>{answer.nameKo}</b> ({answer.nameEn}) 이었습니다.
            </p>
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
```

- [ ] **Step 2: 수동 검증**

Task 1의 수동 검증과 동일한 절차를 `/quiz/cry`에서 반복한다. 추가로 힌트 2단계 이상에서 아트워크가 뜨는 것과 소리 재생이 문제 전환 시마다 정상 작동하는지도 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add src/pages/CryQuiz.jsx
git commit -m "feat: cap CryQuiz sessions at 20 questions with a results screen"
```

---

### Task 3: `EvolutionQuiz.jsx`에 세션 제한 적용

**Files:**
- Modify: `src/pages/EvolutionQuiz.jsx`

**Interfaces:**
- Consumes: `pickRandom`, `SESSION_LENGTH`(`src/utils/pokemonData.js`, Task 1에서 추가됨); `getEvolutionQuizCandidates(allPokemon)`, `buildEvolutionChain(startPokemon, allPokemon)`(둘 다 기존, `src/utils/evolutionQuizChain.js` — 변경 없음).

이 페이지는 정답이 포켓몬 1개가 아니라 진화 체인이라, 세션 준비 방식이 다르다: 후보 포켓몬을 20개 뽑은 뒤 각각 체인을 만들고, `buildEvolutionChain`이 2단계 미만 체인을 만든 후보(기존 `pickEvolutionQuizChain`과 동일한 방어 조건)는 걸러낸다. 기존 `pickEvolutionQuizChain`/`MAX_PICK_ATTEMPTS`는 더 이상 쓰지 않는다.

- [ ] **Step 1: `src/pages/EvolutionQuiz.jsx` 전체 내용을 다음으로 교체**

```jsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
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
import EvolutionToast from "../components/EvolutionToast";
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
      <AppShell title="진화 순서 맞추기" backTo="/quiz">
        <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
          <h2>세션 완료!</h2>
          <p style={{ marginTop: 8, fontSize: 15 }}>
            {sessionChains.length}문제 중 <b>{correctCount}문제</b> 정답 · 총{" "}
            <b>{score}점</b>
          </p>
          <button onClick={startSession} style={primaryBtn}>
            다시 하기
          </button>
          <div style={{ marginTop: 8 }}>
            <Link
              to="/quiz"
              style={{
                color: "var(--color-text-muted)",
                fontSize: 13,
                textDecoration: "underline",
              }}
            >
              퀴즈 목록으로
            </Link>
          </div>
        </div>
      </AppShell>
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
```

- [ ] **Step 2: 수동 검증**

Task 1의 수동 검증과 동일한 절차를 `/quiz/evolution`에서 반복한다. 이 퀴즈는 진화 전후 순서를 탭으로 맞히는 방식이므로, 20문제를 다 도는 동안 매번 정답 순서대로 탭해서 완료해야 결과 화면까지 도달할 수 있다. 결과 화면의 분모가 후보 풀 사정에 따라 20보다 작게 나올 수도 있다는 점(Global Constraints 참고)도 이상 동작이 아니라는 걸 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add src/pages/EvolutionQuiz.jsx
git commit -m "feat: cap EvolutionQuiz sessions at 20 questions with a results screen"
```

---

### Task 4: 전체 회귀 확인

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 파일 PASS (`pickRandom` 관련 기존 테스트 포함, 새로 추가된 테스트 없음 — 이번 작업은 기존에 이미 테스트된 `pickRandom`을 재사용).

- [ ] **Step 2: 린트 확인**

Run: `npm run lint`
Expected: 에러 없음(기존에 있던 무관한 warning 제외).

- [ ] **Step 3: 세 퀴즈 모두 연속 수동 스모크 테스트**

`npm run dev` 상태에서 `/quiz/silhouette` → `/quiz/cry` → `/quiz/evolution` 순서로 각각 최소 한 번씩 세션을 끝까지(20문제) 풀어보고, 결과 화면 → "다시 하기" → 새 세션 시작까지 한 번씩 확인한다. 세 페이지 모두 헤더의 "N/20번째 문제" 표시와 결과 화면 문구가 페이지별로 자연스럽게 맞는지 최종 확인한다.

- [ ] **Step 4: 커밋 (필요 시)**

이 태스크는 검증 전용이라 보통 커밋할 변경사항이 없다. 만약 Step 1~3에서 문제를 발견해 수정했다면 해당 수정을 별도로 커밋한다.
