# 카드 수집 (CardCollection) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 퀴즈 정답을 맞출 때마다 해당 포켓몬 카드를 등급(일반/보통/레어/초희귀)과 함께 지급하고, `/collection`에서 뒤집어 볼 수 있는 카드 수집첩을 만든다.

**Architecture:** `myPokemon.js`와 같은 순수함수+localStorage 방어 패턴으로 `src/utils/cardCollection.js`를 만들고(`rollGrade`/`awardCard`), 이미 있는 5개 퀴즈 페이지의 정답 처리 지점(`awardPoints` 호출부)마다 한 줄씩 `awardCard`를 추가한다. 카드 그리드는 `Dex.jsx`의 그리드 레이아웃을, 카드 뒤집기는 순수 CSS `transform: rotateY`로 구현한다.

**Tech Stack:** React 19, react-router-dom 7, vitest + @testing-library/react, CSS 변수 토큰.

**선행 조건:** `docs/superpowers/plans/2026-08-07-daily-pokemon.md`가 먼저 적용되어 `src/pages/MoreMenu.jsx`(Task 3)와 하단 네비 "더보기" 탭(Task 2)이 이미 존재해야 한다.

## Global Constraints

- 기존 진화 시스템(`src/utils/myPokemon.js`)과 `useAwardPoints`/`addPoints` 로직은 수정하지 않는다 — 카드 지급은 완전히 별개의 병렬 시스템이다.
- `localStorage` 접근은 항상 try/catch로 감싼다.
- 색상은 CSS 변수만 사용(하드코딩 금지) — 카드 등급 색은 새 CSS 변수로 `src/index.css`에 추가한다.
- 이미 카드가 있는 포켓몬을 다시 뽑아도 재추첨하지 않는다(등급 고정).
- 카드 등급 확률: 일반 50% / 보통 30% / 레어 15% / 초희귀 5%.
- 한글 UI.

---

### Task 1: `cardCollection.js` — 등급 추첨 + 카드 지급

**Files:**
- Create: `src/utils/cardCollection.js`
- Test: `src/utils/cardCollection.test.js`

**Interfaces:**
- Produces:
  - `GRADES: string[]` = `["common", "uncommon", "rare", "legendary"]`
  - `GRADE_LABEL_KO: Record<string,string>` = `{ common: "일반", uncommon: "보통", rare: "레어", legendary: "초희귀" }`
  - `GRADE_COLOR_VAR: Record<string,string>` — CSS 변수 참조 문자열(Task 2에서 정의할 `--card-grade-*` 변수를 가리킴).
  - `rollGrade(random = Math.random): string` — 등급 하나를 순수하게 계산.
  - `awardCard(pokemonId: number, random = Math.random): { isNew: boolean, grade: string }` — localStorage에 저장/조회.
  - `getCards(): Record<number, { grade: string, earnedAt: string }>`
  - `hasCard(pokemonId: number): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/cardCollection.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { rollGrade, awardCard, getCards, hasCard } from "./cardCollection";

beforeEach(() => {
  localStorage.clear();
});

describe("rollGrade", () => {
  it("난수 0 이상 0.5 미만이면 일반이다", () => {
    expect(rollGrade(() => 0)).toBe("common");
    expect(rollGrade(() => 0.4999)).toBe("common");
  });

  it("난수 0.5 이상 0.8 미만이면 보통이다", () => {
    expect(rollGrade(() => 0.5)).toBe("uncommon");
    expect(rollGrade(() => 0.7999)).toBe("uncommon");
  });

  it("난수 0.8 이상 0.95 미만이면 레어다", () => {
    expect(rollGrade(() => 0.8)).toBe("rare");
    expect(rollGrade(() => 0.9499)).toBe("rare");
  });

  it("난수 0.95 이상이면 초희귀다", () => {
    expect(rollGrade(() => 0.95)).toBe("legendary");
    expect(rollGrade(() => 0.999999)).toBe("legendary");
  });
});

describe("awardCard", () => {
  it("처음 뽑는 포켓몬이면 isNew:true와 함께 카드를 저장한다", () => {
    const result = awardCard(25, () => 0.9); // 0.9 -> rare
    expect(result).toEqual({ isNew: true, grade: "rare" });
    expect(getCards()[25]).toMatchObject({ grade: "rare" });
    expect(typeof getCards()[25].earnedAt).toBe("string");
  });

  it("이미 있는 포켓몬이면 재추첨하지 않고 기존 등급을 그대로 반환한다", () => {
    awardCard(25, () => 0); // common으로 고정
    const second = awardCard(25, () => 0.99); // legendary가 나올 난수를 줘도
    expect(second).toEqual({ isNew: false, grade: "common" }); // 그대로 common 유지
  });

  it("hasCard는 보유 여부를 정확히 반환한다", () => {
    expect(hasCard(25)).toBe(false);
    awardCard(25, () => 0);
    expect(hasCard(25)).toBe(true);
  });

  it("localStorage 접근이 실패해도 예외를 던지지 않고 등급을 반환한다", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => awardCard(25, () => 0)).not.toThrow();
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/cardCollection.test.js`
Expected: FAIL — `Failed to resolve import "./cardCollection"`

