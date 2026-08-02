// "내 포켓몬" 선택/현재 상태를 localStorage에 저장하는 모듈.
// pokemonData.js의 getGen1OnlyPref/setGen1OnlyPref와 동일하게, localStorage 접근
// 실패(시크릿 모드 등)나 저장된 값이 손상된 경우 모두 조용히 안전한 기본값으로 처리한다.

const KEY = "pokemonMine.v1";

// 저장된 "내 포켓몬" 레코드를 반환한다.
// 저장된 값이 없거나, JSON 파싱에 실패하거나, 필수 필드가 없는 손상된 값이면 null.
export function getMyPokemon() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.currentStageId !== "number" ||
    typeof parsed.starterId !== "number"
  ) {
    return null;
  }

  return parsed;
}

// 스타터 포켓몬 선택 시 전체 레코드를 초기화해 저장한다.
// nickname이 빈 값(공백만 있어도)이면 포켓몬의 한국어 이름(nameKo)을 기본값으로 사용한다.
export function chooseStarter(pokemon, nickname) {
  const trimmed = (nickname || "").trim();
  const record = {
    starterId: pokemon.id,
    nickname: trimmed || pokemon.nameKo,
    currentStageId: pokemon.id,
    history: [pokemon.id],
    pointsSinceLastEvolution: 0,
    lifetimePoints: 0,
    pendingEvolution: false,
    collection: [],
  };

  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서는 조용히 무시
  }

  return record;
}

// 스타터로 고를 수 있는 후보: 1단계이면서 진화 가능한(evolvesTo가 있는) 포켓몬.
// 전설/신화 포켓몬은 대부분 진화가 없어 이 조건만으로 자연히 제외된다.
export function getStarterCandidates(allPokemon) {
  return allPokemon.filter(
    (p) => p.evolutionStage === 1 && p.evolvesTo?.length > 0
  );
}
