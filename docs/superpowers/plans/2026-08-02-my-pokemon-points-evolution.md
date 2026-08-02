# 내 포켓몬 진화 시스템 — Phase 1 슬라이스 2 (포인트 적립 + 진화 트리거/연출 + 졸업 흐름 + 진화 순서 퀴즈) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire quiz-answer points into the existing `pokemonMine.v1` record, trigger single-branch and multi-branch evolution at the 200-point threshold with remainder carry-over, play the evolution celebration (including branch-choice picker) on `Home.jsx`, add the final-evolution graduation flow to `MyPokemon.jsx`, and ship the new tap-to-order `EvolutionQuiz` mode wired into `QuizHub`.

**Architecture:** All novel stateful logic lives in `src/utils/myPokemon.js` (pure functions over the localStorage record, fully unit-testable, no React). A thin `useAwardPoints()` hook wraps `addPoints` so the three existing quiz pages (and the new one) share one call site instead of tripling logic. `Home.jsx` owns all celebration UI (reveal + branch picker) because the spec is explicit that evolution never plays out mid-quiz. `MyPokemon.jsx` owns the graduation buttons. A new `src/utils/evolutionQuizChain.js` holds the pure, unit-tested "pick a 2–3 stage chain" logic consumed by the new `EvolutionQuiz.jsx` page.

**Tech Stack:** React 19 + react-router-dom v7 + Vite, Vitest + @testing-library/react (jsdom environment).

## Global Constraints

- `EVOLUTION_THRESHOLD` is a single named export from `src/utils/myPokemon.js` (`= 200`) — no magic `200`/`200`-derived literals anywhere else.
- Evolution never triggers or animates inside a quiz page. Quiz pages only ever call `addPoints` fire-and-forget; all celebration (single-branch reveal + branch-choice picker) happens on `Home.jsx` on a later visit, driven entirely by fields persisted in the `pokemonMine.v1` record (`pendingEvolution`, `pendingBranchChoices`) — never by in-memory hook state, since the record must survive a closed tab.
- Overflow points on a threshold crossing are **carried over**, never discarded (e.g. 190 + 30 = 220 → new cycle starts at 20).
- `lifetimePoints` and `collection` **persist across `graduateAndRestart()`** — verified by round-tripping through `chooseStarter()` again afterward.
- All new localStorage-touching code follows the existing defensive try/catch pattern (`src/utils/myPokemon.js` current contents, `getGen1OnlyPref`/`setGen1OnlyPref` in `src/utils/pokemonData.js:100-114`) — corrupted/missing data must never throw.
- Respect `prefers-reduced-motion` for any new CSS animation, exactly like the existing `.skeleton` pulse in `src/index.css:196-216`.
- Do NOT implement Phase 2/Phase 3 spec items (nickname re-editing, share cards, petting, dex stamps, badges, daily quiz, parent summary).
- Do NOT add point accrual for dex-entry views — points come only from the four quizzes' correct answers.

---

## File Structure

**New files:**
- `src/hooks/useMyPokemonPoints.js` — `useAwardPoints()` hook, single shared call site for quiz pages.
- `src/utils/evolutionQuizChain.js` — pure functions: `getEvolutionQuizCandidates`, `buildEvolutionChain`, `pickEvolutionQuizChain`.
- `src/utils/evolutionQuizChain.test.js` — Vitest unit tests for the above.
- `src/pages/EvolutionQuiz.jsx` — new quiz mode at `/quiz/evolution`.

**Modified files:**
- `src/utils/myPokemon.js` — adds `EVOLUTION_THRESHOLD`, `addPoints`, `resolveBranchEvolution`, `clearPendingEvolution`, `graduateAndRestart`, `resetMyPokemon`; changes `chooseStarter` to preserve `lifetimePoints`/`collection` across a graduation/reset cycle and to initialize the new `pendingBranchChoices: null` field.
- `src/utils/myPokemon.test.js` — updates the one existing `toEqual` assertion (new field) + adds tests for every new function.
- `src/pages/SilhouetteQuiz.jsx`, `src/pages/ChosungQuiz.jsx`, `src/pages/CryQuiz.jsx` — call `useAwardPoints()` on a correct answer.
- `src/index.css` — adds `.evolution-reveal-new` / `.evolution-shimmer-ring` keyframes, reduced-motion gated.
- `src/pages/Home.jsx` — evolution celebration (branch picker + reveal) + progress bar for the normal state.
- `src/pages/MyPokemon.jsx` — final-evolution graduation buttons.
- `src/pages/QuizHub.jsx` — flips `evolution` mode's `ready` to `true`.
- `src/pages/QuizHub.test.jsx` — adds an assertion that the evolution-quiz link is now active.
- `src/App.jsx` — adds the `/quiz/evolution` route.

**Untouched but load-bearing (read, not modified):** `src/utils/pokemonData.js` (`loadPokemonData`, `TYPE_COLOR`, `TYPE_LABEL_KO`, `applyGen1OnlyFilter`), `src/components/AppShell.jsx`, `src/styles/tokens.js` (`primaryBtn`, `hintBtn`), `src/components/Icons.jsx`.

---

### Task 1: Extend `src/utils/myPokemon.js` with point accrual, evolution, and graduation

**Files:**
- Modify: `src/utils/myPokemon.js`
- Modify: `src/utils/myPokemon.test.js`

**Interfaces:**
- Produces: `EVOLUTION_THRESHOLD` (= 200), `addPoints(points, currentStagePokemon): {evolved, branchChoicePending, newStageId, pointsSinceLastEvolution} | null`, `resolveBranchEvolution(chosenId): Record | null`, `clearPendingEvolution(): Record | null`, `graduateAndRestart(): Record | null`, `resetMyPokemon(): Record | null`. Modifies `chooseStarter` to preserve `lifetimePoints`/`collection` via an internal `readRawRecord()` helper and to include `pendingBranchChoices: null` in the initial record.
- Consumed by: Task 2 (`useMyPokemonPoints.js`), Task 4 (`Home.jsx`), Task 5 (`MyPokemon.jsx`).

**Design decisions locked in here (see also Self-Review §Judgment Calls):**
- `addPoints(points, currentStagePokemon)` — `currentStagePokemon` is the full `public/data/pokemon.json` entry for `record.currentStageId` (has `.evolvesTo`); the module never fetches the dataset itself.
- Return shape distinguishes three outcomes unambiguously: `evolved: true` (single-branch auto-advance, `currentStageId` already updated), `branchChoicePending: true` (threshold crossed but `evolvesTo.length > 1`, `currentStageId` untouched, options saved to the persisted `pendingBranchChoices` field), or neither (no crossing). `evolved` and `branchChoicePending` are never both `true`.
- `pendingBranchChoices: Array<{id, minLevel}> | null` is a **persisted** field in the `pokemonMine.v1` record (not returned-value-only), because the branch-choice UI is shown on a later Home visit, possibly after the tab was closed.
- `graduateAndRestart()` resets `starterId`/`currentStageId` to `null` so `getMyPokemon()`'s existing validity check (`typeof parsed.currentStageId !== "number"`) makes it return `null` again — no change needed to `getMyPokemon()` itself.
- `chooseStarter()` must not blindly reset `lifetimePoints`/`collection` to `0`/`[]` anymore (that would violate the spec's persistence requirement across "새 친구 고르기"). It now reads whatever raw JSON is currently stored (even if it fails `getMyPokemon()`'s validity check, e.g. right after graduation) via a new internal `readRawRecord()` and carries those two fields forward, defaulting to `0`/`[]` only when nothing valid is present (true first-time use).
- **`resetMyPokemon()` vs. `graduateAndRestart()` (new requirement, added mid-plan):** the user asked for a "다시 선택" (re-choose) escape hatch available at any time, not only after reaching the final evolution. This is deliberately a *separate* function from `graduateAndRestart()`, not a relaxed precondition on the same one — `collection` is documented (spec + this plan's own comments) as "완전 진화 후 졸업시킨" pokemon, a badge-of-honor gallery of *completed* raises. Letting an unfinished pokemon slip into that same list via a generic reset would quietly dilute that meaning. `resetMyPokemon()` therefore clears the current selection back to the "no pokemon chosen" state (identical field reset to `graduateAndRestart`: `starterId`/`nickname`/`currentStageId`/`history`/`pointsSinceLastEvolution`/`pendingEvolution`/`pendingBranchChoices` all cleared) while preserving `lifetimePoints` (points earned reflect quiz skill, not which pokemon was being raised) — but it does **not** push the abandoned `currentStageId` onto `collection`. Both functions end in the same "getMyPokemon() → null" state and both existing callers (`MyPokemon.jsx`'s graduation flow, and the new always-available "다른 포켓몬 고르기" control) reuse it identically going forward.

- [ ] **Step 1: Update the test file with new fixtures and failing tests**

