# 퀴즈 중 진화 알림 토스트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 퀴즈 정답으로 포인트가 적립되어 "내 포켓몬"이 진화(또는 분기 진화 대기)에 들어가면, 결과 화면에 즉시 알림 배지("EvolutionToast")를 띄우고 짧은 합성 축하음을 재생한다. 실제 리빌 연출(단일 진화 팝업, 분기 선택 UI)은 지금처럼 `Home.jsx`에서만 재생된다 — 이 토스트는 예고편 역할만 한다.

**Architecture:** `useAwardPoints()`를 fire-and-forget에서 Promise를 반환하는 async 함수로 바꾼다. 세 퀴즈 페이지(`SilhouetteQuiz`, `CryQuiz`, `EvolutionQuiz`)의 정답 처리 함수가 그 결과를 `await`해 로컬 state에 저장하고, 새로 만드는 공유 컴포넌트 `EvolutionToast`를 각자의 결과 화면에 얹는다. 사운드는 별도 훅 `useEvolutionChime`(Web Audio API 합성, 외부 에셋 없음)으로 분리한다.

**Tech Stack:** React 19 + react-router-dom v7 + Vite, Vitest + @testing-library/react 16 (jsdom).

## Global Constraints

- 진화는 여전히 퀴즈 화면에서 트리거/연출되지 않는다 — `EVOLUTION_THRESHOLD`(`src/utils/myPokemon.js`)를 넘기는 판정은 그대로 `addPoints()`가 담당하고, 퀴즈 페이지는 그 결과를 표시만 한다.
- `Home.jsx`의 기존 진화 셀레브레이션(리빌 팝업, 분기 선택 UI)은 변경하지 않는다.
- 이 작업 범위는 `SilhouetteQuiz.jsx`, `CryQuiz.jsx`, `EvolutionQuiz.jsx` 세 페이지다. `ChosungQuiz.jsx`는 별도 작업으로 곧 삭제될 예정이라 손대지 않는다.
- 새 CSS 애니메이션을 추가하지 않는다 — 기존 `.evolution-reveal-new`(reduced-motion 게이트 이미 적용됨, `src/index.css:243-250`)를 재사용한다.
- 사운드 재생 실패(구형 브라우저, AudioContext 없음 등)는 항상 무음으로 처리하고 퀴즈 흐름을 절대 막지 않는다.
- 이 코드베이스는 `loadPokemonData()`(fetch 기반)에 의존하는 페이지/훅에 대해 **페이지 단위 자동 테스트를 작성하지 않는 기존 관례**가 있다(`src/hooks/useMyPokemonPoints.js`의 기존 주석, 그리고 `src/pages/*.test.jsx`가 fetch 의존 없는 `QuizHub.test.jsx` 하나뿐이라는 사실로 확인됨). 세 퀴즈 페이지 wiring 작업(Task 5~7)은 이 관례를 따라 자동 테스트 없이 수동 검증으로 확인한다.

---

## File Structure

**New:**
- `src/hooks/useMyPokemonPoints.test.js` — `useAwardPoints()`의 4가지 결과 케이스 테스트.
- `src/hooks/useEvolutionChime.js` — Web Audio API 합성 축하음 훅.
- `src/hooks/useEvolutionChime.test.js` — 예외 없이 호출되는지만 확인.
- `src/components/EvolutionToast.jsx` — 진화/분기 대기 알림 배지 컴포넌트.
- `src/components/EvolutionToast.test.jsx` — 3가지 렌더 케이스 + null 안전성.

**Modified:**
- `src/hooks/useMyPokemonPoints.js` — Promise를 반환하도록 변경.
- `src/styles/tokens.js` — `evolutionToast` 스타일 추가.
- `src/pages/SilhouetteQuiz.jsx` — `submitChoice`/`submitTyped`를 async로, `evolutionResult` state 추가, 결과 화면에 `EvolutionToast` 삽입.
- `src/pages/CryQuiz.jsx` — 위와 동일한 패턴.
- `src/pages/EvolutionQuiz.jsx` — `handleTap`을 async로, 나머지는 동일한 패턴.

