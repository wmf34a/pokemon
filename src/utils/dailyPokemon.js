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