Replace the full contents of `src/utils/myPokemon.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import {
  getMyPokemon,
  chooseStarter,
  getStarterCandidates,
  addPoints,
  resolveBranchEvolution,
  clearPendingEvolution,
  graduateAndRestart,
  resetMyPokemon,
  EVOLUTION_THRESHOLD,
} from "./myPokemon";

const bulbasaur = {
  id: 1,
  nameKo: "이상해씨",
  evolutionStage: 1,
  evolvesTo: [{ id: 2, minLevel: 16 }],
};

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  evolutionStage: 1,
  evolvesTo: [{ id: 26, minLevel: null }],
};

const mewtwo = {
  id: 150,
  nameKo: "뮤츠",
  evolutionStage: 1,
  evolvesTo: [],
};

const ivysaur = {
  id: 2,
  nameKo: "이상해풀",
  evolutionStage: 2,
  evolvesTo: [{ id: 3, minLevel: 32 }],
};

const venusaur = {
  id: 3,
  nameKo: "이상해꽃",
  evolutionStage: 3,
  evolvesTo: [],
};

const eevee = {
  id: 133,
  nameKo: "이브이",
  evolutionStage: 1,
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
};

beforeEach(() => {
  localStorage.clear();
});

describe("getMyPokemon", () => {
  it("저장된 값이 없으면 null을 반환한다", () => {
    expect(getMyPokemon()).toBe(null);
  });

  it("저장된 JSON이 손상되었으면 null을 반환한다", () => {
    localStorage.setItem("pokemonMine.v1", "{ not valid json");
    expect(getMyPokemon()).toBe(null);
  });

  it("저장된 값이 필수 필드가 없는 객체면 null을 반환한다", () => {
    localStorage.setItem("pokemonMine.v1", JSON.stringify({ nickname: "몽몽이" }));
    expect(getMyPokemon()).toBe(null);
  });

  it("chooseStarter로 저장한 값을 그대로 읽어온다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    expect(getMyPokemon()).toEqual({
      starterId: 1,
      nickname: "몽몽이",
      currentStageId: 1,
      history: [1],
      pointsSinceLastEvolution: 0,
      lifetimePoints: 0,
      pendingEvolution: false,
      pendingBranchChoices: null,
      collection: [],
    });
  });
});

describe("chooseStarter", () => {
  it("닉네임이 공백이면 포켓몬의 nameKo를 기본값으로 사용한다", () => {
    const record = chooseStarter(bulbasaur, "   ");
    expect(record.nickname).toBe("이상해씨");
  });

  it("닉네임 앞뒤 공백은 제거한다", () => {
    const record = chooseStarter(bulbasaur, "  몽몽이  ");
    expect(record.nickname).toBe("몽몽이");
  });

  it("처음 시작하면 lifetimePoints/collection은 0/빈 배열이다", () => {
    const record = chooseStarter(bulbasaur, "몽몽이");
    expect(record.lifetimePoints).toBe(0);
    expect(record.collection).toEqual([]);
  });

  it("졸업(graduateAndRestart) 이후 다시 고르면 lifetimePoints/collection을 이어받는다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    graduateAndRestart();

    const record = chooseStarter(pikachu, "라이차");
    expect(record.lifetimePoints).toBe(50);
    expect(record.collection).toEqual([1]);
  });
});

describe("getStarterCandidates", () => {
  it("evolutionStage가 1이고 evolvesTo가 있는 포켓몬만 후보로 반환한다", () => {
    const all = [bulbasaur, pikachu, mewtwo, ivysaur];
    const candidates = getStarterCandidates(all);
    expect(candidates.map((p) => p.id)).toEqual([1, 25]);
  });
});

describe("addPoints", () => {
  it("내 포켓몬이 없으면 아무 것도 하지 않고 null을 반환한다", () => {
    expect(addPoints(30, bulbasaur)).toBe(null);
    expect(getMyPokemon()).toBe(null);
  });

  it("임계값 미만이면 진화 없이 포인트만 누적한다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    const result = addPoints(30, bulbasaur);

    expect(result).toEqual({
      evolved: false,
      branchChoicePending: false,
      newStageId: null,
      pointsSinceLastEvolution: 30,
    });
    const record = getMyPokemon();
    expect(record.pointsSinceLastEvolution).toBe(30);
    expect(record.lifetimePoints).toBe(30);
    expect(record.currentStageId).toBe(1);
  });

  it(`${EVOLUTION_THRESHOLD}점을 넘기면 초과분을 이월하고 단일 분기면 자동으로 진화한다`, () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(190, bulbasaur);
    const result = addPoints(30, bulbasaur);

    expect(result).toEqual({
      evolved: true,
      branchChoicePending: false,
      newStageId: 2,
      pointsSinceLastEvolution: 20,
    });
    const record = getMyPokemon();
    expect(record.currentStageId).toBe(2);
    expect(record.history).toEqual([1, 2]);
    expect(record.pointsSinceLastEvolution).toBe(20);
    expect(record.pendingEvolution).toBe(true);
    expect(record.pendingBranchChoices).toBe(null);
  });

  it("분기 진화(이브이)는 임계값을 넘겨도 자동으로 고르지 않고 선택 대기 상태로 남는다", () => {
    chooseStarter(eevee, "이브이");
    const result = addPoints(200, eevee);

    expect(result).toEqual({
      evolved: false,
      branchChoicePending: true,
      newStageId: null,
      pointsSinceLastEvolution: 0,
    });
    const record = getMyPokemon();
    expect(record.currentStageId).toBe(133); // 아직 안 바뀜
    expect(record.history).toEqual([133]);
    expect(record.pendingEvolution).toBe(true);
    expect(record.pendingBranchChoices).toEqual(eevee.evolvesTo);
  });

  it("최종 진화(evolvesTo 없음)는 임계값을 넘겨도 진화하지 않고 포인트만 쌓인다", () => {
    chooseStarter(venusaur, "이상해꽃");
    const result = addPoints(250, venusaur);

    expect(result).toEqual({
      evolved: false,
      branchChoicePending: false,
      newStageId: null,
      pointsSinceLastEvolution: 250,
    });
    const record = getMyPokemon();
    expect(record.currentStageId).toBe(3);
    expect(record.pendingEvolution).toBe(false);
  });
});

describe("resolveBranchEvolution", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(resolveBranchEvolution(134)).toBe(null);
  });

  it("분기 선택이 필요한 상태가 아니면 null을 반환하고 아무 것도 바꾸지 않는다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    expect(resolveBranchEvolution(2)).toBe(null);
    expect(getMyPokemon().currentStageId).toBe(1);
  });

  it("제시되지 않은 분기 id를 고르면 null을 반환하고 아무 것도 바꾸지 않는다", () => {
    chooseStarter(eevee, "이브이");
    addPoints(200, eevee);
    expect(resolveBranchEvolution(999)).toBe(null);
    expect(getMyPokemon().currentStageId).toBe(133);
  });

  it("유효한 분기를 고르면 currentStageId/history를 갱신하고 pendingEvolution은 유지한다", () => {
    chooseStarter(eevee, "이브이");
    addPoints(200, eevee);
    const record = resolveBranchEvolution(134);

    expect(record.currentStageId).toBe(134);
    expect(record.history).toEqual([133, 134]);
    expect(record.pendingEvolution).toBe(true);
    expect(record.pendingBranchChoices).toBe(null);
  });
});

describe("clearPendingEvolution", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(clearPendingEvolution()).toBe(null);
  });

  it("pendingEvolution/pendingBranchChoices를 모두 내린다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(190, bulbasaur);
    addPoints(30, bulbasaur);
    expect(getMyPokemon().pendingEvolution).toBe(true);

    const record = clearPendingEvolution();
    expect(record.pendingEvolution).toBe(false);
    expect(record.pendingBranchChoices).toBe(null);
    expect(getMyPokemon().pendingEvolution).toBe(false);
  });
});

describe("graduateAndRestart", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(graduateAndRestart()).toBe(null);
  });

  it("현재 포켓몬을 collection에 추가하고 getMyPokemon()이 null을 반환하게 만든다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    graduateAndRestart();

    expect(getMyPokemon()).toBe(null);
  });

  it("lifetimePoints/collection은 보존한 채로 currentStageId 등만 초기화한다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    graduateAndRestart();

    // getMyPokemon()으로는 확인할 수 없으므로(currentStageId가 null이라 무효 취급),
    // 다시 chooseStarter를 호출해 이어받는지로 간접 확인한다.
    const record = chooseStarter(pikachu, "라이차");
    expect(record.lifetimePoints).toBe(50);
    expect(record.collection).toEqual([1]);
  });
});

describe("resetMyPokemon", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(resetMyPokemon()).toBe(null);
  });

  it("완전 진화 전이어도 getMyPokemon()이 null을 반환하게 만든다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    resetMyPokemon();

    expect(getMyPokemon()).toBe(null);
  });

  it("graduateAndRestart와 달리 collection에 추가하지 않는다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    resetMyPokemon();

    const record = chooseStarter(pikachu, "라이차");
    expect(record.collection).toEqual([]); // 이상해씨가 들어가 있지 않아야 함
  });

  it("lifetimePoints는 보존한다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    resetMyPokemon();

    const record = chooseStarter(pikachu, "라이차");
    expect(record.lifetimePoints).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/utils/myPokemon.test.js`