- [ ] **Step 3: 구현**

`src/utils/cardCollection.js`:

```js
// 퀴즈 정답으로 얻는 포켓몬 카드 수집 시스템. myPokemon.js(진화 시스템)와는
// 완전히 별개의 localStorage 레코드로 관리하며, 서로 참조하지 않는다.

const KEY = "pokemonCards.v1";

export const GRADES = ["common", "uncommon", "rare", "legendary"];

export const GRADE_LABEL_KO = {
  common: "일반",
  uncommon: "보통",
  rare: "레어",
  legendary: "초희귀",
};

// src/index.css에 정의된 --card-grade-* 변수를 가리킨다.
export const GRADE_COLOR_VAR = {
  common: "var(--card-grade-common)",
  uncommon: "var(--card-grade-uncommon)",
  rare: "var(--card-grade-rare)",
  legendary: "var(--card-grade-legendary)",
};

// 등급별 누적 확률: 일반 50% / 보통 30% / 레어 15% / 초희귀 5%.
const GRADE_WEIGHTS = [
  { grade: "common", upTo: 50 },
  { grade: "uncommon", upTo: 80 },
  { grade: "rare", upTo: 95 },
  { grade: "legendary", upTo: 100 },
];

export function rollGrade(random = Math.random) {
  const roll = random() * 100;
  const match = GRADE_WEIGHTS.find((g) => roll < g.upTo);
  return (match || GRADE_WEIGHTS[GRADE_WEIGHTS.length - 1]).grade;
}

function readCards() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCards(cards) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }
  return cards;
}

export function getCards() {
  return readCards();
}

export function hasCard(pokemonId) {
  return Boolean(readCards()[pokemonId]);
}

export function awardCard(pokemonId, random = Math.random) {
  const cards = readCards();
  const existing = cards[pokemonId];
  if (existing) {
    return { isNew: false, grade: existing.grade };
  }

  const grade = rollGrade(random);
  writeCards({
    ...cards,
    [pokemonId]: { grade, earnedAt: new Date().toISOString() },
  });
  return { isNew: true, grade };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/cardCollection.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/cardCollection.js src/utils/cardCollection.test.js
git commit -m "feat: add card collection grade rolling and award logic"
```

---

### Task 2: 카드 등급 CSS 변수 + 플립/반짝임 애니메이션

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: CSS 커스텀 프로퍼티 `--card-grade-common`, `--card-grade-uncommon`, `--card-grade-rare`, `--card-grade-legendary` (라이트/다크 각각), 클래스 `.card-toast-legendary`, `.card-flip-outer`, `.card-flip-inner`, `.card-flip-inner.is-flipped`, `.card-flip-face`, `.card-flip-back`. Task 3(CardToast)과 Task 5(CardCollection 페이지)가 그대로 가져다 쓴다.

