# 포켓몬 키우기 (PokemonCare) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다마고치 방식으로 "내 포켓몬"(기존 진화 시스템의 `currentStageId`)을 매일 돌보는 기능 — 배고픔/행복도/피로도 상태와 밥주기/놀아주기/재우기(1일 1회) 액션을 추가한다.

**Architecture:** 백그라운드 타이머 없이, 상태를 읽을 때(`getCareState`) `lastTickAt` 이후 경과 시간만큼 순수 함수로 깎아 계산하고 그 결과를 저장한다 — `myPokemon.js`와 동일한 "순수 함수 + localStorage 방어" 패턴. 진화 시스템 데이터는 읽기 전용으로만 참조하고 수정하지 않는다.

**Tech Stack:** React 19, react-router-dom 7, vitest + @testing-library/react.

**선행 조건:** `docs/superpowers/plans/2026-08-07-daily-pokemon.md`가 먼저 적용되어 있어야 한다(`/more` 페이지, 하단 네비 "더보기" 탭).

## Global Constraints

- 기존 진화 시스템(`src/utils/myPokemon.js`)은 절대 수정하지 않는다 — `getMyPokemon()`만 읽기 전용으로 호출한다.
- `localStorage`/`sessionStorage` 접근은 항상 try/catch로 감싼다.
- 돌봄 대상은 항상 `getMyPokemon().currentStageId` — 별도 선택 UI 없음. 내 포켓몬이 없으면 `/mine/choose`로 안내한다.
- 하락률(시간당): 배고픔 -2, 행복 -1, 피로 +1. 각 필드 0~100 클램프.
- 액션: 밥주기(배고픔 +30), 놀아주기(행복 +25, 피로 +15), 재우기(피로 -40) — 각 1일 1회.
- 이모지 대신 CSS 필터/텍스트로 표정을 표현한다.
- 한글 UI.

---

### Task 1: `pokemonCare.js` — 상태 계산 + 액션

**Files:**
- Create: `src/utils/pokemonCare.js`
- Test: `src/utils/pokemonCare.test.js`