Expected: FAIL — `addPoints`/`resolveBranchEvolution`/`clearPendingEvolution`/`graduateAndRestart`/`EVOLUTION_THRESHOLD` are not exported yet; the updated `toEqual` in the first `getMyPokemon` test also fails (missing `pendingBranchChoices`).

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/utils/myPokemon.js`:

```js
// "내 포켓몬" 선택/현재 상태를 localStorage에 저장하는 모듈.
// pokemonData.js의 getGen1OnlyPref/setGen1OnlyPref와 동일하게, localStorage 접근
// 실패(시크릿 모드 등)나 저장된 값이 손상된 경우 모두 조용히 안전한 기본값으로 처리한다.
//
// 레코드 형태 (localStorage key: "pokemonMine.v1"):
// {
//   starterId: number|null,          // 처음 고른 포켓몬 id. "졸업" 직후에는 null.
//   nickname: string|null,
//   currentStageId: number|null,     // 지금 형태의 포켓몬 id. "졸업" 직후에는 null.
//   history: number[],               // 지금까지 거쳐온 진화 단계 id 배열
//   pointsSinceLastEvolution: number,
//   lifetimePoints: number,          // "졸업" 후에도 유지됨
//   pendingEvolution: boolean,       // 홈 화면에서 진화 연출을 재생해야 하는지
//   pendingBranchChoices: Array<{id:number, minLevel:number|null}>|null,
//     // 분기 진화(예: 이브이) 임계값은 넘겼지만 아직 어떤 모습으로 진화할지 아이가
//     // 고르지 않은 상태. null이면 선택할 분기가 없음(진화 없음, 또는 이미 해결됨).
//   collection: number[],            // 완전 진화 후 "졸업"시킨 이전 포켓몬 id 목록. "졸업" 후에도 유지됨.
// }

const KEY = "pokemonMine.v1";

// 다음 진화까지 필요한 누적 포인트 임계값. 튜닝 가능하도록 상수로 분리(스펙 명시 사항).
export const EVOLUTION_THRESHOLD = 200;

// localStorage에 저장된 원시 JSON을 필드 유효성 검사 없이 읽어온다.
// getMyPokemon()과 달리 currentStageId/starterId가 없어도(졸업 직후 등) null을
// 반환하지 않는다. chooseStarter가 "졸업" 이후에도 lifetimePoints/collection을
// 이어받기 위해 내부적으로만 사용한다.
function readRawRecord() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeRecord(record) {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }
  return record;
}

// 저장된 "내 포켓몬" 레코드를 반환한다.
// 저장된 값이 없거나, JSON 파싱에 실패하거나, 필수 필드가 없는 손상된 값이면(또는
// graduateAndRestart 직후처럼 currentStageId/starterId가 null이면) null.
export function getMyPokemon() {
  const parsed = readRawRecord();
  if (
    !parsed ||
    typeof parsed.currentStageId !== "number" ||
    typeof parsed.starterId !== "number"
  ) {
    return null;
  }
  return parsed;
}

// 스타터 포켓몬 선택 시 전체 레코드를 초기화해 저장한다.
// nickname이 빈 값(공백만 있어도)이면 포켓몬의 한국어 이름(nameKo)을 기본값으로 사용한다.
// 이전에 "졸업"한 기록이 있다면(레코드는 남아있지만 currentStageId가 null인 상태)
// lifetimePoints/collection은 이어받는다 — 스펙상 두 값은 여러 번의 "새 친구 고르기"를
// 거쳐도 초기화되지 않아야 하기 때문.
export function chooseStarter(pokemon, nickname) {
  const trimmed = (nickname || "").trim();
  const previous = readRawRecord();
  const preservedLifetimePoints =
    typeof previous?.lifetimePoints === "number" ? previous.lifetimePoints : 0;
  const preservedCollection = Array.isArray(previous?.collection)
    ? previous.collection
    : [];

  const record = {
    starterId: pokemon.id,
    nickname: trimmed || pokemon.nameKo,
    currentStageId: pokemon.id,
    history: [pokemon.id],
    pointsSinceLastEvolution: 0,
    lifetimePoints: preservedLifetimePoints,
    pendingEvolution: false,
    pendingBranchChoices: null,
    collection: preservedCollection,
  };

  return writeRecord(record);
}

// 스타터로 고를 수 있는 후보: 1단계이면서 진화 가능한(evolvesTo가 있는) 포켓몬.
// 전설/신화 포켓몬은 대부분 진화가 없어 이 조건만으로 자연히 제외된다.
export function getStarterCandidates(allPokemon) {
  return allPokemon.filter(
    (p) => p.evolutionStage === 1 && p.evolvesTo?.length > 0
  );
}

// 퀴즈 정답으로 얻은 포인트를 "내 포켓몬"에 적립한다.
// currentStagePokemon은 호출하는 쪽(퀴즈 화면 또는 useAwardPoints 훅)이
// public/data/pokemon.json 전체에서 record.currentStageId로 찾아 넘겨주는, evolvesTo를
// 포함한 전체 엔트리다(이 모듈은 그 데이터셋을 직접 알지 못한다).
//
// 반환값:
//  - 내 포켓몬이 아직 없으면(getMyPokemon()이 null) null (방어적, 아무 것도 하지 않음).
//  - 그 외에는 항상 { evolved, branchChoicePending, newStageId, pointsSinceLastEvolution } 객체.
//    - evolved: true면 이번 호출로 단일 분기 진화가 "자동으로" 완료됨(currentStageId가 이미 갱신됨).
//    - branchChoicePending: true면 임계값은 넘었지만 분기가 여러 개라 자동으로 고르지
//      않았음(record.pendingBranchChoices에 후보가 저장되고, currentStageId는 아직 그대로).
//    - evolved와 branchChoicePending은 동시에 true일 수 없다.
//    - newStageId: evolved가 true일 때만 값이 있고, 그 외엔 null.
// 임계값을 초과한 만큼의 포인트는 버리지 않고 다음 주기로 이월한다(예: 190 + 30 = 220 →
// 진화 후 pointsSinceLastEvolution은 20).
export function addPoints(points, currentStagePokemon) {
  const record = getMyPokemon();
  if (!record) return null;

  const rawTotal = record.pointsSinceLastEvolution + points;
  const lifetimePoints = record.lifetimePoints + points;
  const evolvesTo = currentStagePokemon?.evolvesTo || [];
  const crossedThreshold = evolvesTo.length > 0 && rawTotal >= EVOLUTION_THRESHOLD;

  if (!crossedThreshold) {
    writeRecord({ ...record, pointsSinceLastEvolution: rawTotal, lifetimePoints });
    return {
      evolved: false,
      branchChoicePending: false,
      newStageId: null,
      pointsSinceLastEvolution: rawTotal,
    };
  }

  const remainder = rawTotal - EVOLUTION_THRESHOLD;

  if (evolvesTo.length === 1) {
    const newStageId = evolvesTo[0].id;
    writeRecord({
      ...record,
      pointsSinceLastEvolution: remainder,
      lifetimePoints,
      currentStageId: newStageId,
      history: [...record.history, newStageId],
      pendingEvolution: true,
      pendingBranchChoices: null,
    });
    return {
      evolved: true,
      branchChoicePending: false,
      newStageId,
      pointsSinceLastEvolution: remainder,
    };
  }

  // 분기 진화(예: 이브이의 evolvesTo.length > 1): 자동으로 하나를 고르지 않는다.
  // currentStageId/history는 그대로 두고, 어떤 분기가 가능한지만 저장해 홈 화면에서
  // 아이가 직접 고를 수 있게 한다 (resolveBranchEvolution 참고).
  writeRecord({
    ...record,
    pointsSinceLastEvolution: remainder,
    lifetimePoints,
    pendingEvolution: true,
    pendingBranchChoices: evolvesTo,
  });
  return {
    evolved: false,
    branchChoicePending: true,
    newStageId: null,
    pointsSinceLastEvolution: remainder,
  };
}

// 분기 진화 선택 화면(홈 화면)에서 아이가 고른 분기를 확정한다.
// pendingBranchChoices에 없는 id를 넘기거나, 애초에 분기 선택이 필요한 상태가
// 아니면(내 포켓몬이 없거나 pendingBranchChoices가 비어있으면) 아무 것도 하지 않고
// null을 반환한다.
// 확정 후에도 pendingEvolution은 true로 남아있다 — 홈 화면이 "짠! 진화했어요" 리빌
// 연출을 아직 보여줘야 하기 때문이며, 다 보여준 뒤에는 clearPendingEvolution을 호출한다.
export function resolveBranchEvolution(chosenId) {
  const record = getMyPokemon();
  if (
    !record ||
    !Array.isArray(record.pendingBranchChoices) ||
    record.pendingBranchChoices.length === 0
  ) {
    return null;
  }
  const isValidChoice = record.pendingBranchChoices.some((b) => b.id === chosenId);
  if (!isValidChoice) return null;

  return writeRecord({
    ...record,
    currentStageId: chosenId,
    history: [...record.history, chosenId],
    pendingEvolution: true,
    pendingBranchChoices: null,
  });
}

// 진화 리빌 연출을 다 보여준 뒤 호출해 pendingEvolution을 내린다.
// (evolvesTo가 비어있는데 pendingEvolution이 true인 방어적 상황도 이 함수 하나로
// 처리된다 — 호출하는 쪽이 연출 없이 그냥 이 함수만 부르면 됨.)
// 내 포켓몬이 없으면 아무 것도 하지 않는다.
export function clearPendingEvolution() {
  const record = getMyPokemon();
  if (!record) return null;
  return writeRecord({
    ...record,
    pendingEvolution: false,
    pendingBranchChoices: null,
  });
}

