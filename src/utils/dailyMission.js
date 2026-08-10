// 일일 미션(생활 습관 체크) + 카드 보상 시스템. 카드 등급 로직은 새로 만들지
// 않고 cardCollection.js의 awardCard를 그대로 재사용한다. 이 모듈은 미션
// 카탈로그(기본 6개 + 오늘의 커스텀)와 완료 로그만 책임진다.
//
// 미션 목록은 자정에 "초기화"되지 않는다 — 초기화되는 건 완료 여부뿐이다.
// 다만 커스텀 미션은 매일 새로 정하는 것이라 다음날엔 사라진다(기본 미션
// 6개는 항상 있음). 그래서 하루에 볼 수 있는 미션 수는 6 + 오늘 만든 커스텀
// 수(최대 MAX_CUSTOM_PER_DAY)로, 항상 6~10 사이로 고정된다. 미션 하나 완료 =
// 카드 1장 확정 지급이고, 전체 완료 시 보너스 카드 1장이 더 나온다 — 미션
// 수 자체가 하루 최대 10개로 못박혀 있어서 하루 최대로 받을 수 있는 카드도
// 자연히 11장(미션 10 + 보너스 1)으로 고정되고, 그 이상을 막는 별도의 카드
// 상한 규칙은 필요 없다.

import { awardCard } from "./cardCollection";

const CUSTOM_KEY = "pokemonMissions.custom.v1";
const LOG_KEY = "pokemonMissions.log.v1";
const MAX_LABEL_LENGTH = 20;
const RETENTION_DAYS = 90;
const BONUS_MISSION_ID = "__bonus__";

// 커스텀 미션은 하루에 이 개수까지만 만들 수 있고, 다음날엔 자동으로 목록에서
// 빠진다(과거 완료 기록/주간 통계는 그대로 남는다 — 지워지는 건 "오늘의
// 미션 목록"뿐).
export const MAX_CUSTOM_PER_DAY = 4;

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

function readAllStoredCustom() {
  const list = readJSON(CUSTOM_KEY, []);
  return Array.isArray(list) ? list : [];
}

// 90일 지난 커스텀 미션 기록은 저장소에서 정리한다(오늘 목록 계산과는 무관 —
// 그냥 localStorage가 무한정 커지지 않게 하는 용도).
function trimOldCustom(list, now) {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  return list.filter((m) => new Date(m.createdAt).getTime() >= cutoff);
}

// 오늘 만든 커스텀 미션만 반환한다 — 다음날엔 자동으로 안 보인다.
export function getCustomMissions(now = new Date()) {
  const today = todayDateString(now);
  return readAllStoredCustom().filter((m) => todayDateString(new Date(m.createdAt)) === today);
}

export function addCustomMission(label, now = new Date()) {
  const trimmed = (label || "").trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (trimmed.length > MAX_LABEL_LENGTH) return { ok: false, error: "too_long" };

  const todayCustom = getCustomMissions(now);
  if (todayCustom.length >= MAX_CUSTOM_PER_DAY) return { ok: false, error: "limit_reached" };

  const mission = {
    id: `custom-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    label: trimmed,
    createdAt: now.toISOString(),
  };
  writeJSON(CUSTOM_KEY, [...trimOldCustom(readAllStoredCustom(), now), mission]);
  return { ok: true, mission };
}

// 오늘 이미 완료한 커스텀 미션은 삭제할 수 없다 — 허용하면 삭제 후 같은
// 이름으로 다시 등록해 새 id로 오늘 몫을 또 완료하는 식으로 카드 지급/완료
// 횟수를 파밍할 수 있게 된다(완료 기록은 id별로 남기 때문에 새 id는 "오늘
// 안 한 미션" 취급됨).
export function removeCustomMission(id, now = new Date()) {
  if (isMissionCompletedToday(id, now)) return false;
  writeJSON(CUSTOM_KEY, readAllStoredCustom().filter((m) => m.id !== id));
  return true;
}

export function getAllMissions(now = new Date()) {
  return [...DEFAULT_MISSIONS, ...getCustomMissions(now)];
}

function readLog() {
  const log = readJSON(LOG_KEY, []);
  return Array.isArray(log) ? log : [];
}

function trimOldLog(log, now) {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  return log.filter((entry) => new Date(entry.completedAt).getTime() >= cutoff);
}

function logCompletion(missionId, now) {
  const log = trimOldLog(readLog(), now);
  log.push({ missionId, date: todayDateString(now), completedAt: now.toISOString() });
  writeJSON(LOG_KEY, log);
}

export function isMissionCompletedToday(missionId, now = new Date()) {
  const today = todayDateString(now);
  return readLog().some((e) => e.missionId === missionId && e.date === today);
}

export function isAllMissionsCompletedToday(now = new Date()) {
  const missions = getAllMissions(now);
  return missions.length > 0 && missions.every((m) => isMissionCompletedToday(m.id, now));
}

export function isBonusAwardedToday(now = new Date()) {
  return isMissionCompletedToday(BONUS_MISSION_ID, now);
}

export function getMissionsWithStatus(now = new Date()) {
  const today = todayDateString(now);
  const log = readLog();
  return getAllMissions(now).map((m) => {
    const entry = log.find((e) => e.missionId === m.id && e.date === today);
    return { ...m, completedToday: Boolean(entry), completedAt: entry ? entry.completedAt : null };
  });
}

// "오늘 완료 X/Y" 표시에 쓰는 값이라, Y(getAllMissions(now).length)와 항상
// 앞뒤가 맞아야 한다. 커스텀 미션은 완료한 당일엔 삭제할 수 없지만, 예전
// 버전 데이터 등으로 지금 존재하지 않는 미션의 완료 기록이 로그에 남아있을
// 수 있으므로, 지금 실제로 존재하는 미션의 기록만 센다.
export function getTodayCompletedCount(now = new Date()) {
  const today = todayDateString(now);
  const currentMissionIds = new Set(getAllMissions(now).map((m) => m.id));
  return readLog().filter(
    (e) => e.date === today && e.missionId !== BONUS_MISSION_ID && currentMissionIds.has(e.missionId)
  ).length;
}

// 오늘 실제로 지급된 카드 수(일반 완료 + 보너스). 미션 수 자체가 하루
// 최대 10개로 고정돼 있어 카드 지급에 별도 상한을 걸 필요가 없다 — 완료한
// 만큼 그대로 카드가 나온다.
export function getCardsAwardedToday(now = new Date()) {
  return getTodayCompletedCount(now) + (isBonusAwardedToday(now) ? 1 : 0);
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

  const cardResult = awardCard(pokemonId, random);
  logCompletion(missionId, now);

  return { cardResult, allCompleted: isAllMissionsCompletedToday(now) };
}

export function completeBonus(pokemonId, random = Math.random, now = new Date()) {
  if (!isAllMissionsCompletedToday(now)) return null;
  if (isBonusAwardedToday(now)) return null;

  const cardResult = awardCard(pokemonId, random);
  logCompletion(BONUS_MISSION_ID, now);

  return cardResult;
}
