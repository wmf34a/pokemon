# 오늘의 포켓몬 + 신규 기능 진입점(더보기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매일 자정 기준으로 결정적으로 뽑히는 "오늘의 포켓몬" 기능을 추가하고, 앞으로 나올 카드수집/키우기/일일미션까지 함께 진입할 하단 네비 "더보기" 탭 + `/more` 페이지를 만든다.

**Architecture:** 기존 `myPokemon.js` 패턴(순수 함수 + localStorage 방어 코드)을 그대로 따르는 `src/utils/dailyPokemon.js`를 만들고, 날짜 문자열을 시드로 한 결정적 PRNG로 인덱스를 뽑는다. `/more`는 `QuizHub.jsx`의 `MODES` 카드 그리드 패턴을 재사용해 신규 기능 4개(오늘의 포켓몬만 `ready: true`, 나머지는 `ready: false`로 "준비중" 표시 — 후속 계획들이 각자 뒤집는다)를 나열한다.

**Tech Stack:** React 19, react-router-dom 7, vitest + @testing-library/react, 기존 CSS 변수 토큰(`src/index.css`, `src/styles/tokens.js`).

## Global Constraints

- 기존 진화 시스템(`src/utils/myPokemon.js`)은 절대 수정하지 않는다.
- `localStorage` 접근은 항상 try/catch로 감싸 실패 시 조용히 기본값으로 폴백한다(시크릿 모드 등).
- 이모지 아이콘 대신 `src/components/Icons.jsx`의 손그림 SVG 패턴을 따른다.
- 색상/여백/반경은 `src/index.css`의 CSS 변수만 사용, 하드코딩 금지.
- 오늘의 포켓몬 풀은 `pokemonQuiz.gen1Only` 설정을 무시하고 항상 전체 포켓몬 데이터셋에서 뽑는다.
- 한글 UI.

---

### Task 1: 신규 네비게이션 아이콘 추가

**Files:**
- Modify: `src/components/Icons.jsx` (파일 끝에 추가)

**Interfaces:**
- Produces: `CalendarIcon`, `LayersIcon`, `HeartIcon`, `ClipboardCheckIcon`, `GridIcon` — 모두 기존 아이콘과 동일하게 `(props) => <Base {...props}>...</Base>` 시그니처, `size`/`strokeWidth` prop을 받는다.

기존 아이콘들처럼 테스트 파일이 없다(`Icons.jsx`는 순수 프레젠테이션, 프로젝트 관례상 테스트 대상 아님).

- [ ] **Step 1: 아이콘 5개 추가**

`src/components/Icons.jsx` 맨 끝(231번째 줄, `SparklesIcon` 다음)에 추가:

```jsx
export function CalendarIcon(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function LayersIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 3.5 4 8l8 4.5L20 8z" />
      <path d="M4 12.5 12 17l8-4.5M4 16.5 12 21l8-4.5" />
    </Base>
  );
}

export function HeartIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 20.5 4.5 13a5 5 0 0 1 7.5-6.6 5 5 0 0 1 7.5 6.6z" />
    </Base>
  );
}

export function ClipboardCheckIcon(props) {
  return (
    <Base {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8.5 13 11 15.5 15.5 10" />
    </Base>
  );
}

export function GridIcon(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </Base>
  );
}
```

- [ ] **Step 2: 빌드로 문법 확인**

Run: `npm run lint`
Expected: 에러 없음 (새 아이콘 파일에 lint 위반 없어야 함)

- [ ] **Step 3: Commit**

```bash
git add src/components/Icons.jsx
git commit -m "feat: add icons for daily pokemon, cards, care, missions, more nav"
```

---

### Task 2: 하단 네비 "더보기" 탭 추가

**Files:**
- Modify: `src/components/AppShell.jsx:1-9`

