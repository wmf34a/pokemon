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