// 최종 진화(evolvesTo.length === 0)에 도달한 뒤 "새 친구 고르기"를 선택했을 때 호출한다.
// (이 함수 스스로는 실제로 evolvesTo.length === 0인지 검증하지 않는다 — 그 버튼을
// 보여줄지 말지는 호출하는 화면(MyPokemon.jsx)이 이미 판단해서 걸러주기 때문.)
// 지금 포켓몬을 collection에 추가하고, starterId/currentStageId 등을 다시 null로
// 되돌려 getMyPokemon()이 null을 반환하게 만든다(→ 앱이 자연히 /mine/choose로 라우팅됨).
// lifetimePoints와 collection은 초기화하지 않는다(스펙 명시 사항).
// 내 포켓몬이 없으면(이미 졸업했거나 애초에 없으면) 아무 것도 하지 않는다.
export function graduateAndRestart() {
  const record = getMyPokemon();
  if (!record) return null;

  return writeRecord({
    starterId: null,
    nickname: null,
    currentStageId: null,
    history: [],
    pointsSinceLastEvolution: 0,
    lifetimePoints: record.lifetimePoints,
    pendingEvolution: false,
    pendingBranchChoices: null,
    collection: [...record.collection, record.currentStageId],
  });
}

// "다시 선택"(완전 진화 여부와 무관하게 언제든 다른 포켓몬으로 바꾸고 싶을 때) 호출한다.
// graduateAndRestart와 초기화되는 필드는 동일하지만, 지금 포켓몬을 collection에
// 추가하지 않는다는 점이 다르다 — collection은 "완전 진화까지 마친" 포켓몬만
// 담는 갤러리라는 의미를 지키기 위해, 아직 안 끝난 포켓몬을 그냥 그만두는 경우는
// 거기 들어가지 않는다. lifetimePoints는 그대로 보존한다(포인트는 실력의 척도이지
// 어떤 포켓몬을 키우고 있었는지와 무관하기 때문).
// 내 포켓몬이 없으면 아무 것도 하지 않는다.
export function resetMyPokemon() {
  const record = getMyPokemon();
  if (!record) return null;

  return writeRecord({
    starterId: null,
    nickname: null,
    currentStageId: null,
    history: [],
    pointsSinceLastEvolution: 0,
    lifetimePoints: record.lifetimePoints,
    pendingEvolution: false,
    pendingBranchChoices: null,
    collection: record.collection,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/myPokemon.test.js`
Expected: PASS (27 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/myPokemon.js src/utils/myPokemon.test.js
git commit -m "feat: add point accrual, evolution triggering, and graduation to myPokemon store"
```

---

### Task 2: `useAwardPoints()` hook

**Files:**
- Create: `src/hooks/useMyPokemonPoints.js`

**Interfaces:**
- Consumes: `getMyPokemon`, `addPoints` from `src/utils/myPokemon.js` (Task 1); `loadPokemonData` from `src/utils/pokemonData.js`.
- Produces: `useAwardPoints(): (points: number) => void`. Consumed by Task 3 (three existing quiz pages) and Task 6 (`EvolutionQuiz.jsx`).

**Design decision:** the hook takes **no arguments** and calls `loadPokemonData()` itself (already cached after the page's own `loadPokemonData()` call, so this is not an extra network request) rather than being passed the quiz page's own `all` state array. This is a deliberate deviation worth double-checking: three of the four quiz pages call `applyGen1OnlyFilter(...)` before storing into `all`, so if the player's `currentStageId` happens to fall outside the current 1세대-only filter (e.g. they toggled the filter on after picking a non-gen1 starter), looking it up in the page's filtered array would silently fail to find it and skip the point award. Looking it up in the *unfiltered* full dataset instead avoids that bug entirely.

- [ ] **Step 1: Write the implementation** (no dedicated test file — see Self-Review; this is a thin wrapper whose real logic already has full coverage in `myPokemon.test.js`, matching this codebase's existing convention of not testing fetch-dependent pages/hooks)

Create `src/hooks/useMyPokemonPoints.js`:

```js
import { useCallback } from "react";
import { getMyPokemon, addPoints } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

// 퀴즈 정답 시 포인트를 "내 포켓몬"에 적립하는 훅.
// 진화/분기 선택 연출은 모두 홈 화면(Home.jsx)에서 재생되므로, 이 훅은 addPoints의
// 결과를 그냥 흘려보내고(fire-and-forget) 퀴즈 화면 자체는 아무 것도 보여주지 않는다.
//
// 퀴즈 화면들의 `all` state는 1세대 필터(applyGen1OnlyFilter) 등이 적용돼 있을 수
// 있어, "내 포켓몬"의 현재 단계가 그 목록에 없을 수도 있다(필터 켠 뒤 non-gen1
// 스타터를 이미 키우고 있던 경우 등). 그래서 이 훅은 퀴즈 화면의 필터된 목록을
// 받지 않고, loadPokemonData()로 필터 없는 전체 목록을 직접(캐시되어 있으므로
// 추가 네트워크 요청 없이) 가져와 조회한다.
export function useAwardPoints() {
  return useCallback((points) => {
    const record = getMyPokemon();
    if (!record) return; // 내 포켓몬이 없으면 조용히 무시

    loadPokemonData().then((all) => {
      const currentStagePokemon = all.find((p) => p.id === record.currentStageId);
      if (!currentStagePokemon) return; // 방어적: 데이터에 없는 id면 무시
      addPoints(points, currentStagePokemon);
    });
  }, []);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMyPokemonPoints.js
git commit -m "feat: add useAwardPoints hook wrapping addPoints for quiz pages"
```

---

### Task 3: Wire point accrual into the three existing quiz pages

**Files:**
- Modify: `src/pages/SilhouetteQuiz.jsx`
- Modify: `src/pages/ChosungQuiz.jsx`
- Modify: `src/pages/CryQuiz.jsx`

**Interfaces:**
- Consumes: `useAwardPoints()` from `src/hooks/useMyPokemonPoints.js` (Task 2).

Same one-line-plus-one-call change in all three files: import the hook, call it once per component, and invoke it right where `setScore` already fires on a correct answer, with the exact same `Math.max(30 - hintLevel * 10, 10)` expression already used for the score.

- [ ] **Step 1: `src/pages/SilhouetteQuiz.jsx`** — add the import and hook call, and award points in both `submitChoice` and `submitTyped`:

```jsx
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
```

- [ ] **Step 2: `src/pages/ChosungQuiz.jsx`** — identical treatment. Replace the full file, keeping everything the same except: add `import { useAwardPoints } from "../hooks/useMyPokemonPoints";`, add `const awardPoints = useAwardPoints();` next to the other `useState` calls, and change `submitChoice`/`submitTyped` to:

```jsx
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

(Every other line of `src/pages/ChosungQuiz.jsx` — the chosung display block, the generation hint step, the rest of the JSX — is unchanged from the current file. Apply this as a full-file replacement using the current file's content with only the import line and these two functions modified, to avoid any accidental drift.)

- [ ] **Step 3: `src/pages/CryQuiz.jsx`** — identical treatment: add the same import, `const awardPoints = useAwardPoints();`, and the same two-line change (`const earned = ...; setScore(...); awardPoints(earned);`) inside both `submitChoice` and `submitTyped`. All other lines (audio ref, `playCry`, hint steps) are unchanged.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — no existing test targets these three pages directly (consistent with the existing no-page-test convention), so nothing should break.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SilhouetteQuiz.jsx src/pages/ChosungQuiz.jsx src/pages/CryQuiz.jsx
git commit -m "feat: award my-Pokemon points on correct quiz answers"
```

---

### Task 4: Evolution-reveal CSS

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: `.evolution-reveal-new`, `.evolution-shimmer-ring` classes, consumed by Task 5 (`Home.jsx`).

- [ ] **Step 1: Append to the end of `src/index.css`** (after the existing `@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }` block):

```css
@keyframes evolution-pop {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  60% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes evolution-shimmer {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .evolution-reveal-new {
    animation: evolution-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .evolution-shimmer-ring {
    animation: evolution-shimmer 1.4s ease-in-out infinite;
  }
}
```

(Deliberately structured as a single `@media (prefers-reduced-motion: no-preference)` block wrapping both animations — same gating direction as the existing `.press` rule at `src/index.css:172-179`, rather than the "animation, then reduce: none" order used for `.skeleton`. Either order is equivalent; this mirrors `.press`'s pattern since both are "opt-in only when motion is fine" cases.)

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: add reduced-motion-gated evolution reveal animations"
```

---

### Task 5: Evolution celebration + progress bar on `Home.jsx`

**Files:**
- Modify: `src/pages/Home.jsx`

**Interfaces:**
- Consumes: `getMyPokemon`, `resolveBranchEvolution`, `clearPendingEvolution`, `EVOLUTION_THRESHOLD` from `src/utils/myPokemon.js` (Task 1); `loadPokemonData` from `src/utils/pokemonData.js`; `.evolution-reveal-new`/`.evolution-shimmer-ring` (Task 4).

**Design decisions locked in here:**
- Branch-choice vs. already-resolved is read directly from the persisted record: `mine.pendingBranchChoices` non-empty → show picker; otherwise (but `pendingEvolution === true`) → show reveal. This is the exact reconciliation the task brief asked for between Task 1 and this task.
- The reveal step computes "before"/"after" from `history[history.length - 2]` / `history[history.length - 1]` (== `currentStageId`) rather than tracking any separate "previous stage" field. This also correctly handles the edge case where multiple quiz answers queued up more than one evolution before the player ever opened Home again — only the final transition is shown, which satisfies the spec's "1회 재생" requirement without needing extra state.
- Defensive edge case from the spec ("evolvesTo가 비어 있는데 pendingEvolution이 true인 경우… 진화 연출을 건너뛰고 pendingEvolution만 false로 되돌린다"): generalized here to "if pendingEvolution is true but the reveal pair can't be resolved from `all` for any reason" → skip straight to `clearPendingEvolution()` with no animation.
- The reveal UI shows the pre-evolution and post-evolution artwork side-by-side (dimmed "before" → glowing/pop-animated "after") rather than a timed cross-fade sequence. This avoids needing any JS-driven timers to gate a "wait N ms, then reveal" sequence under `prefers-reduced-motion` — the CSS media query alone (Task 4) fully handles the reduced-motion case since there's no timing to skip, just entrance animations to disable.
- Adds the progress bar (`pointsSinceLastEvolution / EVOLUTION_THRESHOLD`) to the normal-state status card. This wasn't spelled out as its own bullet in the task brief's five numbered scope items, but the underlying spec (`docs/superpowers/specs/2026-08-02-my-pokemon-evolution-design.md` line 119) explicitly requires it for Home's "있으면" state, and the foundation plan explicitly deferred it "since point accrual doesn't exist in this slice" (`docs/superpowers/plans/2026-08-02-my-pokemon-foundation.md` line 959) — now that Task 1 adds point accrual, this is squarely in scope. Flagged for human confirmation in Self-Review.

- [ ] **Step 1: Replace the full contents of `src/pages/Home.jsx`**

```jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { SparklesIcon } from "../components/Icons";
import { loadPokemonData } from "../utils/pokemonData";
import {
  getMyPokemon,
  resolveBranchEvolution,
  clearPendingEvolution,
  EVOLUTION_THRESHOLD,
} from "../utils/myPokemon";

export default function Home() {
  const [mine, setMine] = useState(undefined); // undefined=확인 전, null=없음, 객체=있음
  const [all, setAll] = useState([]);
  // null | "branch" (분기 선택 대기) | "reveal" (짠! 화면)
  const [celebrationStep, setCelebrationStep] = useState(null);

  useEffect(() => {
    const rec = getMyPokemon();
    setMine(rec);
    loadPokemonData().then(setAll);
    if (rec?.pendingEvolution) {
      const hasBranchChoice =
        Array.isArray(rec.pendingBranchChoices) && rec.pendingBranchChoices.length > 0;
      setCelebrationStep(hasBranchChoice ? "branch" : "reveal");
    }
  }, []);

  const currentPokemon = useMemo(
    () => (mine ? all.find((p) => p.id === mine.currentStageId) : null),
    [mine, all]
  );

  // 진화 리빌 연출의 이전/이후 포켓몬. history의 마지막 두 항목을 사용해, 홈 화면을
  // 다시 방문하기 전에 여러 번 진화가 쌓였더라도(퀴즈를 몰아서 푼 경우 등) 마지막
  // 한 번의 전환만 보여준다.
  const revealPair = useMemo(() => {
    if (!mine || mine.history.length < 2 || all.length === 0) return null;
    const fromId = mine.history[mine.history.length - 2];
    const toId = mine.history[mine.history.length - 1];
    const from = all.find((p) => p.id === fromId);
    const to = all.find((p) => p.id === toId);
    if (!from || !to) return null; // 방어적: 데이터 누락이면 연출을 만들 수 없음
    return { from, to };
  }, [mine, all]);

  useEffect(() => {
    // 방어적 엣지 케이스: pendingEvolution은 true인데 리빌에 필요한 데이터가 없으면
    // (분기 선택 대상도 아니고 revealPair도 못 만들면) 연출 없이 바로 내려버린다.
    if (celebrationStep === "reveal" && all.length > 0 && !revealPair) {
      clearPendingEvolution();
      setMine(getMyPokemon());
      setCelebrationStep(null);
    }
  }, [celebrationStep, all, revealPair]);

  function handlePickBranch(id) {
    const updated = resolveBranchEvolution(id);
    if (!updated) return; // 방어적: 유효하지 않은 선택이면 무시
    setMine(updated);
    setCelebrationStep("reveal");
  }

  function handleContinue() {
    clearPendingEvolution();
    setMine(getMyPokemon());
    setCelebrationStep(null);
  }

  if (celebrationStep === "branch" && mine) {
    return (
      <AppShell title="진화!">
        <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
          <h2 style={{ fontSize: 22 }}>어떤 모습으로 진화할까요?</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 4 }}>
            마음에 드는 모습을 골라주세요
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 12,
              marginTop: "var(--space-5)",
            }}
          >
            {mine.pendingBranchChoices.map((choice) => {
              const p = all.find((x) => x.id === choice.id);
              if (!p) return null; // 방어적: 데이터에 없는 후보는 건너뜀
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handlePickBranch(choice.id)}
                  className="press"
                  style={{
                    border: "none",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                    background: "var(--color-surface)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <img
                    src={p.artwork}
                    alt="어떤 모습일까요"
                    style={{ width: 76, height: 76, filter: "brightness(0)" }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  if (celebrationStep === "reveal" && revealPair) {
    return (
      <AppShell title="진화!">
        <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <img
              src={revealPair.from.artwork}
              alt={revealPair.from.nameKo}
              style={{ width: 84, height: 84, opacity: 0.55, filter: "grayscale(1)" }}
            />
            <span style={{ fontSize: 22, color: "var(--color-text-muted)" }}>→</span>
            <div
              className="evolution-shimmer-ring"
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
              }}
            >
              <img
                src={revealPair.to.artwork}
                alt={revealPair.to.nameKo}
                className="evolution-reveal-new"
                style={{ width: 112, height: 112 }}
              />
            </div>
          </div>
          <h2 style={{ fontSize: 24, marginTop: "var(--space-5)" }}>
            짠! {revealPair.to.nameKo}(으)로 진화했어요!
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 4 }}>
            {mine?.nickname}가 한층 더 성장했어요
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="press"
            style={{
              marginTop: "var(--space-5)",
              minHeight: 48,
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            계속하기
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={undefined}>
      <div style={{ padding: "var(--space-4) 0 var(--space-2)" }}>
        <img
          src={`${import.meta.env.BASE_URL}pokeball.svg`}
          alt=""
          style={{ width: 40, height: 40, marginBottom: "var(--space-3)" }}
        />
        <h1 style={{ fontSize: 30, color: "var(--color-primary)" }}>
          포켓몬 도감 & 퀴즈
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)", lineHeight: 1.5 }}>
          아이와 함께, 또는 포켓몬을 좋아하는 누구나 즐길 수 있는 미니 도감 &
          퀴즈 앱입니다.
        </p>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        {mine === undefined && (
          <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
        )}

        {mine === null && (
          <Link
            to="/mine/choose"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-5)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "color-mix(in srgb, currentColor 18%, transparent)",
                flexShrink: 0,
              }}
            >
              <SparklesIcon size={26} strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                나만의 포켓몬을 만나보세요!
              </div>
              <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                포켓몬을 골라 퀴즈를 풀며 키워보세요
              </div>
            </div>
          </Link>
        )}

        {mine && (
          <Link
            to="/mine"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-card)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--color-surface-2)",
                flexShrink: 0,
              }}
            >
              {currentPokemon && (
                <img
                  src={currentPokemon.artwork}
                  alt={mine.nickname}
                  style={{ width: 52, height: 52 }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>내 포켓몬</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                {mine.nickname}
              </div>

              {currentPokemon && currentPokemon.evolvesTo?.length > 0 ? (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      height: 8,
                      borderRadius: "var(--radius-pill)",
                      background: "var(--color-surface-2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          100,
                          Math.round(
                            (mine.pointsSinceLastEvolution / EVOLUTION_THRESHOLD) * 100
                          )
                        )}%`,
                        background: "var(--color-accent)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                    다음 진화까지 {mine.pointsSinceLastEvolution} / {EVOLUTION_THRESHOLD}
                  </div>
                </div>
              ) : (
                currentPokemon && (
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>
                    최고 단계까지 진화를 마쳤어요
                  </div>
                )
              )}
            </div>
          </Link>
        )}
      </div>

      <p style={{ marginTop: "var(--space-10)", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
        본 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The
        Pokémon Company와 관련이 없습니다. 데이터 출처:{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokeAPI</a>
      </p>
    </AppShell>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Simulate a pending evolution by setting `localStorage` in the browser console before loading `/`, e.g.:
```js
localStorage.setItem("pokemonMine.v1", JSON.stringify({
  starterId: 1, nickname: "몽몽이", currentStageId: 2, history: [1, 2],
  pointsSinceLastEvolution: 20, lifetimePoints: 220, pendingEvolution: true,
  pendingBranchChoices: null, collection: [],
}));
```
Reload `/` — confirm the reveal screen shows 이상해씨→이상해풀 with the shimmer/pop animation, and "계속하기" returns to the normal card with `pendingEvolution` cleared (verify via `localStorage.getItem("pokemonMine.v1")`). Repeat with `currentStageId: 133` (이브이) and `pendingBranchChoices` set to eevee's branches to confirm the picker renders and tapping a branch transitions into the reveal step. Confirm the normal-state progress bar renders correctly proportional to `pointsSinceLastEvolution`.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS (no existing test targets `Home.jsx`, consistent with the existing convention).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat: play evolution celebration (branch picker + reveal) and progress bar on Home"
```

---

### Task 6: Final-evolution graduation flow + always-available "다시 선택" on `MyPokemon.jsx`

**Files:**
- Modify: `src/pages/MyPokemon.jsx`

**Interfaces:**
- Consumes: `graduateAndRestart`, `resetMyPokemon` from `src/utils/myPokemon.js` (Task 1).

**New requirement folded in mid-plan:** the user asked for a way to change their mind and pick a different pokemon at any time, not only after reaching the final evolution. This is a *second*, always-visible control distinct from the graduation panel: a small "다른 포켓몬 고르기" text link near the bottom of the screen, visible regardless of `isFinalEvolution`. Because it discards in-progress evolution progress toward the next stage (unlike the graduation flow, which only ever fires once a pokemon is already fully done), it goes through a lightweight in-app confirmation step first — no native `confirm()` dialog (inconsistent styling, and this codebase never uses one), just a small inline panel with "정말요?" copy and an explicit Cancel, matching the same visual language as the graduation panel already in this file. Calls `resetMyPokemon()` (not `graduateAndRestart()` — see Task 1's design-decision note on why these stay separate) then navigates to `/mine/choose`.

- [ ] **Step 1: Replace the full contents of `src/pages/MyPokemon.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { loadPokemonData, TYPE_COLOR } from "../utils/pokemonData";
import { getMyPokemon, graduateAndRestart, resetMyPokemon } from "../utils/myPokemon";

export default function MyPokemon() {
  const navigate = useNavigate();
  const [record, setRecord] = useState(undefined); // undefined = 아직 확인 전, null = 없음
  const [p, setP] = useState(null);
  const [dismissedGraduation, setDismissedGraduation] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    const rec = getMyPokemon();
    setRecord(rec);
    if (!rec) {
      navigate("/mine/choose", { replace: true });
      return;
    }
    loadPokemonData().then((all) => {
      setP(all.find((x) => x.id === rec.currentStageId) || null);
    });
  }, [navigate]);

  if (record === undefined || record === null || !p) {
    return (
      <AppShell title="내 포켓몬" backTo="/">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 20, width: "60%", margin: "0 auto 8px" }} />
      </AppShell>
    );
  }

  const tint = TYPE_COLOR[p.types[0]] || "#999";
  const isFinalEvolution = p.evolvesTo?.length === 0;

  function handleGraduate() {
    graduateAndRestart();
    navigate("/mine/choose");
  }

  function handleReset() {
    resetMyPokemon();
    navigate("/mine/choose");
  }

  return (
    <AppShell title="내 포켓몬" backTo="/">
      <div
        style={{
          textAlign: "center",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6) var(--space-4) var(--space-4)",
          background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`,
        }}
      >
        <img src={p.artwork} alt={record.nickname} style={{ width: 180, height: 180 }} />
        <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          #{String(p.id).padStart(4, "0")}
        </div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>{record.nickname}</h1>
        <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{p.nameKo}</div>
      </div>

      <p
        style={{
          marginTop: "var(--space-5)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        퀴즈를 풀면서 함께 키워보세요!
      </p>

      {isFinalEvolution && !dismissedGraduation && (
        <div
          style={{
            marginTop: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            background: "var(--color-surface-2)",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: 15 }}>
            최고 단계까지 진화를 마쳤어요!
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setDismissedGraduation(true)}
              className="press"
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              계속 보기
            </button>
            <button
              type="button"
              onClick={handleGraduate}
              className="press"
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--color-primary)",
                color: "var(--color-text-on-primary)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              새 친구 고르기
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: 13,
              textDecoration: "underline",
              cursor: "pointer",
              minHeight: 44,
              padding: "10px",
            }}
          >
            다른 포켓몬 고르기
          </button>
        ) : (
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              background: "var(--color-surface-2)",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700 }}>정말요?</p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
              지금 포켓몬의 진화 진행 상황은 사라져요.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="press"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="press"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--color-danger)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                새로 고르기
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Set `localStorage` to a final-evolution record (e.g. `currentStageId: 3` / 이상해꽃) and reload `/mine`. Confirm the graduation panel appears with both buttons; "계속 보기" hides the panel without touching localStorage; "새 친구 고르기" navigates to `/mine/choose` and `localStorage.getItem("pokemonMine.v1")` shows `currentStageId: null` with `collection` containing `3` and `lifetimePoints` unchanged. Separately, with a non-final record (e.g. 이상해씨), confirm "다른 포켓몬 고르기" always shows regardless of evolution stage; tapping it reveals the confirm panel; "취소" dismisses it with no storage change; "새로 고르기" navigates to `/mine/choose` and `pokemonMine.v1`'s `collection` does **not** contain the abandoned pokemon's id (unlike the graduation path), while `lifetimePoints` is unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MyPokemon.jsx
git commit -m "feat: add final-evolution graduation flow and always-available reset to MyPokemon screen"
```

---

### Task 7: Pure chain-picking logic for the evolution-order quiz

**Files:**
- Create: `src/utils/evolutionQuizChain.js`
- Create: `src/utils/evolutionQuizChain.test.js`

**Interfaces:**
- Produces: `getEvolutionQuizCandidates(allPokemon): Array`, `buildEvolutionChain(startPokemon, allPokemon): Array`, `pickEvolutionQuizChain(allPokemon): Array|null`. Consumed by Task 8 (`EvolutionQuiz.jsx`).

**Judgment call locked in here (flagged for human double-check):** branching chains (Eevee: `evolvesTo.length > 1`) are handled by deterministically walking `evolvesTo[0]` at every step, rather than excluding branching Pokémon from the quiz pool entirely. This keeps popular branch-family Pokémon (Eevee) eligible while still guaranteeing exactly one "correct order" per question (the same edge is always walked). The alternative — restricting candidates to chains with no branching node anywhere in the path — was considered and rejected because it would silently exclude Eevee from ever appearing in this quiz mode.

- [ ] **Step 1: Write the failing test file**

Create `src/utils/evolutionQuizChain.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  getEvolutionQuizCandidates,
  buildEvolutionChain,
  pickEvolutionQuizChain,
} from "./evolutionQuizChain";

const bulbasaur = { id: 1, nameKo: "이상해씨", evolvesTo: [{ id: 2, minLevel: 16 }] };
const ivysaur = { id: 2, nameKo: "이상해풀", evolvesTo: [{ id: 3, minLevel: 32 }] };
const venusaur = { id: 3, nameKo: "이상해꽃", evolvesTo: [] };
const eevee = {
  id: 133,
  nameKo: "이브이",
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
};
const vaporeon = { id: 134, nameKo: "샤미드", evolvesTo: [] };
const jolteon = { id: 135, nameKo: "쥬피썬더", evolvesTo: [] };
const mewtwo = { id: 150, nameKo: "뮤츠", evolvesTo: [] };
const brokenLink = { id: 999, nameKo: "고장난고리", evolvesTo: [{ id: 12345, minLevel: 1 }] };

const all = [bulbasaur, ivysaur, venusaur, eevee, vaporeon, jolteon, mewtwo, brokenLink];

describe("getEvolutionQuizCandidates", () => {
  it("evolvesTo가 있는(최종 진화가 아닌) 포켓몬만 후보로 반환한다", () => {
    const candidates = getEvolutionQuizCandidates(all);
    expect(candidates.map((p) => p.id)).toEqual([1, 2, 133, 999]);
  });
});

describe("buildEvolutionChain", () => {
  it("선형 3단 진화는 시작점부터 끝까지 순서대로 모은다", () => {
    const chain = buildEvolutionChain(bulbasaur, all);
    expect(chain.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("중간 단계에서 시작하면 그 지점부터의 체인만 모은다", () => {
    const chain = buildEvolutionChain(ivysaur, all);
    expect(chain.map((p) => p.id)).toEqual([2, 3]);
  });

  it("분기 진화는 evolvesTo[0]만 결정적으로 따라간다", () => {
    const chain = buildEvolutionChain(eevee, all);
    expect(chain.map((p) => p.id)).toEqual([133, 134]);
  });

  it("최대 3단계까지만 모은다", () => {
    const chain = buildEvolutionChain(bulbasaur, all);
    expect(chain.length).toBeLessThanOrEqual(3);
  });

  it("다음 단계 id가 데이터에 없으면(방어적) 지금까지 모은 체인에서 멈춘다", () => {
    const chain = buildEvolutionChain(brokenLink, all);
    expect(chain.map((p) => p.id)).toEqual([999]);
  });
});

describe("pickEvolutionQuizChain", () => {
  it("후보가 없으면 null을 반환한다", () => {
    expect(pickEvolutionQuizChain([mewtwo, venusaur])).toBe(null);
  });

  it("체인이 2단계 미만으로만 만들어지면(방어적 상황) null을 반환한다", () => {
    expect(pickEvolutionQuizChain([brokenLink])).toBe(null);
  });

  it("후보 중 하나를 골라 2~3단계짜리 체인을 반환한다", () => {
    const chain = pickEvolutionQuizChain(all);
    expect(chain).not.toBe(null);
    expect(chain.length).toBeGreaterThanOrEqual(2);
    expect(chain.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/evolutionQuizChain.test.js`
Expected: FAIL — `Cannot find module './evolutionQuizChain'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/evolutionQuizChain.js`:

```js
// 진화 순서 퀴즈(EvolutionQuiz)용 순수 로직.
// public/data/pokemon.json 전체 배열에서 무작위로 "진화 체인의 한 구간"(2~3단계)을
// 뽑아 정답 순서 배열로 반환한다. 이 파일은 React나 DOM에 의존하지 않아 단위
// 테스트가 가능하다(evolutionQuizChain.test.js 참고).
//
// 분기 진화(예: 이브이 -> 부스터/샤미드/쥬피썬더/…) 판단 규칙:
// 매 단계에서 evolvesTo[0]만 결정적으로 택해 한 갈래로만 진행한다. 분기가 있는
// 포켓몬을 아예 출제 후보에서 빼는 대신 이 방식을 택한 이유는, 이브이처럼 인기
// 있는 포켓몬을 후보 풀에서 통째로 제외하지 않으면서도 "정답은 항상 하나"임을
// 보장하기 위해서다(evolvesTo[0]는 항상 같은 원소이므로 매번 같은 정답이 나온다).

const MAX_CHAIN_LENGTH = 3;

// 출제 후보: 앞으로 더 진화할 수 있는(evolvesTo가 있는) 포켓몬 전체.
// 이미 최종 진화라 evolvesTo가 없는 포켓몬은 "순서"를 물을 거리가 없어 제외한다.
export function getEvolutionQuizCandidates(allPokemon) {
  return allPokemon.filter((p) => p.evolvesTo?.length > 0);
}

// startPokemon에서 시작해 evolvesTo[0]을 반복해서 따라가며 체인을 만든다.
// 최대 MAX_CHAIN_LENGTH단계까지, 또는 evolvesTo가 없는 최종 진화를 만날 때까지
// 진행한다. 다음 id가 allPokemon에 없으면(방어적, 데이터 누락) 지금까지 모은
// 체인에서 멈춘다.
export function buildEvolutionChain(startPokemon, allPokemon) {
  const byId = new Map(allPokemon.map((p) => [p.id, p]));
  const chain = [startPokemon];
  let current = startPokemon;
  while (chain.length < MAX_CHAIN_LENGTH && current.evolvesTo?.length > 0) {
    const next = byId.get(current.evolvesTo[0].id);
    if (!next) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

// 후보 중 하나를 무작위로 골라 정답 순서 체인을 만든다.
// 후보가 없거나(데이터 누락) 체인이 2단계 미만으로만 만들어지면(방어적 상황) null.
export function pickEvolutionQuizChain(allPokemon) {
  const candidates = getEvolutionQuizCandidates(allPokemon);
  if (candidates.length === 0) return null;
  const start = candidates[Math.floor(Math.random() * candidates.length)];
  const chain = buildEvolutionChain(start, allPokemon);
  return chain.length >= 2 ? chain : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/evolutionQuizChain.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/evolutionQuizChain.js src/utils/evolutionQuizChain.test.js
git commit -m "test: add pure evolution-order-quiz chain-picking logic with unit tests"
```

---

### Task 8: `EvolutionQuiz.jsx` page

**Files:**
- Create: `src/pages/EvolutionQuiz.jsx`

**Interfaces:**
- Consumes: `loadPokemonData`, `TYPE_LABEL_KO`, `applyGen1OnlyFilter` from `src/utils/pokemonData.js`; `pickEvolutionQuizChain` from `src/utils/evolutionQuizChain.js` (Task 7); `useAwardPoints` from `src/hooks/useMyPokemonPoints.js` (Task 2); `primaryBtn`, `hintBtn` from `src/styles/tokens.js`; `LightbulbIcon`, `CheckIcon`, `XCircleIcon` from `src/components/Icons.jsx`.
- Produces: default export `EvolutionQuiz`, mounted at `/quiz/evolution` in Task 9.

**Design decisions:**
- Tap-to-order, not drag-and-drop, per spec: tapping a card appends its id to `tappedIds`; a numbered badge (①②③) renders once tapped; grading is automatic the instant the last card is tapped.
- Includes one small UX addition beyond the literal spec text: a "순서 다시 정하기" (reset order) link, visible only before all cards are tapped, letting a child undo a misclick before the irreversible auto-grade fires — consistent with the spec's "실패해도 벌칙이 없다" philosophy. Flagged in Self-Review as a minor scope addition.
- Hints target the chain's first-stage Pokémon (`chain[0]`), mirroring how the other three quizzes hint about their single `answer` — 2 steps (type, then description) per spec, not the 3-step pattern the other quizzes use.
- `nextRound` retries `pickEvolutionQuizChain` up to 20 times if it returns `null` (e.g. transient gen1-only-filter edge case where a chain's next stage falls outside the filtered set) before giving up for that effect run.

- [ ] **Step 1: Write the implementation**

Create `src/pages/EvolutionQuiz.jsx`:

```jsx
import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import { LightbulbIcon, CheckIcon, XCircleIcon } from "../components/Icons";
import { loadPokemonData, TYPE_LABEL_KO, applyGen1OnlyFilter } from "../utils/pokemonData";
import { pickEvolutionQuizChain } from "../utils/evolutionQuizChain";
import { useAwardPoints } from "../hooks/useMyPokemonPoints";
import { primaryBtn, hintBtn } from "../styles/tokens";

const HINT_STEPS = ["type", "description"];
const MAX_PICK_ATTEMPTS = 20;

export default function EvolutionQuiz() {
  const [all, setAll] = useState([]);
  const [chain, setChain] = useState(null); // 정답 순서 (첫 단계 -> 마지막 단계)
  const [display, setDisplay] = useState([]); // 화면에 보여줄 섞인 순서
  const [tappedIds, setTappedIds] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const awardPoints = useAwardPoints();

  useEffect(() => {
    loadPokemonData().then((data) => {
      setAll(applyGen1OnlyFilter(data));
    });
  }, []);

  const nextRound = useCallback(() => {
    let picked = null;
    for (let i = 0; i < MAX_PICK_ATTEMPTS && !picked; i++) {
      picked = pickEvolutionQuizChain(all);
    }
    if (!picked) return; // 방어적: 후보가 부족하면(데이터/필터 문제) 이번 라운드는 건너뜀
    setChain(picked);
    setDisplay(shuffle(picked));
    setTappedIds([]);
    setHintLevel(0);
    setRevealed(false);
    setCorrect(null);
    setRound((r) => r + 1);
  }, [all]);

  useEffect(() => {
    if (all.length) nextRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  if (!chain) {
    return (
      <AppShell title="진화 순서 맞추기" backTo="/quiz">
        <div className="skeleton" style={{ height: 220 }} />
      </AppShell>
    );
  }

  const start = chain[0];

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
          {round}번째 문제 · 점수 {score}점
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
            <p>
              정답 순서는 <b>{chain.map((p) => p.nameKo).join(" → ")}</b> 였습니다.
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
```

- [ ] **Step 2: Manual verification (after Task 9 wires the route)**

Run: `npm run dev`, navigate to `/quiz/evolution`. Confirm cards render unlabeled artwork, tapping accumulates ①②③ badges, tapping the last card auto-grades, hint buttons reveal type then description of the chain's first stage, and a correct answer both increments the on-screen score and (with a chosen starter set in localStorage) increments `pointsSinceLastEvolution` in `pokemonMine.v1`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/EvolutionQuiz.jsx
git commit -m "feat: add tap-to-order evolution-sequence quiz mode"
```

---

### Task 9: Wire `EvolutionQuiz` into `QuizHub` and routing

**Files:**
- Modify: `src/pages/QuizHub.jsx`
- Modify: `src/pages/QuizHub.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `EvolutionQuiz` (Task 8) default export.

- [ ] **Step 1: Flip `ready: false` to `ready: true` for the `evolution` entry in `src/pages/QuizHub.jsx`'s `MODES` array**

In `src/pages/QuizHub.jsx`, change:
```js
  { key: "evolution", icon: ShuffleIcon, title: "진화 순서 맞추기", desc: "진화 전후 순서 배열", ready: false },
```
to:
```js
  { key: "evolution", icon: ShuffleIcon, title: "진화 순서 맞추기", desc: "진화 전후 순서 배열", ready: true },
```
(No other line in the file changes.)

- [ ] **Step 2: Add a render-test assertion in `src/pages/QuizHub.test.jsx`**

Replace the full contents of `src/pages/QuizHub.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuizHub from "./QuizHub";

describe("QuizHub", () => {
  it("구현된 퀴즈 모드로 가는 링크를 활성화해서 보여준다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    const silhouetteLink = screen.getByRole("link", { name: /실루엣 퀴즈/ });
    expect(silhouetteLink).toHaveAttribute("href", "/quiz/silhouette");

    const chosungLink = screen.getByRole("link", { name: /초성 퀴즈/ });
    expect(chosungLink).toHaveAttribute("href", "/quiz/chosung");

    const evolutionLink = screen.getByRole("link", { name: /진화 순서 맞추기/ });
    expect(evolutionLink).toHaveAttribute("href", "/quiz/evolution");
  });

  it("준비중인 모드는 '준비중' 표시를 보여준다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    expect(screen.getAllByText("준비중").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Add the `/quiz/evolution` route to `src/App.jsx`**

Replace the full contents of `src/App.jsx`:

```jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dex from "./pages/Dex";
import PokemonDetail from "./pages/PokemonDetail";
import QuizHub from "./pages/QuizHub";
import SilhouetteQuiz from "./pages/SilhouetteQuiz";
import ChosungQuiz from "./pages/ChosungQuiz";
import CryQuiz from "./pages/CryQuiz";
import EvolutionQuiz from "./pages/EvolutionQuiz";
import ChooseStarter from "./pages/ChooseStarter";
import MyPokemon from "./pages/MyPokemon";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dex" element={<Dex />} />
      <Route path="/pokemon/:id" element={<PokemonDetail />} />
      <Route path="/quiz" element={<QuizHub />} />
      <Route path="/quiz/silhouette" element={<SilhouetteQuiz />} />
      <Route path="/quiz/chosung" element={<ChosungQuiz />} />
      <Route path="/quiz/cry" element={<CryQuiz />} />
      <Route path="/quiz/evolution" element={<EvolutionQuiz />} />
      <Route path="/mine/choose" element={<ChooseStarter />} />
      <Route path="/mine" element={<MyPokemon />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests green, including the new `evolutionLink` assertion in `QuizHub.test.jsx`, all of `myPokemon.test.js` (Task 1), and `evolutionQuizChain.test.js` (Task 7).

- [ ] **Step 5: Manual end-to-end verification**

Run: `npm run dev`. From `/quiz`, confirm "진화 순서 맞추기" is no longer greyed out/labelled "준비중" and navigates to `/quiz/evolution`. Play through a full loop: choose a starter at `/mine/choose`, answer enough quiz questions across all four modes to cross 200 points, confirm no celebration appears mid-quiz, then visit `/` and confirm the evolution reveal (or branch picker, if the starter's family branches) plays exactly once.

- [ ] **Step 6: Commit**

```bash
git add src/pages/QuizHub.jsx src/pages/QuizHub.test.jsx src/App.jsx
git commit -m "feat: enable evolution-order quiz mode and wire its route"
```

---

## Self-Review

**1. Spec coverage (mapped to the 5 concrete-scope items in the task brief):**
- Item 1 (`myPokemon.js`: `EVOLUTION_THRESHOLD`, `addPoints` with carry-over + branch-vs-auto distinction, `resolveBranchEvolution`, `graduateAndRestart`, full unit tests) → Task 1. ✓
- Item 2 (wire point accrual into the 3 existing quiz pages, shared logic factored out) → Task 2 (hook) + Task 3 (wiring). ✓ Decision made explicit: quiz pages fire-and-forget `addPoints`; branch resolution happens entirely on Home, never mid-quiz.
- Item 3 (Home celebration: reveal + branch picker, persisted-field reconciliation with Task 1, CSS respecting reduced motion) → Task 4 (CSS) + Task 5 (Home). ✓
- Item 4 (MyPokemon.jsx graduation buttons) → Task 6. ✓
- Mid-plan addition — Home progress bar ("다음 포켓몬으로 진화는 얼마나 남았는지") → Task 5. ✓
- Mid-plan addition — always-available "내 포켓몬 다시 선택" → Task 1 (`resetMyPokemon`) + Task 6 (UI + confirm step). ✓
- Item 5 (EvolutionQuiz.jsx + QuizHub wiring, deterministic branching strategy) → Task 7 (pure logic) + Task 8 (page) + Task 9 (wiring). ✓
- "What NOT to do" (Phase 2/3 items, dex-view points, multi-device sync) → not present anywhere in this plan. ✓

**2. Placeholder scan:** No "TBD"/"TODO"/"similar to Task N, adjust as needed" left unresolved in any code block — every file that's touched shows its complete new contents (or, for the two near-duplicate quiz pages in Task 3 where showing three near-identical ~230-line files in full would be pure repetition, the *exact* diff lines are spelled out character-for-character, not paraphrased).

**3. Type/signature consistency across tasks:**
- `addPoints(points, currentStagePokemon)` (Task 1) is called identically in Task 2's hook: `addPoints(points, currentStagePokemon)` where `currentStagePokemon` comes from `all.find((p) => p.id === record.currentStageId)` on the unfiltered dataset — matches the "full entry with `.evolvesTo`" contract. ✓
- `addPoints`'s return shape (`{evolved, branchChoicePending, newStageId, pointsSinceLastEvolution}` or `null`) is only consumed inside `myPokemon.test.js` directly; the hook and quiz pages intentionally ignore the return value (per spec: no mid-quiz display), consistent with the task brief's own resolution of that open question. ✓
- `resolveBranchEvolution(chosenId)` (Task 1) is called as `resolveBranchEvolution(id)` in Task 5 with `id` sourced from `mine.pendingBranchChoices[i].id` — same numeric id type throughout. ✓
- `pendingBranchChoices` field name and shape (`Array<{id, minLevel}> | null`) is identical between Task 1's `myPokemon.js` and Task 5's `Home.jsx` reads (`mine.pendingBranchChoices`). ✓
- `pickEvolutionQuizChain(allPokemon)` (Task 7) returns `Array<pokemon> | null`; Task 8 checks for `null` before using it (retry loop) and otherwise indexes `chain[0]`/`chain.map(p => p.id)` consistently with the array-of-full-pokemon-objects contract. ✓
- `EVOLUTION_THRESHOLD` is imported with the same name/casing in `myPokemon.js` (Task 1) and `Home.jsx` (Task 5) — no re-declaration of `200` anywhere else in the codebase. ✓

**4. Judgment calls flagged for human review:**
1. **Branch-evolution data-shape reconciliation (Task 1 ↔ Task 3):** resolved by making `pendingBranchChoices` a persisted field in the `pokemonMine.v1` record itself (not a hook-return-value), read by Home on a later visit. Confirm this matches intent — an alternative would have been a *separate* localStorage key just for "celebration queue," which was rejected as unnecessary indirection.
2. **Deterministic chain-picking for branching families (Task 7):** always walks `evolvesTo[0]`, so Eevee-family questions always resolve to the same one branch (whichever is first in `public/data/pokemon.json`'s evolution-chain data, currently Vaporeon). The alternative (exclude any chain with a branch node from the candidate pool) was considered and rejected. Please confirm this doesn't feel like a "hidden" bug to the human user testing an Eevee-chain question — the wrong Eevee evolution artwork will never be shown to distinguish, only ever Vaporeon.
3. **`useAwardPoints()` does its own `loadPokemonData()` call rather than accepting the quiz page's already-loaded `all` array** (deviation from the task brief's literal suggestion of "these pages already load `all`, so this is a find-by-id, not a new fetch"). Justification: three of the four quiz pages apply `applyGen1OnlyFilter` to their `all` state, which could omit the player's actual current-stage Pokémon if they toggle the 1세대-only filter after starting with a non-gen1 Pokémon, silently dropping point awards. Calling `loadPokemonData()` again is free (module-level cache in `pokemonData.js`), so this avoids the bug at negligible cost. Flagging in case the human prefers the literal brief's approach for simplicity despite the edge case.
4. **No dedicated test file for `useAwardPoints()`** (Task 2) — its only real logic (`getMyPokemon`/`addPoints` interplay) is already fully covered by `myPokemon.test.js`; testing the hook itself would require introducing a new `fetch`-mocking convention not currently used anywhere in this codebase's tests. Flagging as a deliberate scope-limiting decision, not an oversight.
5. **Home progress bar (spec line 119) added in Task 5** even though it wasn't one of the task brief's five numbered scope bullets — it's the natural completion of the foundation plan's explicit deferral ("no progress bar... since point accrual doesn't exist in this slice") now that point accrual exists. Flagging in case the human wants this split into a separate, later task instead.
6. **Reveal animation design simplified to a static side-by-side "before → after" panel** (both images animate in immediately via Task 4's CSS) rather than a timed cross-fade sequence requiring JS-driven delays. This sidesteps needing a `prefers-reduced-motion` check inside JS (for skipping a timed delay) since there's no delay to skip — the CSS `no-preference` media query alone fully governs the animated variant.
7. **`graduateAndRestart()` doesn't itself re-verify `evolvesTo.length === 0`** — it trusts that `MyPokemon.jsx` only renders the button when the current stage is truly final. This mirrors the existing codebase's general pattern of pushing "is this action currently valid" checks to the calling UI rather than every storage function.
8. **Reset-order button in `EvolutionQuiz.jsx`** (Task 8) is a small UX addition beyond the literal spec text (spec only describes the tap-to-accumulate-then-auto-grade flow, not an undo). Included because auto-grading on the last tap with no chance to correct an early misclick seemed harsh for a kids' app and conflicts with the spec's own "실패해도 벌칙이 없다" principle; flagging in case the human prefers stricter spec literalism here.
9a. **`resetMyPokemon()` kept as a separate function from `graduateAndRestart()`** rather than relaxing `graduateAndRestart`'s precondition to fire from any evolution stage. The distinction: `collection` is meant to be a gallery of pokemon that were actually raised to their final form, so an abandoned unfinished pokemon should not appear there. Please confirm this reading of "collection" is right — the alternative (one function, always adds to collection regardless of stage) is a one-line change to `resetMyPokemon`'s body if the human prefers a simpler unified model instead.
9b. **The "다른 포켓몬 고르기" confirm step is in-app state (`confirmingReset`), not a native `confirm()` dialog** — consistent with this codebase never using native browser dialogs anywhere else, but means the confirm panel's copy/styling is bespoke rather than reusing a system pattern. Flagging only because this is a new UI pattern in the app (first "destructive action" confirmation), not because it's risky.

9. **Multiple threshold crossings before a Home visit:** if a player answers enough questions to trigger two evolutions before ever reopening Home, only the last transition (`history[-2]` → `history[-1]`) is animated — the intermediate stage is skipped visually (though still recorded in `history`). This satisfies the spec's "1회 재생" (play once) requirement but means an intermediate form is never celebrated. Flagging as an accepted trade-off rather than an oversight.

### Critical Files for Implementation
- src/utils/myPokemon.js
- src/hooks/useMyPokemonPoints.js
- src/pages/Home.jsx
- src/utils/evolutionQuizChain.js
- src/pages/EvolutionQuiz.jsx