**Interfaces:**
- Consumes: `GridIcon` from Task 1.
- Produces: `/more` 경로에 대한 활성 탭 매칭. 이후 Task들이 만들 `/daily`, `/collection`, `/care`, `/missions` 경로도 전부 "더보기" 탭을 활성 상태로 표시해야 한다.

- [ ] **Step 1: import에 GridIcon 추가, NAV_ITEMS에 항목 추가**

`src/components/AppShell.jsx`의 1~9번째 줄을 다음으로 교체:

```jsx
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeftIcon, HomeIcon, BookIcon, GamepadIcon, GridIcon } from "./Icons";
import InstallBanner from "./InstallBanner";

const NAV_ITEMS = [
  { to: "/", label: "홈", icon: HomeIcon, match: (p) => p === "/" },
  { to: "/dex", label: "도감", icon: BookIcon, match: (p) => p.startsWith("/dex") || p.startsWith("/pokemon") },
  { to: "/quiz", label: "퀴즈", icon: GamepadIcon, match: (p) => p.startsWith("/quiz") },
  {
    to: "/more",
    label: "더보기",
    icon: GridIcon,
    match: (p) =>
      p.startsWith("/more") ||
      p.startsWith("/daily") ||
      p.startsWith("/collection") ||
      p.startsWith("/care") ||
      p.startsWith("/missions"),
  },
];
```

- [ ] **Step 2: 개발 서버로 육안 확인**

Run: `npm run dev` (백그라운드로 띄운 뒤 브라우저에서 확인)
Expected: 하단 네비가 4탭(홈/도감/퀴즈/더보기)으로 보이고, 라벨이 잘리거나 겹치지 않는다. `/more`는 아직 라우트가 없어 빈 화면이어도 이 단계에서는 정상(Task 3에서 만듦).

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.jsx
git commit -m "feat: add more tab to bottom nav"
```

---

### Task 3: 더보기 메뉴 페이지 (`/more`)

**Files:**
- Create: `src/pages/MoreMenu.jsx`
- Create: `src/pages/MoreMenu.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `MoreMenu.jsx`가 export하는 `MODES` 배열의 각 항목 `{ key, icon, title, desc, to, ready }` — Task 6(오늘의 포켓몬)과 이후 카드수집/키우기/일일미션 계획들이 자기 항목의 `ready`를 `true`로 뒤집는다. `key` 값은 `"daily" | "collection" | "care" | "missions"`로 고정(다른 계획서가 이 이름으로 찾아 수정함).

`QuizHub.jsx`의 `MODES` 카드 그리드 + `ready`(준비중) 패턴을 그대로 재사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/MoreMenu.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MoreMenu from "./MoreMenu";