**Interfaces:**
- Produces:
  - `getCareState(now = new Date()): { hunger, happiness, fatigue, lastFedDate, lastPlayedDate, lastSleptDate, lastTickAt }` — 읽을 때마다 경과 시간만큼 하락 적용 후 저장.
  - `feed(now = new Date())`, `play(now = new Date())`, `sleep(now = new Date())` — 각각 상태를 갱신해 반환. 오늘 이미 했으면 하락만 반영된 상태를 그대로 반환(추가 보너스 없음).
  - `canFeedToday(now = new Date()): boolean`, `canPlayToday(now = new Date()): boolean`, `canSleepToday(now = new Date()): boolean`
  - `getMoodLevel(state): "happy"|"normal"|"tired"|"grumpy"`
  - `MOOD_LABEL_KO: Record<string,string>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/pokemonCare.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCareState,
  feed,
  play,
  sleep,
  canFeedToday,
  canPlayToday,
  canSleepToday,
  getMoodLevel,
} from "./pokemonCare";

beforeEach(() => {
  localStorage.clear();
});

describe("getCareState", () => {
  it("첫 호출이면 기본값(배고픔80/행복80/피로20)으로 초기화한다", () => {
    const state = getCareState(new Date("2026-08-07T09:00:00.000Z"));
    expect(state.hunger).toBe(80);
    expect(state.happiness).toBe(80);
    expect(state.fatigue).toBe(20);
  });

  it("경과 시간(시간 단위)만큼 배고픔/행복은 깎이고 피로는 오른다", () => {
    getCareState(new Date("2026-08-07T09:00:00.000Z"));
    const state = getCareState(new Date("2026-08-07T19:00:00.000Z")); // 10시간 경과
    expect(state.hunger).toBe(60); // 80 - 10*2
    expect(state.happiness).toBe(70); // 80 - 10*1
    expect(state.fatigue).toBe(30); // 20 + 10*1
  });

  it("0~100 범위를 벗어나지 않는다(클램프)", () => {
    getCareState(new Date("2026-08-07T09:00:00.000Z"));
    const state = getCareState(new Date("2026-08-10T09:00:00.000Z")); // 72시간 경과
    expect(state.hunger).toBe(0);
    expect(state.happiness).toBe(0);
    expect(state.fatigue).toBe(100);
  });

  it("localStorage 접근이 실패해도 예외를 던지지 않는다", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => getCareState()).not.toThrow();
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});

describe("액션 (1일 1회 제한)", () => {
  it("feed()는 배고픔을 30 올리고, 같은 시각(같은 날) 두 번째 호출은 추가로 올리지 않는다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    const first = feed(now);
    expect(first.hunger).toBe(100); // clamp(80+30)
    const second = feed(now);
    expect(second.hunger).toBe(100); // 오늘 두 번째 호출은 무시
  });

  it("play()는 행복 +25, 피로 +15를 적용한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    const result = play(now);
    expect(result.happiness).toBe(100); // clamp(80+25)
    expect(result.fatigue).toBe(35); // 20+15
  });

  it("sleep()은 피로 -40을 적용한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    const result = sleep(now);
    expect(result.fatigue).toBe(0); // clamp(20-40)
  });

  it("canFeedToday/canPlayToday/canSleepToday는 오늘 이미 했으면 false를 반환한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    expect(canFeedToday(now)).toBe(true);
    feed(now);
    expect(canFeedToday(now)).toBe(false);
    expect(canPlayToday(now)).toBe(true);
    expect(canSleepToday(now)).toBe(true);
  });

  it("날짜가 바뀌면 다시 액션을 할 수 있다", () => {
    const day1 = new Date("2026-08-07T09:00:00.000Z");
    getCareState(day1);
    feed(day1);
    expect(canFeedToday(day1)).toBe(false);

    const day2 = new Date("2026-08-08T09:00:00.000Z");
    expect(canFeedToday(day2)).toBe(true);
  });
});

describe("getMoodLevel", () => {
  it("종합 점수 70 이상이면 happy다", () => {
    expect(getMoodLevel({ hunger: 90, happiness: 90, fatigue: 10 })).toBe("happy");
  });
  it("종합 점수 40~69면 normal이다", () => {
    expect(getMoodLevel({ hunger: 50, happiness: 50, fatigue: 50 })).toBe("normal");
  });
  it("종합 점수 20~39면 tired다", () => {
    expect(getMoodLevel({ hunger: 30, happiness: 20, fatigue: 70 })).toBe("tired");
  });
  it("종합 점수 20 미만이면 grumpy다", () => {
    expect(getMoodLevel({ hunger: 5, happiness: 5, fatigue: 95 })).toBe("grumpy");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/pokemonCare.test.js`
Expected: FAIL — `Failed to resolve import "./pokemonCare"`

- [ ] **Step 3: 구현**

`src/utils/pokemonCare.js`:

```js
// "내 포켓몬"을 매일 돌보는 다마고치형 상태 시스템. myPokemon.js(진화 시스템)와
// 완전히 별개의 localStorage 레코드로 관리하며, currentStageId만 읽기 전용으로 참조한다.
// 백그라운드 타이머 없이, 상태를 읽는 시점(getCareState)에 lastTickAt부터 지금까지
// 경과한 시간만큼 순수 함수로 깎아 계산한다.

const KEY = "pokemonCare.v1";

const HOURLY_HUNGER_DECAY = 2;
const HOURLY_HAPPINESS_DECAY = 1;
const HOURLY_FATIGUE_GROWTH = 1;

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function todayDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readRecord() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
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

function defaultRecord(now) {
  return {
    hunger: 80,
    happiness: 80,
    fatigue: 20,
    lastFedDate: null,
    lastPlayedDate: null,
    lastSleptDate: null,
    lastTickAt: now.toISOString(),
  };
}

function applyDecay(record, now) {
  const last = new Date(record.lastTickAt);
  const hours = Math.max(0, (now.getTime() - last.getTime()) / 3_600_000);
  return {
    ...record,
    hunger: clamp(record.hunger - hours * HOURLY_HUNGER_DECAY),
    happiness: clamp(record.happiness - hours * HOURLY_HAPPINESS_DECAY),
    fatigue: clamp(record.fatigue + hours * HOURLY_FATIGUE_GROWTH),
    lastTickAt: now.toISOString(),
  };
}

export function getCareState(now = new Date()) {
  const existing = readRecord();
  const base = existing || defaultRecord(now);
  return writeRecord(applyDecay(base, now));
}

function runActionOncePerDay(dateField, now, apply) {
  const state = getCareState(now);
  if (state[dateField] === todayDateString(now)) return state; // 오늘 이미 함
  return writeRecord({ ...apply(state), [dateField]: todayDateString(now) });
}

export function feed(now = new Date()) {
  return runActionOncePerDay("lastFedDate", now, (state) => ({
    ...state,
    hunger: clamp(state.hunger + 30),
  }));
}

export function play(now = new Date()) {
  return runActionOncePerDay("lastPlayedDate", now, (state) => ({
    ...state,
    happiness: clamp(state.happiness + 25),
    fatigue: clamp(state.fatigue + 15),
  }));
}

export function sleep(now = new Date()) {
  return runActionOncePerDay("lastSleptDate", now, (state) => ({
    ...state,
    fatigue: clamp(state.fatigue - 40),
  }));
}

export function canFeedToday(now = new Date()) {
  return getCareState(now).lastFedDate !== todayDateString(now);
}

export function canPlayToday(now = new Date()) {
  return getCareState(now).lastPlayedDate !== todayDateString(now);
}

export function canSleepToday(now = new Date()) {
  return getCareState(now).lastSleptDate !== todayDateString(now);
}

export const MOOD_LABEL_KO = {
  happy: "기분이 좋아 보여요",
  normal: "심심한가 봐요",
  tired: "많이 지쳤어요",
  grumpy: "삐쳤어요",
};

export function getMoodLevel(state) {
  const score = (state.hunger + state.happiness + (100 - state.fatigue)) / 3;
  if (score >= 70) return "happy";
  if (score >= 40) return "normal";
  if (score >= 20) return "tired";
  return "grumpy";
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/pokemonCare.test.js`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/pokemonCare.js src/utils/pokemonCare.test.js
git commit -m "feat: add tamagotchi-style pokemon care state and actions"
```

---

### Task 2: `/care` 포켓몬 키우기 페이지

**Files:**
- Create: `src/pages/PokemonCare.jsx`
- Create: `src/pages/PokemonCare.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/MoreMenu.jsx`
- Modify: `src/pages/MoreMenu.test.jsx`

**Interfaces:**
- Consumes: `getMyPokemon` (기존 `src/utils/myPokemon.js`, 읽기 전용), `loadPokemonData` (기존), `getCareState`/`feed`/`play`/`sleep`/`canFeedToday`/`canPlayToday`/`canSleepToday`/`getMoodLevel`/`MOOD_LABEL_KO` (Task 1).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/PokemonCare.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PokemonCare from "./PokemonCare";
import { chooseStarter } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  artwork: "https://example.com/25.png",
  evolvesTo: [{ id: 26, minLevel: null }],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("PokemonCare", () => {
  it("내 포켓몬이 없으면 안내와 고르러 가기 링크를 보여준다", async () => {
    render(
      <MemoryRouter>
        <PokemonCare />
      </MemoryRouter>
    );
    expect(await screen.findByText(/아직 내 포켓몬이 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "포켓몬 고르러 가기" })).toHaveAttribute(
      "href",
      "/mine/choose"
    );
  });

  it("내 포켓몬이 있으면 이름과 게이지, 액션 버튼을 보여준다", async () => {
    chooseStarter(pikachu, "번개");
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <PokemonCare />
      </MemoryRouter>
    );
    expect(await screen.findByText("번개")).toBeInTheDocument();
    expect(screen.getByText("배고픔")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "밥주기" })).toBeInTheDocument();
  });

  it("밥주기를 누르면 버튼이 '(내일)' 안내로 바뀌고 비활성화된다", async () => {
    chooseStarter(pikachu, "번개");
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <PokemonCare />
      </MemoryRouter>
    );
    const feedBtn = await screen.findByRole("button", { name: "밥주기" });
    fireEvent.click(feedBtn);
    expect(await screen.findByRole("button", { name: "밥주기 (내일)" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/pages/PokemonCare.test.jsx`