테스트 없음 — 이 프로젝트는 CSS 파일에 대한 테스트를 두지 않는다(기존 관례).

- [ ] **Step 1: 라이트(기본) 카드 등급 변수 추가**

`src/index.css:11-12`(`--color-danger`/`--color-success` 다음)을 다음으로 교체:

```css
  --color-danger: #e3350d; /* poke-ball red */
  --color-success: #22a559;

  /* 카드 수집 등급 */
  --card-grade-common: #b9b9c2;
  --card-grade-uncommon: #2f9e44;
  --card-grade-rare: #3b82f6;
  --card-grade-legendary: #c99a2e;
```

- [ ] **Step 2: 다크모드(`@media prefers-color-scheme`) 변수 추가**

`src/index.css:64-65`(`--color-danger`/`--color-success`, 다크 미디어쿼리 블록 내부) 다음으로 교체:

```css
    --color-danger: #ff6b52;
    --color-success: #3ecb7e;

    --card-grade-common: #7a7a86;
    --card-grade-uncommon: #4ade80;
    --card-grade-rare: #7ea1e0;
    --card-grade-legendary: #f2c31a;
```

- [ ] **Step 3: `[data-theme="dark"]` 변수 추가**

`src/index.css:85-86`을 다음으로 교체:

```css
  --color-danger: #ff6b52;
  --color-success: #3ecb7e;
  --card-grade-common: #7a7a86;
  --card-grade-uncommon: #4ade80;
  --card-grade-rare: #7ea1e0;
  --card-grade-legendary: #f2c31a;
```

- [ ] **Step 4: `[data-theme="light"]` 변수 추가**

`src/index.css:103-104`을 다음으로 교체:

```css
  --color-danger: #e3350d;
  --color-success: #22a559;
  --card-grade-common: #b9b9c2;
  --card-grade-uncommon: #2f9e44;
  --card-grade-rare: #3b82f6;
  --card-grade-legendary: #c99a2e;
```

- [ ] **Step 5: 플립 + 반짝임 애니메이션 추가**

파일 맨 끝(`.evolution-shimmer-ring` 애니메이션 블록 다음)에 추가:

```css

@keyframes card-glow {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(201, 154, 46, 0);
  }
  50% {
    box-shadow: 0 0 16px 4px color-mix(in srgb, var(--card-grade-legendary) 55%, transparent);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .card-toast-legendary {
    animation: card-glow 1.2s ease-in-out infinite;
  }
}

.card-flip-outer {
  display: block;
  position: relative;
  width: 100%;
  perspective: 1000px;
}

.card-flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 480ms;
  transform-style: preserve-3d;
}

.card-flip-inner.is-flipped {
  transform: rotateY(180deg);
}

.card-flip-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-lg);
}

.card-flip-back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .card-flip-inner {
    transition: none;
  }
}
```

- [ ] **Step 6: 린트 + 커밋**

Run: `npm run lint`
Expected: 에러 없음

```bash
git add src/index.css
git commit -m "feat: add card grade color tokens and flip/glow animations"
```

---

### Task 3: `CardToast.jsx` — 카드 획득 토스트

**Files:**
- Create: `src/components/CardToast.jsx`
- Test: `src/components/CardToast.test.jsx`

**Interfaces:**
- Consumes: `GRADE_LABEL_KO`, `GRADE_COLOR_VAR` (Task 1), `.card-toast-legendary` CSS 클래스 (Task 2).
- Produces: `<CardToast result={{isNew, grade}|null} pokemonName={string} />` — `EvolutionToast`와 나란히 쓰인다.

`EvolutionToast.test.jsx`의 렌더 분기 테스트 패턴을 따른다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/CardToast.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CardToast from "./CardToast";

