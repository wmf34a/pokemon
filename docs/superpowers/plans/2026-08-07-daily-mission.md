# 일일 미션 (DailyMission) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부모가 아이의 생활 습관(등원/하원/식사/양치/독서/취침) 완료를 확인·체크하면 즉시 포켓몬 카드로 보상하는 일일 미션 시스템을 추가한다. 전체 완료 시 보너스 카드, 커스텀 미션 추가/삭제, 주간 통계를 포함한다.

**Architecture:** `src/utils/dailyMission.js`가 미션 카탈로그(기본 6개 상수 + 커스텀 localStorage 목록)와 완료 로그(append-only)를 관리하고, 카드 지급은 카드 수집 계획(`2026-08-07-card-collection.md`)에서 만든 `cardCollection.js`의 `awardCard`를 그대로 재사용한다(등급 로직 중복 없음). 완료 확인은 네이티브 `confirm()` 대신 커스텀 `ConfirmDialog`, 카드 공개는 카드수집 계획에서 만든 `.card-flip-*` CSS를 재사용하는 `CardRevealModal`로 연출한다.

**Tech Stack:** React 19, react-router-dom 7, vitest + @testing-library/react(+ fake timers), Web Vibration API(기능 감지).

**선행 조건:**
- `docs/superpowers/plans/2026-08-07-daily-pokemon.md` (`/more` 페이지, 하단 네비 "더보기" 탭, `MoreMenu.jsx`)
- `docs/superpowers/plans/2026-08-07-card-collection.md` (`src/utils/cardCollection.js`의 `awardCard`/`GRADE_LABEL_KO`/`GRADE_COLOR_VAR`, `.card-flip-*` CSS 클래스)

이 두 계획이 먼저 적용되어 있어야 한다. `docs/superpowers/plans/2026-08-07-pokemon-care.md`는 이 계획과 서로 의존하지 않으므로 순서는 상관없다.

## Global Constraints

- 기존 진화 시스템(`src/utils/myPokemon.js`)과 카드 수집 등급 로직(`rollGrade`)은 수정하지 않는다 — `awardCard`만 그대로 호출한다.
- `localStorage`/`navigator.vibrate` 접근은 항상 try/catch 또는 feature-detect로 감싼다.
- 완료한 미션은 취소할 수 없다(같은 날 같은 미션 재완료 불가).
- 커스텀 미션: 라벨 최대 20자(trim 후), 최대 10개.
- iOS/iPadOS Safari는 Vibration API를 지원하지 않는다 — 없으면 조용히 무시(플랫폼 제약, 버그 아님).
- 한글 UI.

---

### Task 1: `haptics.js` — 진동 헬퍼

**Files:**
- Create: `src/utils/haptics.js`
- Test: `src/utils/haptics.test.js`

**Interfaces:**
- Produces: `vibrate(pattern: number|number[] = 200): void` — `navigator.vibrate`가 있으면 호출, 없거나 던지면 조용히 무시.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/haptics.test.js`:

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { vibrate } from "./haptics";

afterEach(() => {
  delete navigator.vibrate;
});

describe("vibrate", () => {
  it("navigator.vibrate가 없으면(jsdom 기본, iOS Safari와 동일한 상황) 예외 없이 무시한다", () => {
    expect(() => vibrate(200)).not.toThrow();
  });

  it("navigator.vibrate가 있으면 주어진 패턴으로 호출한다", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    vibrate(200);
    expect(spy).toHaveBeenCalledWith(200);
  });

  it("navigator.vibrate 호출이 예외를 던져도 밖으로 전파하지 않는다", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        throw new Error("blocked");
      },
      configurable: true,
    });
    expect(() => vibrate(200)).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/haptics.test.js`
Expected: FAIL — `Failed to resolve import "./haptics"`

- [ ] **Step 3: 구현**

`src/utils/haptics.js`:

```js
// Vibration API 헬퍼. iOS/iPadOS Safari는 이 API 자체를 지원하지 않으므로
// feature-detect 후 없으면 조용히 무시한다 — 버그가 아니라 플랫폼 제약이며,
// 이런 기기에서는 효과음 + 시각 연출만으로 피드백을 준다.
export function vibrate(pattern = 200) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // 일부 환경은 존재를 알려도 호출 시점에 던질 수 있어 방어적으로 무시
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/haptics.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/haptics.js src/utils/haptics.test.js
git commit -m "feat: add vibration helper with iOS-safe feature detection"
```

---

### Task 2: `dailyMission.js` — 미션 카탈로그 + 완료 로그 + 카드 지급