Expected: FAIL — `Failed to resolve import "./PokemonCare"`

- [ ] **Step 3: 구현**

`src/pages/PokemonCare.jsx`:

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getMyPokemon } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";
import {
  getCareState,
  feed,
  play,
  sleep,
  canFeedToday,
  canPlayToday,
  canSleepToday,
  getMoodLevel,
  MOOD_LABEL_KO,
} from "../utils/pokemonCare";

const GRUMPY_TOAST_KEY = "pokemonCare.grumpyToastShown.v1";

const MOOD_FILTER = {
  happy: "none",
  normal: "saturate(0.9)",
  tired: "saturate(0.6) brightness(0.9)",
  grumpy: "saturate(0.4) brightness(0.8)",
};

function Gauge({ label, value }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
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
            width: `${value}%`,
            background: "var(--color-accent)",
            borderRadius: "var(--radius-pill)",
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? undefined : "press"}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: "var(--radius-md)",
        border: "none",
        background: disabled ? "var(--color-surface-2)" : "var(--color-primary)",
        color: disabled ? "var(--color-text-muted)" : "var(--color-text-on-primary)",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {disabled ? `${label} (내일)` : label}
    </button>
  );
}

export default function PokemonCare() {
  const [mine, setMine] = useState(undefined);
  const [pokemon, setPokemon] = useState(null);
  const [state, setState] = useState(null);
  const [showGrumpyToast, setShowGrumpyToast] = useState(false);

  useEffect(() => {
    const record = getMyPokemon();
    setMine(record);
    if (!record) return;
    loadPokemonData().then((all) => {
      setPokemon(all.find((p) => p.id === record.currentStageId) || null);
    });
    setState(getCareState());
  }, []);

  const mood = state ? getMoodLevel(state) : null;

  useEffect(() => {
    if (mood !== "grumpy") return;
    let alreadyShown;
    try {
      alreadyShown = sessionStorage.getItem(GRUMPY_TOAST_KEY);
    } catch {
      alreadyShown = null;
    }
    if (alreadyShown) return;
    setShowGrumpyToast(true);
    try {
      sessionStorage.setItem(GRUMPY_TOAST_KEY, "1");
    } catch {
      // 세션 저장 불가 환경에서는 방문마다 다시 뜨는 정도로 허용
    }
  }, [mood]);

  if (mine === undefined) {
    return (
      <AppShell title="포켓몬 키우기" backTo="/more">
        <div className="skeleton" style={{ height: 260 }} />
      </AppShell>
    );
  }

  if (!mine) {
    return (
      <AppShell title="포켓몬 키우기" backTo="/more">
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-4)" }}>
          아직 내 포켓몬이 없어요. 먼저 포켓몬을 골라주세요.
        </p>
        <Link
          to="/mine/choose"
          className="press"
          style={{
            display: "inline-block",
            marginTop: "var(--space-3)",
            padding: "12px 20px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary)",
            color: "var(--color-text-on-primary)",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          포켓몬 고르러 가기
        </Link>
      </AppShell>
    );
  }

  function handleAction(actionFn) {
    setState(actionFn());
  }

  return (
    <AppShell title="포켓몬 키우기" backTo="/more">
      <div style={{ textAlign: "center" }}>
        {pokemon && (
          <img
            src={pokemon.artwork}
            alt={mine.nickname}
            style={{ width: 160, height: 160, filter: mood ? MOOD_FILTER[mood] : "none" }}
          />
        )}
        <h2 style={{ fontSize: 22, marginTop: 8 }}>{mine.nickname}</h2>
        {mood && (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{MOOD_LABEL_KO[mood]}</p>
        )}

        {showGrumpyToast && (
          <div
            style={{
              display: "inline-flex",
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1.5px solid var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 14%, var(--color-surface))",
              color: "var(--color-text)",
              fontWeight: 700,
              fontSize: 13,
              margin: "var(--space-2) 0",
            }}
          >
            {mine.nickname}가 삐쳤어요! 돌봐주세요
          </div>
        )}

        {state && (
          <div style={{ textAlign: "left", marginTop: "var(--space-4)" }}>
            <Gauge label="배고픔" value={state.hunger} />
            <Gauge label="행복도" value={state.happiness} />
            <Gauge label="피로도" value={state.fatigue} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "var(--space-5)" }}>
          <ActionButton label="밥주기" disabled={!canFeedToday()} onClick={() => handleAction(feed)} />
          <ActionButton label="놀아주기" disabled={!canPlayToday()} onClick={() => handleAction(play)} />
          <ActionButton label="재우기" disabled={!canSleepToday()} onClick={() => handleAction(sleep)} />
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/pages/PokemonCare.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 라우트 등록**

`src/App.jsx`에 import 추가:

```jsx
import PokemonCare from "./pages/PokemonCare";
```

`/collection` 라우트 다음 줄에 추가:

```jsx
      <Route path="/care" element={<PokemonCare />} />
```

- [ ] **Step 6: MoreMenu에서 포켓몬 키우기 활성화**

`src/pages/MoreMenu.jsx`의 `MODES` 배열에서 `care` 항목의 `ready: false`를 `ready: true`로 변경.

`src/pages/MoreMenu.test.jsx`의 두 번째 테스트에서 대상을 `/포켓몬 키우기/`에서 `/일일 미션/`으로 변경(포켓몬 키우기는 이제 구현됐으므로):

```jsx
  it("아직 구현 안 된 기능은 '준비중'으로 표시되고 링크가 비활성화된다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /일일 미션/ });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("준비중").length).toBeGreaterThan(0);
  });
```

- [ ] **Step 7: 관련 테스트 통과 확인**

Run: `npx vitest run src/pages/MoreMenu.test.jsx src/pages/PokemonCare.test.jsx`
Expected: PASS

- [ ] **Step 8: 개발 서버에서 실제 확인**

Run: `npm run dev`, `/care`에서 내 포켓몬이 없을 때 안내가 뜨는지, 있을 때 게이지/버튼이 정상 동작하는지(밥주기 누르면 배고픔 게이지가 오르고 버튼이 "(내일)"로 바뀌는지) 확인. `getCareState`가 시간 경과에 반응하는지 보려면 브라우저 콘솔에서 `localStorage.setItem("pokemonCare.v1", JSON.stringify({...JSON.parse(localStorage.getItem("pokemonCare.v1")), lastTickAt: new Date(Date.now() - 36e5*20).toISOString()}))` 후 새로고침해 게이지가 낮아졌는지로 대신 확인 가능.

- [ ] **Step 9: 전체 테스트 스위트**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 10: Commit**

```bash
git add src/pages/PokemonCare.jsx src/pages/PokemonCare.test.jsx src/App.jsx src/pages/MoreMenu.jsx src/pages/MoreMenu.test.jsx
git commit -m "feat: add pokemon care (tamagotchi) page"
```