describe("MoreMenu", () => {
  it("오늘의 포켓몬 링크는 활성화되어 있다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /오늘의 포켓몬/ });
    expect(link).toHaveAttribute("href", "/daily");
  });

  it("아직 구현 안 된 기능은 '준비중'으로 표시되고 링크가 비활성화된다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /카드 수집/ });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("준비중").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/pages/MoreMenu.test.jsx`
Expected: FAIL — `Failed to resolve import "./MoreMenu"`

- [ ] **Step 3: MoreMenu.jsx 구현**

`src/pages/MoreMenu.jsx`:

```jsx
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { CalendarIcon, LayersIcon, HeartIcon, ClipboardCheckIcon } from "../components/Icons";

export const MODES = [
  { key: "daily", icon: CalendarIcon, title: "오늘의 포켓몬", desc: "매일 새로운 포켓몬을 만나보세요", to: "/daily", ready: true },
  { key: "collection", icon: LayersIcon, title: "카드 수집", desc: "퀴즈를 풀고 카드를 모아보세요", to: "/collection", ready: false },
  { key: "care", icon: HeartIcon, title: "포켓몬 키우기", desc: "매일 돌보며 애착을 키워요", to: "/care", ready: false },
  { key: "missions", icon: ClipboardCheckIcon, title: "일일 미션", desc: "오늘의 습관을 완료하고 카드 받기", to: "/missions", ready: false },
];

export default function MoreMenu() {
  return (
    <AppShell title="더보기" backTo="/">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {MODES.map(({ key, icon: Icon, title, desc, to, ready }) => (
          <Link
            key={key}
            to={ready ? to : "#"}
            onClick={(e) => !ready && e.preventDefault()}
            aria-disabled={!ready}
            tabIndex={ready ? 0 : -1}
            className={ready ? "press" : undefined}
            style={{
              padding: "var(--space-4)",
              minHeight: 130,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
              color: "var(--color-text)",
              background: ready ? "var(--color-surface)" : "var(--color-surface-2)",
              boxShadow: ready ? "var(--shadow-card)" : "none",
              opacity: ready ? 1 : 0.6,
              cursor: ready ? "pointer" : "default",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: ready
                  ? "color-mix(in srgb, var(--color-accent) 30%, transparent)"
                  : "var(--color-border)",
                color: ready ? "var(--color-accent-ink)" : "var(--color-text-muted)",
              }}
            >
              <Icon size={20} />
            </div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{desc}</div>
            {!ready && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
                준비중
              </div>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: 라우트 등록**

`src/App.jsx`에 import와 라우트 추가:

```jsx
import MoreMenu from "./pages/MoreMenu";
```

`<Route path="/mine" element={<MyPokemon />} />` 다음 줄에 추가:

```jsx
      <Route path="/more" element={<MoreMenu />} />
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/pages/MoreMenu.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/pages/MoreMenu.jsx src/pages/MoreMenu.test.jsx src/App.jsx
git commit -m "feat: add more menu entry page for upcoming features"
```

---

### Task 4: `dailyPokemon.js` — 날짜 시드 기반 오늘의 포켓몬 선정

**Files:**
- Create: `src/utils/dailyPokemon.js`
- Test: `src/utils/dailyPokemon.test.js`

**Interfaces:**
- Produces:
  - `getTodayDateString(date = new Date()): string` — `"YYYY-MM-DD"`, 로컬 타임존 기준.
  - `getDailyPokemonId(allPokemon: {id:number}[], today = getTodayDateString()): number|null` — `allPokemon`이 비어있으면 `null`. localStorage에 오늘 날짜로 저장된 값이 있으면 그대로, 없으면 새로 뽑아 저장.
- Consumes: 없음 (전체 포켓몬 배열은 호출부가 `loadPokemonData()`로 가져와 넘겨줌).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/dailyPokemon.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTodayDateString, getDailyPokemonId } from "./dailyPokemon";

const allPokemon = Array.from({ length: 151 }, (_, i) => ({ id: i + 1 }));

beforeEach(() => {
  localStorage.clear();
});

describe("getTodayDateString", () => {
  it("Date를 YYYY-MM-DD로 포맷한다", () => {
    const d = new Date(2026, 7, 7); // month is 0-indexed: 7 = August
    expect(getTodayDateString(d)).toBe("2026-08-07");
  });

  it("한 자리 월/일은 0으로 패딩한다", () => {
    const d = new Date(2026, 0, 5);
    expect(getTodayDateString(d)).toBe("2026-01-05");
  });
});

describe("getDailyPokemonId", () => {
  it("같은 날짜로 두 번 호출하면 같은 id를 반환한다(새로고침해도 유지)", () => {
    const first = getDailyPokemonId(allPokemon, "2026-08-07");
    const second = getDailyPokemonId(allPokemon, "2026-08-07");
    expect(second).toBe(first);
  });

  it("날짜가 바뀌면 저장된 값을 재계산한다", () => {
    const day1 = getDailyPokemonId(allPokemon, "2026-08-07");
    const raw = JSON.parse(localStorage.getItem("pokemonDaily.v1"));
    expect(raw.date).toBe("2026-08-07");
    expect(raw.pokemonId).toBe(day1);

    getDailyPokemonId(allPokemon, "2026-08-08");
    const raw2 = JSON.parse(localStorage.getItem("pokemonDaily.v1"));
    expect(raw2.date).toBe("2026-08-08");
  });

  it("같은 날짜 문자열이면 항상 같은 id를 결정적으로 계산한다(다른 인스턴스/재계산에도 동일)", () => {
    const a = getDailyPokemonId(allPokemon, "2026-08-07");
    localStorage.clear();
    const b = getDailyPokemonId(allPokemon, "2026-08-07");
    expect(a).toBe(b);
  });

  it("전체 포켓몬 목록이 비어있으면 null을 반환한다", () => {
    expect(getDailyPokemonId([], "2026-08-07")).toBeNull();
  });

  it("localStorage 접근이 실패해도 예외를 던지지 않고 id를 반환한다", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => getDailyPokemonId(allPokemon, "2026-08-07")).not.toThrow();
    spy.mockRestore();
    setSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/dailyPokemon.test.js`
Expected: FAIL — `Failed to resolve import "./dailyPokemon"`

- [ ] **Step 3: 구현**

`src/utils/dailyPokemon.js`:

```js
// 매일 자정(로컬 기준) 새로 뽑히는 "오늘의 포켓몬"을 결정하는 모듈.
// 날짜 문자열을 시드로 결정적 PRNG를 돌려서, 같은 날짜엔 항상 같은 인덱스가
// 나오게 한다 — 서버 없이도 모든 방문(새로고침 포함)에서 같은 결과를 재현하기 위함.
// localStorage 접근 실패(시크릿 모드 등)에도 조용히 기본 동작(매번 재계산)으로
// 폴백한다 — myPokemon.js와 동일한 방어 패턴.

const KEY = "pokemonDaily.v1";

export function getTodayDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

// mulberry32: 시드 하나로 재현 가능한 0~1 사이 의사난수를 만드는 간단한 PRNG.
function mulberry32(seed) {
  let t = seed;
  return function next() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function readRecord() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.pokemonId === "number" && typeof parsed.date === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writeRecord(record) {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // localStorage 접근 불가 환경에서는 조용히 무시
  }
  return record;
}

// allPokemon: pokemonData.js의 loadPokemonData() 결과(1세대 필터 없이 전체).
export function getDailyPokemonId(allPokemon, today = getTodayDateString()) {
  if (!allPokemon || allPokemon.length === 0) return null;

  const existing = readRecord();
  if (existing && existing.date === today) return existing.pokemonId;

  const rand = mulberry32(hashString(today));
  const index = Math.floor(rand() * allPokemon.length);
  const pokemonId = allPokemon[index].id;

  writeRecord({ date: today, pokemonId });
  return pokemonId;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/dailyPokemon.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/dailyPokemon.js src/utils/dailyPokemon.test.js
git commit -m "feat: add date-seeded daily pokemon selection"
```

---

### Task 5: `useDailyPokemon` 훅

**Files:**
- Create: `src/hooks/useDailyPokemon.js`
- Test: `src/hooks/useDailyPokemon.test.js`

**Interfaces:**
- Consumes: `getDailyPokemonId` (Task 4), `loadPokemonData` (`src/utils/pokemonData.js`, 기존).
- Produces: `useDailyPokemon(): Pokemon|null|undefined` — `undefined`는 로딩 전, `null`은 데이터셋이 비었거나 id를 찾지 못한 경우, 그 외엔 `public/data/pokemon.json` 항목 그대로.

`useMyPokemonPoints.test.js`의 `vi.mock("../utils/pokemonData", ...)` 패턴을 그대로 따른다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/hooks/useDailyPokemon.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDailyPokemon } from "./useDailyPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const bulbasaur = { id: 1, nameKo: "이상해씨" };
const pikachu = { id: 25, nameKo: "피카츄" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useDailyPokemon", () => {
  it("초기값은 undefined이고 데이터 로딩 후 오늘의 포켓몬 객체로 채워진다", async () => {
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);
    const { result } = renderHook(() => useDailyPokemon());

    expect(result.current).toBeUndefined();

    await waitFor(() => expect(result.current).not.toBeUndefined());
    expect([bulbasaur, pikachu]).toContainEqual(result.current);
  });

  it("전체 목록이 비어있으면 null을 반환한다", async () => {
    loadPokemonData.mockResolvedValue([]);
    const { result } = renderHook(() => useDailyPokemon());

    await waitFor(() => expect(result.current).toBeNull());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/hooks/useDailyPokemon.test.js`
Expected: FAIL — `Failed to resolve import "./useDailyPokemon"`

- [ ] **Step 3: 구현**

`src/hooks/useDailyPokemon.js`:

```js
import { useEffect, useState } from "react";
import { getDailyPokemonId } from "../utils/dailyPokemon";
import { loadPokemonData } from "../utils/pokemonData";

// undefined: 로딩 전, null: 데이터 없음/id 매칭 실패, 그 외: 포켓몬 객체
export function useDailyPokemon() {
  const [pokemon, setPokemon] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    loadPokemonData().then((all) => {
      if (cancelled) return;
      const id = getDailyPokemonId(all);
      const found = id === null ? null : all.find((p) => p.id === id) || null;
      setPokemon(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return pokemon;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/hooks/useDailyPokemon.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDailyPokemon.js src/hooks/useDailyPokemon.test.js
git commit -m "feat: add useDailyPokemon hook"
```

---

### Task 6: `/daily` 페이지 + 홈 화면 요약 카드

**Files:**
- Create: `src/pages/DailyPokemon.jsx`
- Create: `src/pages/DailyPokemon.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/MoreMenu.jsx:7` (`ready: false` → `ready: true`)
- Modify: `src/pages/MoreMenu.test.jsx` (준비중 테스트가 이제 "카드 수집"만 가리키도록 조정)

**Interfaces:**
- Consumes: `useDailyPokemon` (Task 5), `AudioButton` (기존 `src/components/AudioButton.jsx`), `TypeBadge` (기존).
- Produces: 없음 (최상위 페이지).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/DailyPokemon.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyPokemon from "./DailyPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  types: ["electric"],
  descriptionKo: "볼주머니에 전기를 모은다.",
  artwork: "https://example.com/pikachu.png",
  cry: "https://example.com/pikachu.ogg",
};

describe("DailyPokemon", () => {
  it("로딩 중에는 스켈레톤을 보여준다", () => {
    loadPokemonData.mockReturnValue(new Promise(() => {})); // 영원히 대기
    render(
      <MemoryRouter>
        <DailyPokemon />
      </MemoryRouter>
    );
    expect(document.querySelector(".skeleton")).toBeTruthy();
  });

  it("로딩 후 오늘의 포켓몬 이름/설명이 렌더된다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyPokemon />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("피카츄")).toBeInTheDocument());
    expect(screen.getByText("볼주머니에 전기를 모은다.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/pages/DailyPokemon.test.jsx`
Expected: FAIL — `Failed to resolve import "./DailyPokemon"`

- [ ] **Step 3: `DailyPokemon.jsx` 구현**

`src/pages/DailyPokemon.jsx`:

```jsx
import AppShell from "../components/AppShell";
import TypeBadge from "../components/TypeBadge";
import AudioButton from "../components/AudioButton";
import { useDailyPokemon } from "../hooks/useDailyPokemon";

export default function DailyPokemon() {
  const pokemon = useDailyPokemon();

  if (pokemon === undefined) {
    return (
      <AppShell title="오늘의 포켓몬" backTo="/more">
        <div className="skeleton" style={{ height: 260 }} />
      </AppShell>
    );
  }

  if (!pokemon) {
    return (
      <AppShell title="오늘의 포켓몬" backTo="/more">
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-4)" }}>
          포켓몬 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="오늘의 포켓몬" backTo="/more">
      <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
        <img
          src={pokemon.artwork}
          alt={pokemon.nameKo}
          style={{ width: 180, height: 180 }}
        />
        <h2 style={{ fontSize: 26, marginTop: "var(--space-3)" }}>{pokemon.nameKo}</h2>
        <div style={{ marginTop: 8 }}>
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <p
          style={{
            marginTop: "var(--space-4)",
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
            textAlign: "left",
          }}
        >
          {pokemon.descriptionKo}
        </p>
        {pokemon.cry && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <AudioButton src={pokemon.cry} trackKey={pokemon.id} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/pages/DailyPokemon.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: 라우트 등록**

`src/App.jsx`에 import 추가:

```jsx
import DailyPokemon from "./pages/DailyPokemon";
```

`/more` 라우트 다음 줄에 추가:

```jsx
      <Route path="/daily" element={<DailyPokemon />} />
```

- [ ] **Step 6: MoreMenu에서 오늘의 포켓몬 활성화**

`src/pages/MoreMenu.jsx:7`에서 `daily` 항목의 `ready: true`는 Task 3에서 이미 `true`로 만들었으므로 이 단계에서는 변경 없음 — 대신 `MoreMenu.test.jsx`의 "준비중" 테스트가 실제로 아직 안 만들어진 기능(카드 수집)을 가리키는지만 다시 확인한다.

Run: `npx vitest run src/pages/MoreMenu.test.jsx`
Expected: PASS (기존 2 tests 그대로 통과 — 변경 불필요하면 이 스텝은 확인만 하고 넘어간다)

- [ ] **Step 7: 홈 화면에 요약 카드 추가**

`src/pages/Home.jsx` 1~11번째 줄(import 구간)을 다음으로 교체:

```jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { SparklesIcon } from "../components/Icons";
import { loadPokemonData } from "../utils/pokemonData";
import { useDailyPokemon } from "../hooks/useDailyPokemon";
import {
  getMyPokemon,
  resolveBranchEvolution,
  clearPendingEvolution,
  EVOLUTION_THRESHOLD,
} from "../utils/myPokemon";
```

`Home()` 함수 내부, `const [mine, setMine] = useState(undefined);` 바로 아래에 추가:

```jsx
  const dailyPokemon = useDailyPokemon();
```

홈 화면 하단, `<p style={{ marginTop: "var(--space-10)", ... }}>` (기존 269번째 줄대의 비공식 프로젝트 안내 문구) 바로 위에 요약 카드를 추가한다 — `src/pages/Home.jsx`에서 `</div>` (내 포켓몬 카드를 감싸는 `<div style={{ marginTop: "var(--space-4)" }}>...</div>` 블록) 닫힘 다음, 안내 문구 `<p>` 이전에 삽입:

```jsx
      {dailyPokemon && (
        <Link
          to="/daily"
          className="press pop-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img src={dailyPokemon.artwork} alt="" style={{ width: 44, height: 44 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>오늘의 포켓몬</div>
            <div style={{ fontWeight: 700 }}>{dailyPokemon.nameKo}</div>
          </div>
        </Link>
      )}
```

- [ ] **Step 8: 개발 서버에서 실제 확인**

Run: `npm run dev`, 브라우저로 `/` 접속.
Expected: 홈 화면 하단에 오늘의 포켓몬 카드가 보이고, 클릭하면 `/daily`로 이동해 이미지/이름/타입/설명/울음소리 버튼이 보인다. 새로고침해도 같은 포켓몬이 유지된다. 하단 네비 "더보기" → `/more`에서 "오늘의 포켓몬"이 활성 카드로, 나머지 3개는 "준비중"으로 보인다.

- [ ] **Step 9: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS (기존 테스트 포함, 회귀 없음)

- [ ] **Step 10: Commit**

```bash
git add src/pages/DailyPokemon.jsx src/pages/DailyPokemon.test.jsx src/App.jsx src/pages/Home.jsx
git commit -m "feat: add daily pokemon page and home screen summary card"
```
