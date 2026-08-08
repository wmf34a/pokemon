// "내 포켓몬"을 매일 돌보는 다마고치형 상태 시스템. myPokemon.js(진화 시스템)와
// 완전히 별개의 localStorage 레코드로 관리하며, currentStageId만 읽기 전용으로 참조한다.
// 백그라운드 타이머 없이, 상태를 읽는 시점(getCareState)에 lastTickAt부터 지금까지
// 경과한 시간만큼 순수 함수로 깎아 계산한다.
//
// 액션(밥주기/놀아주기/재우기)은 "하루 1번"이 아니라 각자 쿨다운 시간이 지나면
// 다시 할 수 있다 — 재방문을 유도하려면 캘린더 날짜가 아니라 실제 경과 시간
// 기준으로 다시 열려야 하기 때문. 쿨다운 동안은 버튼에 남은 시간을 보여준다.

const KEY = "pokemonCare.v1";

const HOURLY_HUNGER_DECAY = 2;
const HOURLY_HAPPINESS_DECAY = 1;
const HOURLY_FATIGUE_GROWTH = 1;

const COOLDOWN_HOURS = {
  feed: 6,
  play: 6,
  sleep: 8,
};

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
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
    lastFedAt: null,
    lastPlayedAt: null,
    lastSleptAt: null,
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

// lastAt이 없으면(한 번도 안 했으면) 쿨다운 없음(0). 있으면 쿨다운 종료까지 남은
// 밀리초, 이미 지났으면 0.
function remainingCooldownMs(lastAt, cooldownHours, now) {
  if (!lastAt) return 0;
  const elapsed = now.getTime() - new Date(lastAt).getTime();
  return Math.max(0, cooldownHours * 3_600_000 - elapsed);
}

function runActionIfReady(field, cooldownHours, now, apply) {
  const state = getCareState(now);
  if (remainingCooldownMs(state[field], cooldownHours, now) > 0) return state; // 아직 쿨다운 중
  return writeRecord({ ...apply(state), [field]: now.toISOString() });
}

// 배고픔 하락(시간당 -2)이 다른 지표보다 빨라, 쿨다운 한 번(6시간, -12) 챙길
// 때마다 순감소 없이 유지되려면 +30으로는 부족하다. +50으로 올려 6시간마다
// 한 번씩만 챙겨도(하루 최소 1번 이상) 배고픔이 유지/상승하게 맞춘다.
export function feed(now = new Date()) {
  return runActionIfReady("lastFedAt", COOLDOWN_HOURS.feed, now, (state) => ({
    ...state,
    hunger: clamp(state.hunger + 50),
  }));
}

export function play(now = new Date()) {
  return runActionIfReady("lastPlayedAt", COOLDOWN_HOURS.play, now, (state) => ({
    ...state,
    happiness: clamp(state.happiness + 25),
    fatigue: clamp(state.fatigue + 15),
  }));
}

export function sleep(now = new Date()) {
  return runActionIfReady("lastSleptAt", COOLDOWN_HOURS.sleep, now, (state) => ({
    ...state,
    fatigue: clamp(state.fatigue - 40),
  }));
}

export function canFeed(now = new Date()) {
  return remainingCooldownMs(getCareState(now).lastFedAt, COOLDOWN_HOURS.feed, now) === 0;
}

export function canPlay(now = new Date()) {
  return remainingCooldownMs(getCareState(now).lastPlayedAt, COOLDOWN_HOURS.play, now) === 0;
}

export function canSleep(now = new Date()) {
  return remainingCooldownMs(getCareState(now).lastSleptAt, COOLDOWN_HOURS.sleep, now) === 0;
}

// 버튼에 "N시간 후" 식으로 보여줄 남은 쿨다운(ms). 0이면 지금 바로 가능.
export function getFeedCooldownMs(now = new Date()) {
  return remainingCooldownMs(getCareState(now).lastFedAt, COOLDOWN_HOURS.feed, now);
}

export function getPlayCooldownMs(now = new Date()) {
  return remainingCooldownMs(getCareState(now).lastPlayedAt, COOLDOWN_HOURS.play, now);
}

export function getSleepCooldownMs(now = new Date()) {
  return remainingCooldownMs(getCareState(now).lastSleptAt, COOLDOWN_HOURS.sleep, now);
}

// 밥/놀기/재우기 중 하나라도 지금 가능하면 true — 홈 화면 카드가 "지금
// 돌봐줄 수 있어요" 배지를 보여줄지 판단하는 데 쓴다.
export function isAnyActionReady(now = new Date()) {
  return canFeed(now) || canPlay(now) || canSleep(now);
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