**Files:**
- Create: `src/utils/dailyMission.js`
- Test: `src/utils/dailyMission.test.js`

**Interfaces:**
- Consumes: `awardCard` (`src/utils/cardCollection.js`, 카드수집 계획에서 생성됨).
- Produces:
  - `DEFAULT_MISSIONS: {id:string, label:string}[]` (6개 고정)
  - `getCustomMissions(): {id, label, createdAt}[]`
  - `addCustomMission(label, now = new Date()): {ok:true, mission} | {ok:false, error: "empty"|"too_long"|"limit_reached"}`
  - `removeCustomMission(id): void`
  - `getAllMissions(): {id, label}[]` — 기본 + 커스텀
  - `getMissionsWithStatus(now = new Date()): {id, label, completedToday, completedAt}[]`
  - `isMissionCompletedToday(missionId, now = new Date()): boolean`
  - `isAllMissionsCompletedToday(now = new Date()): boolean`
  - `isBonusAwardedToday(now = new Date()): boolean`
  - `completeMission(missionId, pokemonId, random = Math.random, now = new Date()): {cardResult:{isNew,grade}, allCompleted:boolean} | null` — 오늘 이미 완료했으면 `null`.
  - `completeBonus(pokemonId, random = Math.random, now = new Date()): {isNew,grade} | null` — 전체 미완료거나 이미 지급했으면 `null`.
  - `getTodayCompletedCount(now = new Date()): number`, `getWeeklyCompletedCount(now = new Date()): number` — 둘 다 보너스는 제외하고 센다.

`pokemonId`는 호출부(페이지)가 `pickRandom(전체 포켓몬 목록, 1)`로 미리 뽑아 넘긴다 — 이 모듈은 포켓몬 데이터셋을 직접 알지 못한다(`myPokemon.js`가 `addPoints`에서 `currentStagePokemon`을 넘겨받는 것과 같은 패턴).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/dailyMission.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_MISSIONS,
  getCustomMissions,
  addCustomMission,
  removeCustomMission,
  getAllMissions,
  getMissionsWithStatus,
  isMissionCompletedToday,
  completeMission,
  completeBonus,
  getTodayCompletedCount,
  getWeeklyCompletedCount,
} from "./dailyMission";

beforeEach(() => {
  localStorage.clear();
});

describe("DEFAULT_MISSIONS", () => {
  it("기본 미션 6개가 고정되어 있다", () => {
    expect(DEFAULT_MISSIONS).toHaveLength(6);
    expect(DEFAULT_MISSIONS.map((m) => m.id)).toContain("gotoSchool");
    expect(DEFAULT_MISSIONS.map((m) => m.id)).toContain("sleepOnTime");
  });
});

describe("커스텀 미션 관리", () => {
  it("정상적인 라벨로 추가하면 ok:true와 함께 저장된다", () => {
    const result = addCustomMission("숙제하기");
    expect(result.ok).toBe(true);
    expect(getCustomMissions()).toHaveLength(1);
    expect(getCustomMissions()[0].label).toBe("숙제하기");
  });

  it("공백만 있는 라벨은 거부한다", () => {
    const result = addCustomMission("   ");
    expect(result).toEqual({ ok: false, error: "empty" });
    expect(getCustomMissions()).toHaveLength(0);
  });

  it("20자를 초과하면 거부한다", () => {
    const result = addCustomMission("가".repeat(21));
    expect(result).toEqual({ ok: false, error: "too_long" });
  });

  it("10개를 초과하면 거부한다", () => {
    for (let i = 0; i < 10; i++) addCustomMission(`미션${i}`);
    const result = addCustomMission("11번째");
    expect(result).toEqual({ ok: false, error: "limit_reached" });
    expect(getCustomMissions()).toHaveLength(10);
  });

  it("삭제하면 해당 미션만 제거된다", () => {
    addCustomMission("A");
    const { mission } = addCustomMission("B");
    removeCustomMission(mission.id);
    expect(getCustomMissions().map((m) => m.label)).toEqual(["A"]);
  });

  it("getAllMissions는 기본 미션 뒤에 커스텀 미션을 이어붙인다", () => {
    addCustomMission("숙제하기");
    const all = getAllMissions();
    expect(all).toHaveLength(7);
    expect(all[6].label).toBe("숙제하기");
  });
});

