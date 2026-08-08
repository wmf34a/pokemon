// 일일 미션(생활 습관 체크) + 카드 보상 시스템. 카드 등급 로직은 새로 만들지
// 않고 cardCollection.js의 awardCard를 그대로 재사용한다. 이 모듈은 미션
// 카탈로그(기본 6개 + 커스텀)와 완료 로그만 책임진다.

import { awardCard } from "./cardCollection";

const CUSTOM_KEY = "pokemonMissions.custom.v1";
const LOG_KEY = "pokemonMissions.log.v1";
const MAX_LABEL_LENGTH = 20;
const LOG_RETENTION_DAYS = 90;
const BONUS_MISSION_ID = "__bonus__";

// 커스텀 미션을 총 몇 개까지 보유할 수 있는지. 화면에 규칙을 그대로 설명해줄
// 수 있도록 export한다.
export const MAX_CUSTOM = 10;

// 하루에 새로 "만들 수 있는" 커스텀 미션 개수 상한(보유 가능한 전체 개수인
// MAX_CUSTOM=10과는 별개). 이게 없으면 한 자리에서 미션을 계속 지어내
// 완료하는 식으로 하루 카드 상한(DAILY_CARD_CAP)까지 순식간에 채울 수 있다 —
// 진짜 새 습관을 도입하는 속도(하루 한두 개)에 맞춘 값이다.
export const MAX_NEW_CUSTOM_PER_DAY = 2;

// 하루에 지급할 수 있는 카드 수 상한(일반 미션 + 보너스 카드 합산). 기본
// 미션 6개 + 커스텀 몇 개 + 보너스 정도는 상한에 안 걸리게, 그러면서도 커스텀
// 미션을 계속 추가해 카드를 무한정 파밍하지는 못하게 6(기본)보다 여유 있는
// 값으로 잡는다. 상한을 넘긴 완료(보너스 포함)는 습관 기록(체크/시간)은
// 그대로 남지만 카드는 더 지급하지 않는다.
export const DAILY_CARD_CAP = 10;

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

  const today = todayDateString(now);
  const createdToday = custom.filter(
    (m) => todayDateString(new Date(m.createdAt)) === today
  ).length;
  if (createdToday >= MAX_NEW_CUSTOM_PER_DAY) return { ok: false, error: "daily_limit_reached" };

  const mission = {
    id: `custom-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    label: trimmed,
    createdAt: now.toISOString(),
  };
  writeJSON(CUSTOM_KEY, [...custom, mission]);
  return { ok: true, mission };
}

// 오늘 이미 완료한 커스텀 미션은 삭제할 수 없다 — 허용하면 삭제 후 같은
// 이름으로 다시 등록해 새 id로 오늘 몫을 또 완료하는 식으로 카드 지급/완료
// 횟수를 무한정 파밍할 수 있게 된다(완료 기록은 id별로 남기 때문에 새
// id는 "오늘 안 한 미션" 취급됨). 완료된 미션은 다음날부터 삭제 가능하다.
export function removeCustomMission(id, now = new Date()) {
  if (isMissionCompletedToday(id, now)) return false;
  writeJSON(CUSTOM_KEY, getCustomMissions().filter((m) => m.id !== id));
  return true;
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

function logCompletion(missionId, now, cardAwarded) {
  const log = trimOldEntries(readLog(), now);
  log.push({ missionId, date: todayDateString(now), completedAt: now.toISOString(), cardAwarded });
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

// "오늘 완료 X/Y" 표시에 쓰는 값이라, Y(getAllMissions().length)와 항상 앞뒤가
// 맞아야 한다. 커스텀 미션은 완료한 당일엔 삭제할 수 없지만(파밍 방지 가드),
// 완료하지 않은 날 삭제되었거나 그보다 예전에(가드가 없던 버전 등으로) 지워진
// 미션의 완료 기록은 여전히 로그에 남아있을 수 있으므로, 지금 실제로 존재하는
// 미션의 기록만 센다 — 그래야 X가 현재 미션 수 Y를 넘는 일이 없다.
export function getTodayCompletedCount(now = new Date()) {
  const today = todayDateString(now);
  const currentMissionIds = new Set(getAllMissions().map((m) => m.id));
  return readLog().filter(
    (e) => e.date === today && e.missionId !== BONUS_MISSION_ID && currentMissionIds.has(e.missionId)
  ).length;
}

// 실제로 카드가 지급된 완료(일반 + 보너스 합산) 수 — 상한 판정과 "오늘 획득
// 카드" 표시에 쓴다. getTodayCompletedCount(습관 체크 수)와는 다르다: 상한을
// 넘긴 완료도 습관 체크로는 세지만 카드가 안 나왔으면 여기엔 안 잡힌다.
export function getCardsAwardedToday(now = new Date()) {
  const today = todayDateString(now);
  return readLog().filter((e) => e.date === today && e.cardAwarded).length;
}

export function isCardCapReachedToday(now = new Date()) {
  return getCardsAwardedToday(now) >= DAILY_CARD_CAP;
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
// cardResult는 오늘 카드 지급 상한(DAILY_CARD_CAP, 보너스 포함 합산)을
// 넘기면 null이 된다 — 그래도 완료 로그는 남으므로 습관 체크 자체는 상한과
// 무관하게 계속 유효하다.
export function completeMission(missionId, pokemonId, random = Math.random, now = new Date()) {
  if (isMissionCompletedToday(missionId, now)) return null;

  const withinCap = getCardsAwardedToday(now) < DAILY_CARD_CAP;
  const cardResult = withinCap ? awardCard(pokemonId, random) : null;
  logCompletion(missionId, now, withinCap);

  return { cardResult, allCompleted: isAllMissionsCompletedToday(now) };
}

// 보너스도 일반 미션과 같은 하루 상한(DAILY_CARD_CAP)을 공유한다 — 상한을
// 이미 다 썼으면 "전체 미션 완료" 자체는 기록되지만(isBonusAwardedToday가
// true가 됨) 카드는 지급하지 않는다.
export function completeBonus(pokemonId, random = Math.random, now = new Date()) {
  if (!isAllMissionsCompletedToday(now)) return null;
  if (isBonusAwardedToday(now)) return null;

  const withinCap = getCardsAwardedToday(now) < DAILY_CARD_CAP;
  const cardResult = withinCap ? awardCard(pokemonId, random) : null;
  logCompletion(BONUS_MISSION_ID, now, withinCap);

  return cardResult;
}
