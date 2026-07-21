// public/data/pokemon.json 을 불러오고 정렬/필터하는 헬퍼

let cache = null;

export async function loadPokemonData() {
  if (cache) return cache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/pokemon.json`);
  if (!res.ok) {
    throw new Error(
      "포켓몬 데이터를 불러오지 못했습니다. scripts/fetch-pokemon-data.mjs 를 먼저 실행했는지 확인하세요."
    );
  }
  cache = await res.json();
  return cache;
}

export const SORT_OPTIONS = {
  NAME_KO: "이름(가나다순)",
  ID: "도감번호순",
  GENERATION: "세대순",
};

export function sortPokemon(list, sortKey) {
  const arr = [...list];
  switch (sortKey) {
    case SORT_OPTIONS.NAME_KO:
      return arr.sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));
    case SORT_OPTIONS.GENERATION:
      return arr.sort(
        (a, b) => a.generation.localeCompare(b.generation) || a.id - b.id
      );
    case SORT_OPTIONS.ID:
    default:
      return arr.sort((a, b) => a.id - b.id);
  }
}

export function getAllTypes(list) {
  const set = new Set();
  list.forEach((p) => p.types.forEach((t) => set.add(t)));
  return [...set].sort();
}

export const TYPE_LABEL_KO = {
  normal: "노멀",
  fire: "불꽃",
  water: "물",
  electric: "전기",
  grass: "풀",
  ice: "얼음",
  fighting: "격투",
  poison: "독",
  ground: "땅",
  flying: "비행",
  psychic: "에스퍼",
  bug: "벌레",
  rock: "바위",
  ghost: "고스트",
  dragon: "드래곤",
  dark: "악",
  steel: "강철",
  fairy: "페어리",
};

export const TYPE_COLOR = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

export function pickRandom(list, n = 1) {
  const copy = [...list];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// 퀴즈 문제 출제 범위를 1세대(#1~#151)로 제한하는 설정. localStorage에 저장해
// 퀴즈 허브에서 켜고 끄면 이후 모든 퀴즈 모드에 반영되도록 함.
const GEN1_ONLY_KEY = "pokemonQuiz.gen1Only";

export function getGen1OnlyPref() {
  try {
    return localStorage.getItem(GEN1_ONLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGen1OnlyPref(value) {
  try {
    localStorage.setItem(GEN1_ONLY_KEY, value ? "1" : "0");
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }
}

export function applyGen1OnlyFilter(list) {
  return getGen1OnlyPref()
    ? list.filter((p) => p.generation === "generation-i")
    : list;
}