---

### Task 1: `useMyPokemonPoints()`가 진화 결과를 반환하도록 변경

**Files:**
- Modify: `src/hooks/useMyPokemonPoints.js`
- Test: `src/hooks/useMyPokemonPoints.test.js`

**Interfaces:**
- Consumes: `getMyPokemon()`, `addPoints(points, currentStagePokemon)` from `src/utils/myPokemon.js` (기존, 시그니처 변경 없음 — `addPoints`는 `{evolved, branchChoicePending, newStageId, pointsSinceLastEvolution}`를 반환). `loadPokemonData()` from `src/utils/pokemonData.js` (기존).
- Produces: `useAwardPoints(): (points: number) => Promise<{ evolved: boolean, branchChoicePending: boolean, newStagePokemon: object|null } | null>` — 뒤의 모든 태스크가 이 반환 타입을 그대로 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/hooks/useMyPokemonPoints.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAwardPoints } from "./useMyPokemonPoints";
import { chooseStarter } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const bulbasaur = { id: 1, nameKo: "이상해씨", evolvesTo: [{ id: 2, minLevel: 16 }] };
const ivysaur = { id: 2, nameKo: "이상해풀", evolvesTo: [{ id: 3, minLevel: 32 }] };
const eevee = {
  id: 133,
  nameKo: "이브이",
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
};
const vaporeon = { id: 134, nameKo: "샤미드" };
const jolteon = { id: 135, nameKo: "쥬피썬더" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useAwardPoints", () => {
  it("내 포켓몬 레코드가 없으면 null을 반환하고 데이터를 불러오지 않는다", async () => {
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(30);
    expect(outcome).toBeNull();
    expect(loadPokemonData).not.toHaveBeenCalled();
  });

  it("임계값을 넘기지 않으면 evolved:false, newStagePokemon:null을 반환한다", async () => {
    chooseStarter(bulbasaur, "친구");
    loadPokemonData.mockResolvedValue([bulbasaur, ivysaur]);
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(10);
    expect(outcome).toEqual({
      evolved: false,
      branchChoicePending: false,
      newStagePokemon: null,
    });
  });

  it("단일 진화 시 evolved:true와 새 단계 포켓몬 객체를 반환한다", async () => {
    chooseStarter(bulbasaur, "친구");
    loadPokemonData.mockResolvedValue([bulbasaur, ivysaur]);
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(200);
    expect(outcome).toEqual({
      evolved: true,
      branchChoicePending: false,
      newStagePokemon: ivysaur,
    });
  });

  it("분기 진화 대기 시 branchChoicePending:true, newStagePokemon:null을 반환한다", async () => {
    chooseStarter(eevee, "친구");
    loadPokemonData.mockResolvedValue([eevee, vaporeon, jolteon]);
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(200);
    expect(outcome).toEqual({
      evolved: false,
      branchChoicePending: true,
      newStagePokemon: null,
    });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test -- useMyPokemonPoints`
Expected: FAIL — 현재 `useAwardPoints`가 반환하는 함수는 `undefined`를 반환하므로 `outcome`이 `undefined`가 되어 `toBeNull()`/`toEqual()` assertion이 깨진다.

- [ ] **Step 3: 구현 작성**

`src/hooks/useMyPokemonPoints.js` 전체를 다음으로 교체:

```js
import { useCallback } from "react";
import { getMyPokemon, addPoints } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

// 퀴즈 정답 시 포인트를 "내 포켓몬"에 적립하는 훅.
// 진화 트리거 판정은 addPoints()가 전담하고, 이 훅은 그 결과를 그대로 반환한다
// (퀴즈 화면이 진화/분기대기 여부에 따라 EvolutionToast를 띄울 수 있도록).
// 실제 리빌/분기선택 연출은 여전히 Home.jsx에서만 재생된다.
//
// 퀴즈 화면들의 `all` state는 1세대 필터(applyGen1OnlyFilter) 등이 적용돼 있을 수
// 있어, "내 포켓몬"의 현재 단계가 그 목록에 없을 수도 있다(필터 켠 뒤 non-gen1
// 스타터를 이미 키우고 있던 경우 등). 그래서 이 훅은 퀴즈 화면의 필터된 목록을
// 받지 않고, loadPokemonData()로 필터 없는 전체 목록을 직접(캐시되어 있으므로
// 추가 네트워크 요청 없이) 가져와 조회한다.
export function useAwardPoints() {
  return useCallback(async (points) => {
    const record = getMyPokemon();
    if (!record) return null; // 내 포켓몬이 없으면 조용히 무시

    const all = await loadPokemonData();
    const currentStagePokemon = all.find((p) => p.id === record.currentStageId);
    if (!currentStagePokemon) return null; // 방어적: 데이터에 없는 id면 무시

    const result = addPoints(points, currentStagePokemon);
    if (!result) return null;

    const newStagePokemon = result.evolved
      ? all.find((p) => p.id === result.newStageId) || null
      : null;

    return {
      evolved: result.evolved,
      branchChoicePending: result.branchChoicePending,
      newStagePokemon,
    };
  }, []);
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test -- useMyPokemonPoints`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useMyPokemonPoints.js src/hooks/useMyPokemonPoints.test.js
git commit -m "feat: useAwardPoints returns evolution outcome instead of fire-and-forget"
```

---

### Task 2: `useEvolutionChime` — 합성 축하음 훅

**Files:**
- Create: `src/hooks/useEvolutionChime.js`
- Test: `src/hooks/useEvolutionChime.test.js`

**Interfaces:**
- Produces: `useEvolutionChime(): () => void` — 호출 시 짧은 상승 아르페지오(3음)를 재생하는 `playChime` 함수를 반환한다. AudioContext를 생성하지 못하는 환경(jsdom 포함)에서도 절대 throw하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/hooks/useEvolutionChime.test.js`:

```js
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEvolutionChime } from "./useEvolutionChime";

describe("useEvolutionChime", () => {
  it("AudioContext가 없는 환경(jsdom)에서도 예외 없이 호출된다", () => {
    const { result } = renderHook(() => useEvolutionChime());
    expect(() => result.current()).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test -- useEvolutionChime`
Expected: FAIL — `./useEvolutionChime` 모듈이 없어 import 에러.

- [ ] **Step 3: 구현 작성**

`src/hooks/useEvolutionChime.js`:

```js
// 진화 알림 토스트가 뜰 때 재생하는 짧은 합성 축하음.
// 외부 오디오 에셋 없이 Web Audio API로 3음 상승 아르페지오를 만든다.
// AudioContext 생성/재생이 실패하는 환경(구형 브라우저, jsdom 등)에서는
// 조용히 무시하고 절대 throw하지 않는다 — 퀴즈 흐름을 막으면 안 되기 때문.

let sharedContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) {
    try {
      sharedContext = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedContext;
}

const CHIME_NOTES_HZ = [523.25, 659.25, 783.99]; // C5, E5, G5
const NOTE_DURATION_S = 0.09;
const NOTE_GAP_S = 0.03;

export function useEvolutionChime() {
  return function playChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      let startTime = ctx.currentTime;
      CHIME_NOTES_HZ.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + NOTE_DURATION_S);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + NOTE_DURATION_S);
        startTime += NOTE_DURATION_S + NOTE_GAP_S;
      });
    } catch {
      // 무음 처리
    }
  };
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test -- useEvolutionChime`
Expected: PASS (1 test)

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useEvolutionChime.js src/hooks/useEvolutionChime.test.js
git commit -m "feat: add synthesized evolution chime hook"
```

---

### Task 3: `EvolutionToast` 컴포넌트

**Files:**
- Create: `src/components/EvolutionToast.jsx`
- Test: `src/components/EvolutionToast.test.jsx`
- Modify: `src/styles/tokens.js`

**Interfaces:**
- Consumes: `useEvolutionChime()` (Task 2), `SparklesIcon` from `src/components/Icons.jsx` (기존), `evolutionToast` style (이 태스크에서 추가).
- Produces: `export default function EvolutionToast({ result })` — `result`는 Task 1의 `useAwardPoints()` Promise가 resolve하는 값과 동일한 shape(`{evolved, branchChoicePending, newStagePokemon}`, 또는 `null`). `evolved`나 `branchChoicePending`이 둘 다 false거나 `result`가 `null`이면 아무것도 렌더하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/EvolutionToast.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvolutionToast from "./EvolutionToast";

describe("EvolutionToast", () => {
  it("evolved일 때 새 단계 이름과 함께 렌더된다", () => {
    render(
      <EvolutionToast
        result={{
          evolved: true,
          branchChoicePending: false,
          newStagePokemon: { nameKo: "이상해풀" },
        }}
      />
    );
    expect(screen.getByText(/이상해풀\(으\)로 진화했어요/)).toBeInTheDocument();
  });

  it("newStagePokemon이 없어도 evolved면 폴백 문구로 렌더된다", () => {
    render(
      <EvolutionToast
        result={{ evolved: true, branchChoicePending: false, newStagePokemon: null }}
      />
    );
    expect(screen.getByText("짠! 진화했어요!")).toBeInTheDocument();
  });

  it("branchChoicePending일 때 홈 안내 문구가 렌더된다", () => {
    render(
      <EvolutionToast
        result={{ evolved: false, branchChoicePending: true, newStagePokemon: null }}
      />
    );
    expect(screen.getByText("진화 준비 완료! 홈에서 골라보세요")).toBeInTheDocument();
  });

  it("evolved도 branchChoicePending도 아니면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <EvolutionToast
        result={{ evolved: false, branchChoicePending: false, newStagePokemon: null }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("result가 null이어도 예외 없이 아무것도 렌더하지 않는다", () => {
    const { container } = render(<EvolutionToast result={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test -- EvolutionToast`
Expected: FAIL — `./EvolutionToast` 모듈이 없어 import 에러.

- [ ] **Step 3: `tokens.js`에 스타일 추가**

`src/styles/tokens.js` 맨 끝에 추가:

```js
export const evolutionToast = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: "var(--radius-pill)",
  border: "1.5px solid var(--color-accent)",
  background: "color-mix(in srgb, var(--color-accent) 16%, transparent)",
  color: "var(--color-text)",
  fontWeight: 700,
  fontSize: 14,
  margin: "var(--space-2) 0",
};
```

- [ ] **Step 4: 컴포넌트 구현**

`src/components/EvolutionToast.jsx`:

```jsx
import { useEffect } from "react";
import { SparklesIcon } from "./Icons";
import { evolutionToast } from "../styles/tokens";
import { useEvolutionChime } from "../hooks/useEvolutionChime";

function getMessage(result) {
  if (result.branchChoicePending) return "진화 준비 완료! 홈에서 골라보세요";
  if (result.newStagePokemon) return `짠! ${result.newStagePokemon.nameKo}(으)로 진화했어요!`;
  return "짠! 진화했어요!";
}

export default function EvolutionToast({ result }) {
  const playChime = useEvolutionChime();
  const shouldShow = Boolean(result?.evolved || result?.branchChoicePending);

  useEffect(() => {
    if (shouldShow) playChime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div className="evolution-reveal-new" style={evolutionToast}>
      <SparklesIcon size={20} />
      <span>{getMessage(result)}</span>
    </div>
  );
}
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npm test -- EvolutionToast`
Expected: PASS (5 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/components/EvolutionToast.jsx src/components/EvolutionToast.test.jsx src/styles/tokens.js
git commit -m "feat: add EvolutionToast component"
```

---

### Task 4: `SilhouetteQuiz.jsx`에 진화 토스트 연결

**Files:**
- Modify: `src/pages/SilhouetteQuiz.jsx`

**Interfaces:**
- Consumes: `EvolutionToast` (Task 3), `useAwardPoints()`가 반환하는 Promise (Task 1).

자동 테스트 없음 — Global Constraints에서 설명한 기존 관례(fetch 의존 페이지는 페이지 단위 테스트를 만들지 않음)를 따른다. 수동 검증으로 확인한다.

- [ ] **Step 1: import와 state 추가**

`src/pages/SilhouetteQuiz.jsx` 상단 import에 추가:

```js
import EvolutionToast from "../components/EvolutionToast";
```

`const awardPoints = useAwardPoints();` 바로 아래 줄에 추가:

```js
const [evolutionResult, setEvolutionResult] = useState(null);
```

- [ ] **Step 2: `submitChoice`/`submitTyped`를 async로 변경**

기존:

```js
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
```

다음으로 교체:

```js
  async function submitChoice(p) {
    const isCorrect = p.id === answer.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(30 - hintLevel * 10, 10);
      setScore((s) => s + earned);
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
      setEvolutionResult(await awardPoints(earned));
    }
  }
```

- [ ] **Step 3: `nextRound`에서 리셋, 결과 화면에 토스트 렌더**

`nextRound` 안, `setCorrect(null);` 바로 아래에 추가:

```js
    setEvolutionResult(null);
```

결과 화면 JSX에서 `<ResultHeading correct={correct} />` 바로 아래에 추가:

```jsx
            <EvolutionToast result={evolutionResult} />
```

(전체 블록은 `{revealed && (...)}` 안, `<ResultHeading correct={correct} />` 다음 줄.)

- [ ] **Step 4: 수동 검증**

```bash
npm run dev
```

1. 브라우저에서 `/mine/choose`로 이동해 스타터를 하나 고른다(예: 이상해씨).
2. 브라우저 개발자 콘솔에서 진화 임계값 바로 아래까지 포인트를 미리 채운다:
   ```js
   const r = JSON.parse(localStorage.getItem("pokemonMine.v1"));
   r.pointsSinceLastEvolution = 175;
   localStorage.setItem("pokemonMine.v1", JSON.stringify(r));
   ```
   (실루엣 퀴즈 정답 1회 최대 30점이므로 다음 정답 하나로 200점 임계값을 넘긴다.)
3. `/quiz/silhouette`로 이동해 문제를 정답으로 맞힌다.
4. 결과 화면에 "정답입니다!" 아래로 스파클 아이콘과 함께 진화 알림 배지("짠! …(으)로 진화했어요!")가 뜨고, 합성 축하음이 들리는지 확인한다.
5. `/mine`(홈)으로 이동해 기존 리빌 연출이 그대로 재생되는지 확인한다 — 이번 변경으로 영향받지 않아야 한다.
6. 오답을 골랐을 때는 토스트가 뜨지 않는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/pages/SilhouetteQuiz.jsx
git commit -m "feat: show evolution toast on SilhouetteQuiz result screen"
```

---

### Task 5: `CryQuiz.jsx`에 진화 토스트 연결

**Files:**
- Modify: `src/pages/CryQuiz.jsx`

**Interfaces:** Task 4와 동일 (`EvolutionToast`, `useAwardPoints()` Promise).

Task 4와 완전히 동일한 패턴이지만, 결과 화면 레이아웃이 달라 삽입 위치가 다르다 (`<ResultHeading correct={correct} />`가 아트워크 `<img>` 다음, 정답 설명 앞에 위치).

- [ ] **Step 1: import와 state 추가**

`src/pages/CryQuiz.jsx` 상단 import에 추가:

```js
import EvolutionToast from "../components/EvolutionToast";
```

`const awardPoints = useAwardPoints();` 바로 아래 줄에 추가:

```js
const [evolutionResult, setEvolutionResult] = useState(null);
```

- [ ] **Step 2: `submitChoice`/`submitTyped`를 async로 변경**

기존:

```js
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
```

다음으로 교체:

```js
  async function submitChoice(p) {
    const isCorrect = p.id === answer.id;
    setCorrect(isCorrect);
    setRevealed(true);
    if (isCorrect) {
      const earned = Math.max(30 - hintLevel * 10, 10);
      setScore((s) => s + earned);
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
      setEvolutionResult(await awardPoints(earned));
    }
  }
```

- [ ] **Step 3: `nextRound`에서 리셋, 결과 화면에 토스트 렌더**

`nextRound` 안, `setCorrect(null);` 바로 아래에 추가:

```js
    setEvolutionResult(null);
```

결과 화면 JSX에서 `<ResultHeading correct={correct} />` 바로 아래에 추가:

```jsx
            <EvolutionToast result={evolutionResult} />
```

- [ ] **Step 4: 수동 검증**

```bash
npm run dev
```

Task 4의 수동 검증과 동일한 절차를, `/quiz/cry`에서 반복한다 (스타터를 새로 고를 필요 없이 이미 있는 레코드를 재사용하되, `pointsSinceLastEvolution`을 다시 175로 맞춘다).

- [ ] **Step 5: 커밋**

```bash
git add src/pages/CryQuiz.jsx
git commit -m "feat: show evolution toast on CryQuiz result screen"
```

---

### Task 6: `EvolutionQuiz.jsx`에 진화 토스트 연결

**Files:**
- Modify: `src/pages/EvolutionQuiz.jsx`

**Interfaces:** Task 4와 동일 (`EvolutionToast`, `useAwardPoints()` Promise).

이 페이지는 `submitChoice`/`submitTyped`가 아니라 `handleTap`이 정답 판정을 겸한다.

- [ ] **Step 1: import와 state 추가**

`src/pages/EvolutionQuiz.jsx` 상단 import에 추가:

```js
import EvolutionToast from "../components/EvolutionToast";
```

`const awardPoints = useAwardPoints();` 바로 아래 줄에 추가:

```js
const [evolutionResult, setEvolutionResult] = useState(null);
```

- [ ] **Step 2: `handleTap`을 async로 변경**

기존:

```js
  function handleTap(id) {
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
        awardPoints(earned);
      }
    }
  }
```

다음으로 교체:

```js
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
        setEvolutionResult(await awardPoints(earned));
      }
    }
  }
```

- [ ] **Step 3: `nextRound`에서 리셋, 결과 화면에 토스트 렌더**

`nextRound` 안, `setCorrect(null);` 바로 아래에 추가:

```js
    setEvolutionResult(null);
```

결과 화면 JSX에서 `<ResultHeading correct={correct} />` 바로 아래에 추가:

```jsx
            <EvolutionToast result={evolutionResult} />
```

- [ ] **Step 4: 수동 검증**

```bash
npm run dev
```

Task 4의 수동 검증과 동일한 절차를, `/quiz/evolution`에서 반복한다. 이 퀴즈는 진화 전후 순서를 탭으로 맞히는 방식이므로, 정답 순서대로 탭해서 완료해야 결과 화면이 뜬다.

- [ ] **Step 5: 커밋**

```bash
git add src/pages/EvolutionQuiz.jsx
git commit -m "feat: show evolution toast on EvolutionQuiz result screen"
```

---

### Task 7: 전체 회귀 확인

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 파일 PASS, 새로 추가된 `useMyPokemonPoints.test.js`/`useEvolutionChime.test.js`/`EvolutionToast.test.jsx` 포함.

- [ ] **Step 2: 린트 확인**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 세 퀴즈 모두 연속 수동 스모크 테스트**

`npm run dev` 상태에서 `/quiz/silhouette` → `/quiz/cry` → `/quiz/evolution` 순서로 각각 한 번씩 진화를 트리거해보고, 매번 토스트/사운드가 뜨고 Home의 기존 셀레브레이션이 정상 작동하는지 최종 확인한다. 분기 진화(이브이 계열)가 걸리는 경우 "진화 준비 완료! 홈에서 골라보세요" 문구가 뜨는지도 한 번 확인한다.

- [ ] **Step 4: 커밋 (필요 시)**

이 태스크는 검증 전용이라 보통 커밋할 변경사항이 없다. 만약 Step 1~3에서 문제를 발견해 수정했다면 해당 수정을 별도로 커밋한다.