describe("completeMission", () => {
  it("처음 완료하면 카드 결과와 함께 로그가 남는다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    const result = completeMission("gotoSchool", 25, () => 0, now);
    expect(result.cardResult).toEqual({ isNew: true, grade: "common" });
    expect(isMissionCompletedToday("gotoSchool", now)).toBe(true);
  });

  it("같은 날 같은 미션을 두 번 완료하면 null을 반환한다(취소/재완료 불가)", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission("gotoSchool", 25, () => 0, now);
    expect(completeMission("gotoSchool", 1, () => 0, now)).toBeNull();
  });

  it("이미 보유한 포켓몬이 뽑히면 재추첨 없이 기존 등급 그대로 온다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission("gotoSchool", 25, () => 0, now); // 25번 최초 획득(common)
    const result = completeMission("comeHome", 25, () => 0.9, now); // 같은 25번, legendary 나올 난수를 줘도
    expect(result.cardResult).toEqual({ isNew: false, grade: "common" });
  });

  it("기본 미션 6개를 모두 완료한 순간에만 allCompleted:true를 반환한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    const ids = DEFAULT_MISSIONS.map((m) => m.id);
    ids.slice(0, -1).forEach((id, i) => {
      const result = completeMission(id, i + 1, () => 0, now);
      expect(result.allCompleted).toBe(false);
    });
    const last = completeMission(ids[ids.length - 1], 99, () => 0, now);
    expect(last.allCompleted).toBe(true);
  });
});

describe("completeBonus", () => {
  it("전체 미션을 완료하기 전에는 null을 반환한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, now);
    expect(completeBonus(999, () => 0, now)).toBeNull();
  });

  it("전체 미션 완료 후 한 번만 보너스 카드를 지급한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    DEFAULT_MISSIONS.forEach((m, i) => completeMission(m.id, i + 1, () => 0, now));
    const bonus = completeBonus(999, () => 0.9, now);
    expect(bonus).toEqual({ isNew: true, grade: "rare" });
    expect(completeBonus(998, () => 0, now)).toBeNull(); // 이미 지급됨
  });
});

describe("통계", () => {
  it("getTodayCompletedCount는 오늘 완료한 미션 수(보너스 제외)를 센다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, now);
    completeMission(DEFAULT_MISSIONS[1].id, 2, () => 0, now);
    expect(getTodayCompletedCount(now)).toBe(2);
  });

  it("getWeeklyCompletedCount는 이번 주(월요일부터) 완료 수를 센다", () => {
    const monday = new Date("2026-08-03T09:00:00.000Z"); // 2026-08-03은 월요일
    const friday = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, monday);
    completeMission(DEFAULT_MISSIONS[1].id, 2, () => 0, friday);
    expect(getWeeklyCompletedCount(friday)).toBe(2);
  });
});

describe("getMissionsWithStatus", () => {
  it("완료한 미션은 completedToday:true와 completedAt을 함께 반환한다", () => {
    const now = new Date("2026-08-07T09:02:11.000Z");
    completeMission("gotoSchool", 1, () => 0, now);
    const list = getMissionsWithStatus(now);
    const done = list.find((m) => m.id === "gotoSchool");
    expect(done.completedToday).toBe(true);
    expect(done.completedAt).toBe(now.toISOString());
    const notDone = list.find((m) => m.id === "comeHome");
    expect(notDone.completedToday).toBe(false);
    expect(notDone.completedAt).toBeNull();
  });
});

describe("방어적 동작", () => {
  it("localStorage 접근이 실패해도 예외를 던지지 않는다", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => completeMission("gotoSchool", 1, () => 0)).not.toThrow();
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/dailyMission.test.js`
Expected: FAIL — `Failed to resolve import "./dailyMission"`

- [ ] **Step 3: 구현**

`src/utils/dailyMission.js`:

```js
// 일일 미션(생활 습관 체크) + 카드 보상 시스템. 카드 등급 로직은 새로 만들지
// 않고 cardCollection.js의 awardCard를 그대로 재사용한다. 이 모듈은 미션
// 카탈로그(기본 6개 + 커스텀)와 완료 로그만 책임진다.

import { awardCard } from "./cardCollection";

const CUSTOM_KEY = "pokemonMissions.custom.v1";
const LOG_KEY = "pokemonMissions.log.v1";
const MAX_CUSTOM = 10;
const MAX_LABEL_LENGTH = 20;
const LOG_RETENTION_DAYS = 90;
const BONUS_MISSION_ID = "__bonus__";

export const DEFAULT_MISSIONS = [
  { id: "gotoSchool", label: "등원하기" },
  { id: "comeHome", label: "하원하기" },
  { id: "eatDinner", label: "저녁 잘 먹기" },
  { id: "brushTeeth", label: "양치 잘 하기" },
  { id: "readBook", label: "책 읽기" },
  { id: "sleepOnTime", label: "제시간에 자기" },
];

function todayDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }
  return value;
}