describe("CardToast", () => {
  it("isNew:true면 등급과 포켓몬 이름이 함께 렌더된다", () => {
    render(<CardToast result={{ isNew: true, grade: "rare" }} pokemonName="피카츄" />);
    expect(screen.getByText(/레어 카드 획득!/)).toBeInTheDocument();
    expect(screen.getByText(/피카츄/)).toBeInTheDocument();
  });

  it("초희귀 등급이면 반짝임 클래스가 붙는다", () => {
    render(<CardToast result={{ isNew: true, grade: "legendary" }} pokemonName="뮤츠" />);
    expect(screen.getByText(/초희귀 카드 획득!/).closest("div")).toHaveClass(
      "card-toast-legendary"
    );
  });

  it("isNew:false면 아무 것도 렌더하지 않는다(이미 보유 중인 카드)", () => {
    const { container } = render(
      <CardToast result={{ isNew: false, grade: "common" }} pokemonName="이상해씨" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("result가 null이면 아무 것도 렌더하지 않는다", () => {
    const { container } = render(<CardToast result={null} pokemonName="이상해씨" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/CardToast.test.jsx`
Expected: FAIL — `Failed to resolve import "./CardToast"`

- [ ] **Step 3: 구현**

`src/components/CardToast.jsx`:

```jsx
import { GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";

export default function CardToast({ result, pokemonName }) {
  if (!result?.isNew) return null;

  const color = GRADE_COLOR_VAR[result.grade] || GRADE_COLOR_VAR.common;

  return (
    <div
      className={result.grade === "legendary" ? "card-toast-legendary" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: "var(--radius-pill)",
        border: `1.5px solid ${color}`,
        background: `color-mix(in srgb, ${color} 18%, var(--color-surface))`,
        color: "var(--color-text)",
        fontWeight: 700,
        fontSize: 14,
        margin: "var(--space-2) 0",
      }}
    >
      {GRADE_LABEL_KO[result.grade]} 카드 획득! {pokemonName}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/CardToast.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/CardToast.jsx src/components/CardToast.test.jsx
git commit -m "feat: add card acquisition toast"
```

---

### Task 4: 5개 퀴즈 페이지에 카드 지급 연결

**Files:**
- Modify: `src/pages/CryQuiz.jsx`
- Modify: `src/pages/SilhouetteQuiz.jsx`
- Modify: `src/pages/ZoomQuiz.jsx`
- Modify: `src/pages/TypeQuiz.jsx`
- Modify: `src/pages/EvolutionQuiz.jsx`

**Interfaces:**
- Consumes: `awardCard` (Task 1), `CardToast` (Task 3).

각 파일에 공통으로: (1) import 2개 추가, (2) `cardResult` state 추가, (3) 정답 처리 지점에 `setCardResult(awardCard(...))` 추가, (4) `<EvolutionToast .../>` 옆에 `<CardToast .../>` 추가. `EvolutionQuiz.jsx`는 단일 정답 포켓몬이 없는 순서 맞추기 퀴즈라, 체인의 첫 단계 포켓몬(`chain[0]`, 이미 `start` 변수로 존재)을 카드 지급 대상으로 삼는다.

이 태스크는 새 유닛을 만들지 않고 기존 컴포넌트를 연결만 하므로 새 단위 테스트 대신, 각 파일 수정 후 **해당 퀴즈의 기존 테스트가 있다면 그대로 통과하는지**와 **마지막에 전체 스위트 + 수동 확인**으로 검증한다(퀴즈 페이지 자체엔 기존에도 단위 테스트가 없다 — 관례상 페이지는 스모크 테스트만 두거나 아예 없음).

- [ ] **Step 1: CryQuiz.jsx 수정**

`src/pages/CryQuiz.jsx:14-15` 부근(`import { useAwardPoints } from "../hooks/useMyPokemonPoints";` 다음 줄)에 추가:

```jsx
import { awardCard } from "../utils/cardCollection";
import CardToast from "../components/CardToast";
```

`useAwardPoints()`/`evolutionResult` state를 선언하는 줄(약 34~35번째 줄) 근처에 추가:

```jsx
  const [cardResult, setCardResult] = useState(null);
```

`submitChoice`(124번째 줄)와 `submitTyped`(136번째 줄) 안의 `setEvolutionResult(await awardPoints(earned));` 바로 다음 줄에 각각 추가:

```jsx
      setCardResult(awardCard(answer.id));
```

`<EvolutionToast result={evolutionResult} />`(278번째 줄) 다음 줄에 추가:

```jsx
            <CardToast result={cardResult} pokemonName={answer.nameKo} />
```

- [ ] **Step 2: SilhouetteQuiz.jsx 수정**

같은 패턴으로: import 2개 추가(기존 `import EvolutionToast` 줄 근처), `cardResult` state 추가, `submitChoice`(115번째 줄 부근)와 `submitTyped`(127번째 줄 부근)의 `setEvolutionResult(await awardPoints(earned));` 다음에 `setCardResult(awardCard(answer.id));` 추가, `<EvolutionToast result={evolutionResult} />`(240번째 줄) 다음에 `<CardToast result={cardResult} pokemonName={answer.nameKo} />` 추가.

- [ ] **Step 3: ZoomQuiz.jsx 수정**

같은 패턴으로: import 2개 추가, `cardResult` state 추가, `submitChoice`(118~126번째 줄)와 `submitTyped`(130~140번째 줄)의 `setEvolutionResult(await awardPoints(earned));` 다음에 `setCardResult(awardCard(answer.id));` 추가, `<EvolutionToast result={evolutionResult} />`(234번째 줄) 다음에 `<CardToast result={cardResult} pokemonName={answer.nameKo} />` 추가.

- [ ] **Step 4: TypeQuiz.jsx 수정**

`src/pages/TypeQuiz.jsx:5`(`import EvolutionToast from "../components/EvolutionToast";`) 다음 줄에 추가:

```jsx
import CardToast from "../components/CardToast";
```

`src/pages/TypeQuiz.jsx:14`(`import { useAwardPoints } from "../hooks/useMyPokemonPoints";`) 다음 줄에 추가:

```jsx
import { awardCard } from "../utils/cardCollection";
```

`const [evolutionResult, setEvolutionResult] = useState(null);`(34번째 줄) 다음 줄에 추가:

```jsx
  const [cardResult, setCardResult] = useState(null);
```

`submitChoice`(105~113번째 줄)에서 `setEvolutionResult(await awardPoints(FLAT_SCORE));`(112번째 줄) 다음 줄에 추가 — 이 퀴즈는 `answer`가 아니라 `target`이 정답 포켓몬이다:

```jsx
      setCardResult(awardCard(target.id));
```

`<EvolutionToast result={evolutionResult} />`(162번째 줄) 다음 줄에 추가:

```jsx
            <CardToast result={cardResult} pokemonName={target.nameKo} />
```

- [ ] **Step 5: EvolutionQuiz.jsx 수정**

`src/pages/EvolutionQuiz.jsx:14`(`import EvolutionToast from "../components/EvolutionToast";`) 다음 줄에 추가:

```jsx
import CardToast from "../components/CardToast";
```

`src/pages/EvolutionQuiz.jsx:13`(`import { useAwardPoints } from "../hooks/useMyPokemonPoints";`) 다음 줄에 추가:

```jsx
import { awardCard } from "../utils/cardCollection";
```

`const [evolutionResult, setEvolutionResult] = useState(null);`(41번째 줄) 다음 줄에 추가:

```jsx
  const [cardResult, setCardResult] = useState(null);
```

이 퀴즈는 정답이 여러 단계 체인이라 단일 "정답 포켓몬"이 없다 — 카드는 체인의 첫 단계(`start = chain[0]`, 110번째 줄에 이미 선언됨)에 지급한다. `handleTap` 안, `setEvolutionResult(await awardPoints(earned));`(124번째 줄) 다음 줄에 추가:

```jsx
        setCardResult(awardCard(start.id));
```

`<EvolutionToast result={evolutionResult} />`(251번째 줄) 다음 줄에 추가:

```jsx
            <CardToast result={cardResult} pokemonName={start.nameKo} />
```

- [ ] **Step 6: 전체 테스트 스위트 + 린트**

Run: `npm test && npm run lint`
Expected: 모든 테스트 PASS, 린트 에러 없음

- [ ] **Step 7: 개발 서버에서 실제 확인**

Run: `npm run dev`, 5개 퀴즈(`/quiz/cry`, `/quiz/silhouette`, `/quiz/zoom`, `/quiz/type`, `/quiz/evolution`) 각각 한 문제씩 정답을 맞혀본다.
Expected: 각 퀴즈에서 정답 시 "진화 포인트" 토스트와 별개로 카드 획득 토스트(등급 표시)가 함께 뜬다. 오답 시엔 카드 토스트가 뜨지 않는다. 같은 포켓몬을 다시 맞혀도(세션을 여러 번 돌려서) 카드가 이미 있으면 토스트가 뜨지 않는다(재추첨 안 됨을 육안 확인하려면 `/collection`이 필요하지만 Task 5 이전이라 콘솔에서 `localStorage.getItem("pokemonCards.v1")`로 대신 확인 가능).

- [ ] **Step 8: Commit**

```bash
git add src/pages/CryQuiz.jsx src/pages/SilhouetteQuiz.jsx src/pages/ZoomQuiz.jsx src/pages/TypeQuiz.jsx src/pages/EvolutionQuiz.jsx
git commit -m "feat: award pokemon card on correct quiz answers"
```

---

### Task 5: `/collection` 카드 수집첩 페이지

**Files:**
- Create: `src/pages/CardCollection.jsx`
- Create: `src/pages/CardCollection.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/MoreMenu.jsx`
- Modify: `src/pages/MoreMenu.test.jsx`

**Interfaces:**
- Consumes: `getCards`, `GRADE_LABEL_KO`, `GRADE_COLOR_VAR` (Task 1), `.card-flip-*` CSS 클래스(Task 2), `TypeBadge`(기존).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/CardCollection.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CardCollection from "./CardCollection";
import { loadPokemonData } from "../utils/pokemonData";
import { awardCard } from "../utils/cardCollection";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const bulbasaur = {
  id: 1,
  nameKo: "이상해씨",
  types: ["grass", "poison"],
  abilities: ["overgrow"],
  descriptionKo: "설명입니다.",
  sprite: "https://example.com/1.png",
};
const pikachu = {
  id: 25,
  nameKo: "피카츄",
  types: ["electric"],
  abilities: ["static"],
  descriptionKo: "전기를 모은다.",
  sprite: "https://example.com/25.png",
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("CardCollection", () => {
  it("보유한 카드는 이름과 등급이 보이고, 미보유 카드는 물음표로 가려진다", async () => {
    awardCard(1, () => 0); // 이상해씨만 획득(common)
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    expect(await screen.findByText("이상해씨")).toBeInTheDocument();
    expect(screen.getByText("일반")).toBeInTheDocument();
    expect(screen.getByText("???")).toBeInTheDocument();
    expect(screen.queryByText("피카츄")).not.toBeInTheDocument();
  });

  it("진행률을 보유수/전체수로 표시한다", async () => {
    awardCard(1, () => 0);
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    expect(await screen.findByText("1 / 2장 수집")).toBeInTheDocument();
  });

  it("보유 카드를 클릭하면 뒷면(설명)이 DOM에 나타난다", async () => {
    awardCard(1, () => 0);
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    const card = await screen.findByRole("button", { name: "이상해씨 카드" });
    fireEvent.click(card);
    expect(screen.getByText("설명입니다.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/pages/CardCollection.test.jsx`
Expected: FAIL — `Failed to resolve import "./CardCollection"`

- [ ] **Step 3: 구현**

`src/pages/CardCollection.jsx`:

```jsx
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import TypeBadge from "../components/TypeBadge";
import { loadPokemonData } from "../utils/pokemonData";
import { getCards, GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";

function formatAbility(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CardCollection() {
  const [all, setAll] = useState([]);
  const [cards, setCards] = useState({});
  const [flippedId, setFlippedId] = useState(null);

  useEffect(() => {
    loadPokemonData().then(setAll);
    setCards(getCards());
  }, []);

  function toggleFlip(id) {
    if (!cards[id]) return;
    setFlippedId((cur) => (cur === id ? null : id));
  }

  const ownedCount = Object.keys(cards).length;

  return (
    <AppShell title="카드 수집" backTo="/more">
      <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        {ownedCount} / {all.length}장 수집
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginTop: "var(--space-3)",
        }}
      >
        {all.map((p) => {
          const card = cards[p.id];
          const isFlipped = flippedId === p.id;
          const color = card ? GRADE_COLOR_VAR[card.grade] : "var(--color-border)";

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleFlip(p.id)}
              disabled={!card}
              className="card-flip-outer press"
              aria-label={card ? `${p.nameKo} 카드` : "미보유 카드"}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                height: 190,
                cursor: card ? "pointer" : "default",
              }}
            >
              <div className={`card-flip-inner${isFlipped ? " is-flipped" : ""}`}>
                <div
                  className="card-flip-face"
                  style={{
                    background: "var(--color-surface)",
                    boxShadow: "var(--shadow-card)",
                    border: `2px solid ${color}`,
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={p.sprite}
                    alt={card ? p.nameKo : ""}
                    style={{
                      width: 72,
                      height: 72,
                      filter: card ? "none" : "brightness(0)",
                      opacity: card ? 1 : 0.35,
                    }}
                  />
                  {card ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>
                        {p.nameKo}
                      </div>
                      <span
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          background: `color-mix(in srgb, ${color} 25%, var(--color-surface))`,
                          color: "var(--color-text)",
                        }}
                      >
                        {GRADE_LABEL_KO[card.grade]}
                      </span>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
                      ???
                    </div>
                  )}
                </div>

                {card && (
                  <div
                    className="card-flip-face card-flip-back"
                    style={{
                      background: "var(--color-surface)",
                      boxShadow: "var(--shadow-card)",
                      border: `2px solid ${color}`,
                      padding: "var(--space-3)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 6,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nameKo}</div>
                    <div>
                      {p.types.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      특성: {p.abilities.map(formatAbility).join(", ")}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                      {p.descriptionKo}
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/pages/CardCollection.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 라우트 등록**

`src/App.jsx`에 import 추가:

```jsx
import CardCollection from "./pages/CardCollection";
```

`/daily` 라우트 다음 줄에 추가:

```jsx
      <Route path="/collection" element={<CardCollection />} />
```

- [ ] **Step 6: MoreMenu에서 카드 수집 활성화**

`src/pages/MoreMenu.jsx`의 `MODES` 배열에서 `collection` 항목의 `ready: false`를 `ready: true`로 변경.

`src/pages/MoreMenu.test.jsx`의 두 번째 테스트("아직 구현 안 된 기능은...")에서 대상을 `/카드 수집/`에서 `/포켓몬 키우기/`로 변경(카드 수집은 이제 구현됐으므로):

```jsx
  it("아직 구현 안 된 기능은 '준비중'으로 표시되고 링크가 비활성화된다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /포켓몬 키우기/ });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("준비중").length).toBeGreaterThan(0);
  });
```

- [ ] **Step 7: 관련 테스트 통과 확인**

Run: `npx vitest run src/pages/MoreMenu.test.jsx src/pages/CardCollection.test.jsx`
Expected: PASS

- [ ] **Step 8: 개발 서버에서 실제 확인**

Run: `npm run dev`, `/more` → "카드 수집" 클릭 → `/collection`에서 앞서 퀴즈로 얻은 카드가 등급 뱃지와 함께 보이는지, 클릭 시 뒤집혀서 타입/특성/설명이 보이는지, 미보유 포켓몬은 실루엣+물음표로만 보이는지 확인.

- [ ] **Step 9: 전체 테스트 스위트**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 10: Commit**

```bash
git add src/pages/CardCollection.jsx src/pages/CardCollection.test.jsx src/App.jsx src/pages/MoreMenu.jsx src/pages/MoreMenu.test.jsx
git commit -m "feat: add card collection page with flip reveal"
```
