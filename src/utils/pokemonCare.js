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

// 배고픔 하락(시간당 -2, 하루 -48)이 놀기/재우기보다 빨라, 하루 1번 밥주기로도
// 순감소 없이 유지되려면 +30으로는 부족하다(하루 -18 순감소, 결국 항상 0으로
// 수렴). +50으로 올려 하루 1번 챙기면 배고픔이 오히려 살짝 오르게 맞춘다.
export function feed(now = new Date()) {
  return runActionOncePerDay("lastFedDate", now, (state) => ({
    ...state,
    hunger: clamp(state.hunger + 50),
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

// 홈 화면 요약 카드와 /care 페이지가 함께 쓰는 표정 CSS 필터.
export const MOOD_FILTER = {
  happy: "none",
  normal: "saturate(0.9)",
  tired: "saturate(0.6) brightness(0.9)",
  grumpy: "saturate(0.4) brightness(0.8)",
};

export function getMoodLevel(state) {
  const score = (state.hunger + state.happiness + (100 - state.fatigue)) / 3;
  if (score >= 70) return "happy";
  if (score >= 40) return "normal";
  if (score >= 20) return "tired";
  return "grumpy";
}