export function getCustomMissions() {
  const list = readJSON(CUSTOM_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addCustomMission(label, now = new Date()) {
  const trimmed = (label || "").trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (trimmed.length > MAX_LABEL_LENGTH) return { ok: false, error: "too_long" };

  const custom = getCustomMissions();
  if (custom.length >= MAX_CUSTOM) return { ok: false, error: "limit_reached" };

  const mission = {
    id: `custom-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    label: trimmed,
    createdAt: now.toISOString(),
  };
  writeJSON(CUSTOM_KEY, [...custom, mission]);
  return { ok: true, mission };
}

export function removeCustomMission(id) {
  writeJSON(CUSTOM_KEY, getCustomMissions().filter((m) => m.id !== id));
}

export function getAllMissions() {
  return [...DEFAULT_MISSIONS, ...getCustomMissions()];
}

function readLog() {
  const log = readJSON(LOG_KEY, []);
  return Array.isArray(log) ? log : [];
}

function trimOldEntries(log, now) {
  const cutoff = now.getTime() - LOG_RETENTION_DAYS * 24 * 3_600_000;
  return log.filter((entry) => new Date(entry.completedAt).getTime() >= cutoff);
}

function logCompletion(missionId, now) {
  const log = trimOldEntries(readLog(), now);
  log.push({ missionId, date: todayDateString(now), completedAt: now.toISOString() });
  writeJSON(LOG_KEY, log);
}

export function isMissionCompletedToday(missionId, now = new Date()) {
  const today = todayDateString(now);
  return readLog().some((e) => e.missionId === missionId && e.date === today);
}

export function isAllMissionsCompletedToday(now = new Date()) {
  const missions = getAllMissions();
  return missions.length > 0 && missions.every((m) => isMissionCompletedToday(m.id, now));
}

export function isBonusAwardedToday(now = new Date()) {
  return isMissionCompletedToday(BONUS_MISSION_ID, now);
}

export function getMissionsWithStatus(now = new Date()) {
  const today = todayDateString(now);
  const log = readLog();
  return getAllMissions().map((m) => {
    const entry = log.find((e) => e.missionId === m.id && e.date === today);
    return { ...m, completedToday: Boolean(entry), completedAt: entry ? entry.completedAt : null };
  });
}

export function getTodayCompletedCount(now = new Date()) {
  const today = todayDateString(now);
  return readLog().filter((e) => e.date === today && e.missionId !== BONUS_MISSION_ID).length;
}

export function getWeeklyCompletedCount(now = new Date()) {
  const day = now.getDay(); // 0 = 일요일
  const diffToMonday = (day + 6) % 7; // 월요일까지 며칠 전인지 (월요일 자신은 0)
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);

  return readLog().filter((e) => {
    if (e.missionId === BONUS_MISSION_ID) return false;
    const t = new Date(e.completedAt).getTime();
    return t >= monday.getTime() && t <= now.getTime();
  }).length;
}

// pokemonId는 호출부가 pickRandom(전체 포켓몬, 1)로 미리 뽑아 넘긴다.
export function completeMission(missionId, pokemonId, random = Math.random, now = new Date()) {
  if (isMissionCompletedToday(missionId, now)) return null;

  logCompletion(missionId, now);
  const cardResult = awardCard(pokemonId, random);

  return { cardResult, allCompleted: isAllMissionsCompletedToday(now) };
}

export function completeBonus(pokemonId, random = Math.random, now = new Date()) {
  if (!isAllMissionsCompletedToday(now)) return null;
  if (isBonusAwardedToday(now)) return null;

  logCompletion(BONUS_MISSION_ID, now);
  return awardCard(pokemonId, random);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/dailyMission.test.js`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/dailyMission.js src/utils/dailyMission.test.js
git commit -m "feat: add daily mission catalog, completion log, and bonus card logic"
```

---

### Task 3: `ConfirmDialog.jsx` — 재사용 가능한 확인 팝업

**Files:**
- Create: `src/components/ConfirmDialog.jsx`
- Test: `src/components/ConfirmDialog.test.jsx`

**Interfaces:**
- Produces: `<ConfirmDialog open={boolean} title={string} message={string?} confirmLabel={string?} cancelLabel={string?} onConfirm={()=>void} onCancel={()=>void} />` — 네이티브 `confirm()` 대신 앱 톤에 맞춘 모달. `open:false`면 아무 것도 렌더하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/ConfirmDialog.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("open이 false면 아무 것도 렌더하지 않는다", () => {
    const { container } = render(
      <ConfirmDialog open={false} title="정말요?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("open이면 제목과 메시지를 보여준다", () => {
    render(
      <ConfirmDialog
        open
        title="정말 완료했나요?"
        message="완료로 표시하면 취소할 수 없어요"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("정말 완료했나요?")).toBeInTheDocument();
    expect(screen.getByText("완료로 표시하면 취소할 수 없어요")).toBeInTheDocument();
  });

  it("확인 버튼을 누르면 onConfirm이 호출된다", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="제목" onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("취소 버튼을 누르면 onCancel이 호출된다", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="제목" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/ConfirmDialog.test.jsx`
Expected: FAIL — `Failed to resolve import "./ConfirmDialog"`

- [ ] **Step 3: 구현**

`src/components/ConfirmDialog.jsx`:

```jsx
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 320,
          borderRadius: "var(--radius-lg)",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-5)",
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: 18, fontFamily: "var(--font-heading)", fontWeight: 400 }}>
          {title}
        </h3>
        {message && (
          <p style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 14 }}>
            {message}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontWeight: 700,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="press"
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/ConfirmDialog.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ConfirmDialog.jsx src/components/ConfirmDialog.test.jsx
git commit -m "feat: add reusable confirm dialog component"
```

---

### Task 4: `CardRevealModal.jsx` — 카드 뽑기 연출

**Files:**
- Create: `src/components/CardRevealModal.jsx`
- Test: `src/components/CardRevealModal.test.jsx`

**Interfaces:**
- Consumes: `GRADE_LABEL_KO`, `GRADE_COLOR_VAR` (`src/utils/cardCollection.js`), `.card-flip-*` CSS 클래스(카드수집 계획에서 `src/index.css`에 추가됨).
- Produces: `<CardRevealModal result={{isNew,grade}|null} pokemon={{nameKo,artwork}|null} onClose={()=>void} />` — `result`/`pokemon`이 없으면 아무 것도 렌더하지 않음. 렌더되면 500ms 후 카드가 뒤집히며 공개되고 그 때 "닫기" 버튼이 나타난다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/CardRevealModal.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import CardRevealModal from "./CardRevealModal";

const pikachu = { nameKo: "피카츄", artwork: "https://example.com/25.png" };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CardRevealModal", () => {
  it("result나 pokemon이 없으면 아무 것도 렌더하지 않는다", () => {
    const { container } = render(<CardRevealModal result={null} pokemon={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("일정 시간 후 카드가 공개되며 등급/이름과 닫기 버튼이 나타난다", () => {
    render(
      <CardRevealModal result={{ isNew: true, grade: "rare" }} pokemon={pikachu} onClose={() => {}} />
    );
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("피카츄")).toBeInTheDocument();
    expect(screen.getByText("레어")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("이미 보유 중이던 카드면 안내 문구가 함께 보인다", () => {
    render(
      <CardRevealModal result={{ isNew: false, grade: "common" }} pokemon={pikachu} onClose={() => {}} />
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("이미 있는 카드예요")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/CardRevealModal.test.jsx`
Expected: FAIL — `Failed to resolve import "./CardRevealModal"`

- [ ] **Step 3: 구현**

`src/components/CardRevealModal.jsx`:

```jsx
import { useEffect, useState } from "react";
import { GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";

export default function CardRevealModal({ result, pokemon, onClose }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!result) return undefined;
    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), 500);
    return () => clearTimeout(timer);
  }, [result]);

  if (!result || !pokemon) return null;

  const color = GRADE_COLOR_VAR[result.grade] || GRADE_COLOR_VAR.common;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-5)",
        padding: "var(--space-4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="카드 뽑기 결과"
        className="card-flip-outer"
        style={{ width: 220, height: 280 }}
      >
        <div className={`card-flip-inner${revealed ? " is-flipped" : ""}`}>
          <div
            className="card-flip-face"
            style={{
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span style={{ fontSize: 40, color: "var(--color-text-on-primary)" }}>?</span>
          </div>
          <div
            className="card-flip-face card-flip-back"
            style={{
              background: "var(--color-surface)",
              border: `3px solid ${color}`,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "var(--space-4)",
              textAlign: "center",
            }}
          >
            <img src={pokemon.artwork} alt={pokemon.nameKo} style={{ width: 100, height: 100 }} />
            <div style={{ fontWeight: 700 }}>{pokemon.nameKo}</div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                background: `color-mix(in srgb, ${color} 25%, var(--color-surface))`,
              }}
            >
              {GRADE_LABEL_KO[result.grade]}
            </span>
            {!result.isNew && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                이미 있는 카드예요
              </div>
            )}
          </div>
        </div>
      </div>

      {revealed && (
        <button
          type="button"
          onClick={onClose}
          className="press"
          style={{
            minHeight: 44,
            padding: "10px 24px",
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "var(--color-accent)",
            color: "var(--color-accent-ink)",
            fontWeight: 700,
          }}
        >
          닫기
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/CardRevealModal.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/CardRevealModal.jsx src/components/CardRevealModal.test.jsx
git commit -m "feat: add card reveal modal with flip animation"
```

---

### Task 5: `useMissionChime` — 미션 완료 효과음

**Files:**
- Create: `src/hooks/useMissionChime.js`
- Test: `src/hooks/useMissionChime.test.js`

**Interfaces:**
- Produces: `useMissionChime(): () => void` — 호출하면 짧은 "딩" 1음을 재생. `src/hooks/useEvolutionChime.js`와 같은 패턴(외부 에셋 없이 Web Audio API로 합성, AudioContext 생성/재생 실패 시 조용히 무시)이지만, 진화 축하음(3음 상승 아르페지오)과 구분되는 독립된 단음이라 별도 훅으로 둔다 — 기존 `useEvolutionChime.js`는 수정하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/hooks/useMissionChime.test.js`:

```js
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMissionChime } from "./useMissionChime";

describe("useMissionChime", () => {
  it("AudioContext가 없는 환경(jsdom)에서도 예외 없이 호출된다", () => {
    const { result } = renderHook(() => useMissionChime());
    expect(() => result.current()).not.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/hooks/useMissionChime.test.js`
Expected: FAIL — `Failed to resolve import "./useMissionChime"`

- [ ] **Step 3: 구현**

`src/hooks/useMissionChime.js`:

```js
// 미션 완료 시 재생하는 짧은 "딩" 1음. useEvolutionChime.js와 같은 패턴
// (외부 에셋 없이 Web Audio API로 합성, 실패해도 절대 throw하지 않음)이지만
// 진화 축하음(3음 상승 아르페지오)과는 구분되는 별도 이벤트라 독립된 훅으로 둔다.

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

const DING_HZ = 880; // A5
const DING_DURATION_S = 0.15;

export function useMissionChime() {
  return function playChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = DING_HZ;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + DING_DURATION_S);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + DING_DURATION_S);
    } catch {
      // 무음 처리
    }
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/hooks/useMissionChime.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMissionChime.js src/hooks/useMissionChime.test.js
git commit -m "feat: add single-tone chime for mission completion"
```

---

### Task 6: `/missions` 페이지 + 최종 더보기 메뉴 완성

**Files:**
- Create: `src/pages/DailyMission.jsx`
- Create: `src/pages/DailyMission.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/MoreMenu.jsx`
- Modify: `src/pages/MoreMenu.test.jsx`

**Interfaces:**
- Consumes: 모든 이전 Task의 산출물(`dailyMission.js`, `ConfirmDialog`, `CardRevealModal`, `haptics.js`, `useMissionChime`) + `loadPokemonData`/`pickRandom`(기존 `src/utils/pokemonData.js`).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/DailyMission.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyMission from "./DailyMission";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = { id: 25, nameKo: "피카츄", artwork: "https://example.com/25.png" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("DailyMission", () => {
  it("기본 미션 6개를 모두 렌더한다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    expect(await screen.findByText("등원하기")).toBeInTheDocument();
    expect(screen.getByText("하원하기")).toBeInTheDocument();
    expect(screen.getByText("제시간에 자기")).toBeInTheDocument();
  });

  it("완료 → 확인 팝업 → 확인하면 미션이 완료 상태로 바뀐다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.click(screen.getAllByRole("button", { name: "완료" })[0]);
    expect(screen.getByText("정말 완료했나요?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "완료" })).toHaveLength(5);
    });
  });

  it("취소를 누르면 미션이 완료되지 않는다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.click(screen.getAllByRole("button", { name: "완료" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getAllByRole("button", { name: "완료" })).toHaveLength(6);
  });

  it("20자 넘는 커스텀 미션은 에러 메시지를 보여주고 추가되지 않는다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.change(screen.getByPlaceholderText("새 미션 이름 (최대 20자)"), {
      target: { value: "가".repeat(21) },
    });
    fireEvent.submit(screen.getByRole("button", { name: "추가" }).closest("form"));

    expect(screen.getByText("미션 이름은 20자 이하로 적어주세요")).toBeInTheDocument();
  });

  it("커스텀 미션을 추가하고 삭제할 수 있다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.change(screen.getByPlaceholderText("새 미션 이름 (최대 20자)"), {
      target: { value: "숙제하기" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "추가" }).closest("form"));
    expect(await screen.findByText("숙제하기")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.queryByText("숙제하기")).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/pages/DailyMission.test.jsx`
Expected: FAIL — `Failed to resolve import "./DailyMission"`

- [ ] **Step 3: 구현**

`src/pages/DailyMission.jsx`:

```jsx
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import CardRevealModal from "../components/CardRevealModal";
import { CheckIcon } from "../components/Icons";
import { loadPokemonData, pickRandom } from "../utils/pokemonData";
import {
  getMissionsWithStatus,
  getCustomMissions,
  addCustomMission,
  removeCustomMission,
  completeMission,
  completeBonus,
  getTodayCompletedCount,
  getWeeklyCompletedCount,
  isBonusAwardedToday,
} from "../utils/dailyMission";
import { vibrate } from "../utils/haptics";
import { useMissionChime } from "../hooks/useMissionChime";

const ERROR_LABEL_KO = {
  empty: "미션 이름을 입력해주세요",
  too_long: "미션 이름은 20자 이하로 적어주세요",
  limit_reached: "커스텀 미션은 최대 10개까지 추가할 수 있어요",
};

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DailyMission() {
  const [all, setAll] = useState([]);
  const [missions, setMissions] = useState(() => getMissionsWithStatus());
  const [customLabel, setCustomLabel] = useState("");
  const [customError, setCustomError] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [revealQueue, setRevealQueue] = useState([]);
  const playChime = useMissionChime();

  useEffect(() => {
    loadPokemonData().then(setAll);
  }, []);

  // setMissions는 매번 새 배열을 만들어 반환하므로 항상 리렌더를 일으킨다 —
  // 그 리렌더 때 아래 getCustomMissions()/getTodayCompletedCount() 등도
  // render 본문에서 다시 호출되어 최신 localStorage 상태를 반영한다.
  function refresh() {
    setMissions(getMissionsWithStatus());
  }

  function handleConfirmComplete() {
    const missionId = confirmTarget;
    setConfirmTarget(null);
    if (!missionId || all.length === 0) return;

    const picked = pickRandom(all, 1)[0];
    const outcome = completeMission(missionId, picked.id);
    if (!outcome) return; // 방어적: 이미 완료된 상태였다면 아무 것도 하지 않음

    const queue = [{ result: outcome.cardResult, pokemon: picked }];

    if (outcome.allCompleted) {
      const bonusPicked = pickRandom(all, 1)[0];
      const bonusResult = completeBonus(bonusPicked.id);
      if (bonusResult) queue.push({ result: bonusResult, pokemon: bonusPicked });
    }

    playChime();
    vibrate(200);
    setRevealQueue(queue);
    refresh();
  }

  function handleCloseReveal() {
    setRevealQueue((q) => q.slice(1));
  }

  function handleAddCustom(e) {
    e.preventDefault();
    const result = addCustomMission(customLabel);
    if (!result.ok) {
      setCustomError(ERROR_LABEL_KO[result.error]);
      return;
    }
    setCustomLabel("");
    setCustomError(null);
    refresh();
  }

  function handleRemoveCustom(id) {
    removeCustomMission(id);
    refresh();
  }

  const todayCount = getTodayCompletedCount();
  const weekCount = getWeeklyCompletedCount();
  const cardsToday = todayCount + (isBonusAwardedToday() ? 1 : 0);
  const customMissions = getCustomMissions();
  const activeReveal = revealQueue[0] || null;

  return (
    <AppShell title="일일 미션" backTo="/more">
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
          <span>
            오늘 완료 {todayCount}/{missions.length}
          </span>
          <span>오늘 획득 카드 {cardsToday}장</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
          이번 주 {weekCount}개 완료
        </div>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        {missions.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              marginBottom: 8,
              opacity: m.completedToday ? 0.55 : 1,
            }}
          >
            {m.completedToday && <CheckIcon size={18} style={{ color: "var(--color-success)" }} />}
            <span style={{ flex: 1, fontWeight: 600 }}>{m.label}</span>
            {m.completedToday ? (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {formatTime(m.completedAt)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmTarget(m.id)}
                className="press"
                style={{
                  minHeight: 36,
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  background: "var(--color-primary)",
                  color: "var(--color-text-on-primary)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                완료
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "var(--space-5)" }}>
        <h3 style={{ fontSize: 15, fontFamily: "var(--font-heading)", fontWeight: 400 }}>
          커스텀 미션
        </h3>
        <form onSubmit={handleAddCustom} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            maxLength={20}
            placeholder="새 미션 이름 (최대 20자)"
            disabled={customMissions.length >= 10}
            style={{
              flex: 1,
              padding: "10px 12px",
              minHeight: 40,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          />
          <button
            type="submit"
            disabled={customMissions.length >= 10}
            className="press"
            style={{
              minHeight: 40,
              padding: "0 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
            }}
          >
            추가
          </button>
        </form>
        {customError && (
          <p style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4 }}>{customError}</p>
        )}

        {customMissions.map((m) => (
          <div
            key={m.id}
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}
          >
            <span style={{ flex: 1 }}>{m.label}</span>
            <button
              type="button"
              onClick={() => handleRemoveCustom(m.id)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="정말 완료했나요?"
        message="완료로 표시하면 취소할 수 없어요"
        onConfirm={handleConfirmComplete}
        onCancel={() => setConfirmTarget(null)}
      />

      <CardRevealModal
        result={activeReveal?.result}
        pokemon={activeReveal?.pokemon}
        onClose={handleCloseReveal}
      />
    </AppShell>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/pages/DailyMission.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: 라우트 등록**

`src/App.jsx`에 import 추가:

```jsx
import DailyMission from "./pages/DailyMission";
```

`/care` 라우트 다음 줄에 추가:

```jsx
      <Route path="/missions" element={<DailyMission />} />
```

- [ ] **Step 6: 더보기 메뉴 최종 완성**

`src/pages/MoreMenu.jsx`의 `MODES` 배열에서 `missions` 항목의 `ready: false`를 `ready: true`로 변경 — 이제 4개 항목 모두 `ready: true`.

`src/pages/MoreMenu.test.jsx`를 아래 내용으로 전체 교체(더 이상 "준비중"인 기능이 없으므로, `QuizHub.test.jsx`와 같은 패턴):

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MoreMenu from "./MoreMenu";

describe("MoreMenu", () => {
  it("모든 링크가 활성화되어 각자의 경로로 연결된다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /오늘의 포켓몬/ })).toHaveAttribute("href", "/daily");
    expect(screen.getByRole("link", { name: /카드 수집/ })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: /포켓몬 키우기/ })).toHaveAttribute("href", "/care");
    expect(screen.getByRole("link", { name: /일일 미션/ })).toHaveAttribute("href", "/missions");
  });

  it("모든 기능이 구현되어 있으면 '준비중' 표시가 없다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    expect(screen.queryByText("준비중")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 관련 테스트 통과 확인**

Run: `npx vitest run src/pages/MoreMenu.test.jsx src/pages/DailyMission.test.jsx`
Expected: PASS

- [ ] **Step 8: 개발 서버에서 실제 확인**

Run: `npm run dev`, `/missions`에서:
- 미션 완료 버튼 → 확인 팝업 → 확인 시 카드 뽑기 연출(카드가 뒤집히며 등급 공개)이 뜨고, 미션이 체크+흐리게 처리되며 완료 시각이 표시되는지.
- 커스텀 미션 추가/삭제가 되는지, 10개 제한과 20자 제한이 걸리는지.
- 기본 6개 + 커스텀을 전부 완료하면 보너스 카드 연출이 추가로(카드 뽑기 모달이 닫기 후 한 번 더) 뜨는지.
- `/collection`에서 미션으로 얻은 카드가 실제로 반영되어 있는지.
- 모바일 화면 너비(개발자 도구 반응형)에서 레이아웃이 깨지지 않는지.

- [ ] **Step 9: 전체 테스트 스위트 + 린트**

Run: `npm test && npm run lint`
Expected: 모든 테스트 PASS, 린트 에러 없음

- [ ] **Step 10: Commit**

```bash
git add src/pages/DailyMission.jsx src/pages/DailyMission.test.jsx src/App.jsx src/pages/MoreMenu.jsx src/pages/MoreMenu.test.jsx
git commit -m "feat: add daily mission page with card reveal, chime, and custom missions"
```
