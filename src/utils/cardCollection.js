// 퀴즈 정답으로 얻는 포켓몬 카드 수집 시스템. myPokemon.js(진화 시스템)와는
// 완전히 별개의 localStorage 레코드로 관리하며, 서로 참조하지 않는다.

const KEY = "pokemonCards.v1";

export const GRADES = ["common", "uncommon", "rare", "legendary"];

export const GRADE_LABEL_KO = {
  common: "일반",
  uncommon: "보통",
  rare: "레어",
  legendary: "초희귀",
};

// src/index.css에 정의된 --card-grade-* 변수를 가리킨다.
export const GRADE_COLOR_VAR = {
  common: "var(--card-grade-common)",
  uncommon: "var(--card-grade-uncommon)",
  rare: "var(--card-grade-rare)",
  legendary: "var(--card-grade-legendary)",
};

// 등급별 누적 확률: 일반 50% / 보통 30% / 레어 15% / 초희귀 5%.
const GRADE_WEIGHTS = [
  { grade: "common", upTo: 50 },
  { grade: "uncommon", upTo: 80 },
  { grade: "rare", upTo: 95 },
  { grade: "legendary", upTo: 100 },
];

export function rollGrade(random = Math.random) {
  const roll = random() * 100;
  const match = GRADE_WEIGHTS.find((g) => roll < g.upTo);
  return (match || GRADE_WEIGHTS[GRADE_WEIGHTS.length - 1]).grade;
}

function readCards() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCards(cards) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }
  return cards;
}

export function getCards() {
  return readCards();
}

export function hasCard(pokemonId) {
  return Boolean(readCards()[pokemonId]);
}

export function awardCard(pokemonId, random = Math.random) {
  const cards = readCards();
  const existing = cards[pokemonId];
  if (existing) {
    return { isNew: false, grade: existing.grade };
  }

  const grade = rollGrade(random);
  writeCards({
    ...cards,
    [pokemonId]: { grade, earnedAt: new Date().toISOString() },
  });
  return { isNew: true, grade };
}
