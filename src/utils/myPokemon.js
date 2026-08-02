// "내 포켓몬" 선택/현재 상태를 localStorage에 저장하는 모듈.
// pokemonData.js의 getGen1OnlyPref/setGen1OnlyPref와 동일하게, localStorage 접근
// 실패(시크릿 모드 등)나 저장된 값이 손상된 경우 모두 조용히 안전한 기본값으로 처리한다.
//
// 레코드 형태 (localStorage key: "pokemonMine.v1"):
// {
//   starterId: number|null,          // 처음 고른 포켓몬 id. "졸업"/리셋 직후에는 null.
//   nickname: string|null,
//   currentStageId: number|null,     // 지금 형태의 포켓몬 id. "졸업"/리셋 직후에는 null.
//   history: number[],               // 지금까지 거쳐온 진화 단계 id 배열
//   pointsSinceLastEvolution: number,
//   lifetimePoints: number,          // "졸업"/리셋 후에도 유지됨
//   pendingEvolution: boolean,       // 홈 화면에서 진화 연출을 재생해야 하는지
//   pendingBranchChoices: Array<{id:number, minLevel:number|null}>|null,
//     // 분기 진화(예: 이브이) 임계값은 넘겼지만 아직 어떤 모습으로 진화할지 아이가
//     // 고르지 않은 상태. null이면 선택할 분기가 없음(진화 없음, 또는 이미 해결됨).
//   collection: number[],            // 완전 진화 후 "졸업"시킨 이전 포켓몬 id 목록. "졸업"/리셋 후에도 유지됨.
// }

const KEY = "pokemonMine.v1";

// 다음 진화까지 필요한 누적 포인트 임계값. 튜닝 가능하도록 상수로 분리(스펙 명시 사항).
export const EVOLUTION_THRESHOLD = 200;

// localStorage에 저장된 원시 JSON을 필드 유효성 검사 없이 읽어온다.
// getMyPokemon()과 달리 currentStageId/starterId가 없어도(졸업/리셋 직후 등) null을
// 반환하지 않는다. chooseStarter가 "졸업"/리셋 이후에도 lifetimePoints/collection을
// 이어받기 위해 내부적으로만 사용한다.
function readRawRecord() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
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

// 저장된 "내 포켓몬" 레코드를 반환한다.
// 저장된 값이 없거나, JSON 파싱에 실패하거나, 필수 필드가 없는 손상된 값이면(또는
// graduateAndRestart/resetMyPokemon 직후처럼 currentStageId/starterId가 null이면) null.
export function getMyPokemon() {
  const parsed = readRawRecord();
  if (
    !parsed ||
    typeof parsed.currentStageId !== "number" ||
    typeof parsed.starterId !== "number"
  ) {
    return null;
  }
  return parsed;
}

// 스타터 포켓몬 선택 시 전체 레코드를 초기화해 저장한다.
// nickname이 빈 값(공백만 있어도)이면 포켓몬의 한국어 이름(nameKo)을 기본값으로 사용한다.
// 이전에 "졸업"/리셋한 기록이 있다면(레코드는 남아있지만 currentStageId가 null인 상태)
// lifetimePoints/collection은 이어받는다 — 스펙상 두 값은 여러 번의 "새 친구 고르기"를
// 거쳐도 초기화되지 않아야 하기 때문.
export function chooseStarter(pokemon, nickname) {
  const trimmed = (nickname || "").trim();
  const previous = readRawRecord();
  const preservedLifetimePoints =
    typeof previous?.lifetimePoints === "number" ? previous.lifetimePoints : 0;
  const preservedCollection = Array.isArray(previous?.collection)
    ? previous.collection
    : [];

  const record = {
    starterId: pokemon.id,
    nickname: trimmed || pokemon.nameKo,
    currentStageId: pokemon.id,
    history: [pokemon.id],
    pointsSinceLastEvolution: 0,
    lifetimePoints: preservedLifetimePoints,
    pendingEvolution: false,
    pendingBranchChoices: null,
    collection: preservedCollection,
  };

  return writeRecord(record);
}

// 스타터로 고를 수 있는 후보: 1단계이면서 진화 가능한(evolvesTo가 있는) 포켓몬.
// 전설/신화 포켓몬은 대부분 진화가 없어 이 조건만으로 자연히 제외된다.
export function getStarterCandidates(allPokemon) {
  return allPokemon.filter(
    (p) => p.evolutionStage === 1 && p.evolvesTo?.length > 0
  );
}

// 퀴즈 정답으로 얻은 포인트를 "내 포켓몬"에 적립한다.
// currentStagePokemon은 호출하는 쪽(퀴즈 화면 또는 useAwardPoints 훅)이
// public/data/pokemon.json 전체에서 record.currentStageId로 찾아 넘겨주는, evolvesTo를
// 포함한 전체 엔트리다(이 모듈은 그 데이터셋을 직접 알지 못한다).
//
// 반환값:
//  - 내 포켓몬이 아직 없으면(getMyPokemon()이 null) null (방어적, 아무 것도 하지 않음).
//  - 그 외에는 항상 { evolved, branchChoicePending, newStageId, pointsSinceLastEvolution } 객체.
//    - evolved: true면 이번 호출로 단일 분기 진화가 "자동으로" 완료됨(currentStageId가 이미 갱신됨).
//    - branchChoicePending: true면 임계값은 넘었지만 분기가 여러 개라 자동으로 고르지
//      않았음(record.pendingBranchChoices에 후보가 저장되고, currentStageId는 아직 그대로).
//    - evolved와 branchChoicePending은 동시에 true일 수 없다.
//    - newStageId: evolved가 true일 때만 값이 있고, 그 외엔 null.
// 임계값을 초과한 만큼의 포인트는 버리지 않고 다음 주기로 이월한다(예: 190 + 30 = 220 →
// 진화 후 pointsSinceLastEvolution은 20).
export function addPoints(points, currentStagePokemon) {
  const record = getMyPokemon();
  if (!record) return null;

  const rawTotal = record.pointsSinceLastEvolution + points;
  const lifetimePoints = record.lifetimePoints + points;
  const evolvesTo = currentStagePokemon?.evolvesTo || [];
  const crossedThreshold = evolvesTo.length > 0 && rawTotal >= EVOLUTION_THRESHOLD;

  if (!crossedThreshold) {
    writeRecord({ ...record, pointsSinceLastEvolution: rawTotal, lifetimePoints });
    return {
      evolved: false,
      branchChoicePending: false,
      newStageId: null,
      pointsSinceLastEvolution: rawTotal,
    };
  }

  const remainder = rawTotal - EVOLUTION_THRESHOLD;

  if (evolvesTo.length === 1) {
    const newStageId = evolvesTo[0].id;
    writeRecord({
      ...record,
      pointsSinceLastEvolution: remainder,
      lifetimePoints,
      currentStageId: newStageId,
      history: [...record.history, newStageId],
      pendingEvolution: true,
      pendingBranchChoices: null,
    });
    return {
      evolved: true,
      branchChoicePending: false,
      newStageId,
      pointsSinceLastEvolution: remainder,
    };
  }

  // 분기 진화(예: 이브이의 evolvesTo.length > 1): 자동으로 하나를 고르지 않는다.
  // currentStageId/history는 그대로 두고, 어떤 분기가 가능한지만 저장해 홈 화면에서
  // 아이가 직접 고를 수 있게 한다 (resolveBranchEvolution 참고).
  writeRecord({
    ...record,
    pointsSinceLastEvolution: remainder,
    lifetimePoints,
    pendingEvolution: true,
    pendingBranchChoices: evolvesTo,
  });
  return {
    evolved: false,
    branchChoicePending: true,
    newStageId: null,
    pointsSinceLastEvolution: remainder,
  };
}

// 분기 진화 선택 화면(홈 화면)에서 아이가 고른 분기를 확정한다.
// pendingBranchChoices에 없는 id를 넘기거나, 애초에 분기 선택이 필요한 상태가
// 아니면(내 포켓몬이 없거나 pendingBranchChoices가 비어있으면) 아무 것도 하지 않고
// null을 반환한다.
// 확정 후에도 pendingEvolution은 true로 남아있다 — 홈 화면이 "짠! 진화했어요" 리빌
// 연출을 아직 보여줘야 하기 때문이며, 다 보여준 뒤에는 clearPendingEvolution을 호출한다.
export function resolveBranchEvolution(chosenId) {
  const record = getMyPokemon();
  if (
    !record ||
    !Array.isArray(record.pendingBranchChoices) ||
    record.pendingBranchChoices.length === 0
  ) {
    return null;
  }
  const isValidChoice = record.pendingBranchChoices.some((b) => b.id === chosenId);
  if (!isValidChoice) return null;

  return writeRecord({
    ...record,
    currentStageId: chosenId,
    history: [...record.history, chosenId],
    pendingEvolution: true,
    pendingBranchChoices: null,
  });
}

// 진화 리빌 연출을 다 보여준 뒤 호출해 pendingEvolution을 내린다.
// (evolvesTo가 비어있는데 pendingEvolution이 true인 방어적 상황도 이 함수 하나로
// 처리된다 — 호출하는 쪽이 연출 없이 그냥 이 함수만 부르면 됨.)
// 내 포켓몬이 없으면 아무 것도 하지 않는다.
export function clearPendingEvolution() {
  const record = getMyPokemon();
  if (!record) return null;
  return writeRecord({
    ...record,
    pendingEvolution: false,
    pendingBranchChoices: null,
  });
}

// 최종 진화(evolvesTo.length === 0)에 도달한 뒤 "새 친구 고르기"를 선택했을 때 호출한다.
// (이 함수 스스로는 실제로 evolvesTo.length === 0인지 검증하지 않는다 — 그 버튼을
// 보여줄지 말지는 호출하는 화면(MyPokemon.jsx)이 이미 판단해서 걸러주기 때문.)
// 지금 포켓몬을 collection에 추가하고, starterId/currentStageId 등을 다시 null로
// 되돌려 getMyPokemon()이 null을 반환하게 만든다(→ 앱이 자연히 /mine/choose로 라우팅됨).
// lifetimePoints와 collection은 초기화하지 않는다(스펙 명시 사항).
// 내 포켓몬이 없으면(이미 졸업했거나 애초에 없으면) 아무 것도 하지 않는다.
export function graduateAndRestart() {
  const record = getMyPokemon();
  if (!record) return null;

  return writeRecord({
    starterId: null,
    nickname: null,
    currentStageId: null,
    history: [],
    pointsSinceLastEvolution: 0,
    lifetimePoints: record.lifetimePoints,
    pendingEvolution: false,
    pendingBranchChoices: null,
    collection: [...record.collection, record.currentStageId],
  });
}

// "다시 선택"(완전 진화 여부와 무관하게 언제든 다른 포켓몬으로 바꾸고 싶을 때) 호출한다.
// graduateAndRestart와 초기화되는 필드는 동일하지만, 지금 포켓몬을 collection에
// 추가하지 않는다는 점이 다르다 — collection은 "완전 진화까지 마친" 포켓몬만
// 담는 갤러리라는 의미를 지키기 위해, 아직 안 끝난 포켓몬을 그냥 그만두는 경우는
// 거기 들어가지 않는다. lifetimePoints는 그대로 보존한다(포인트는 실력의 척도이지
// 어떤 포켓몬을 키우고 있었는지와 무관하기 때문).
// 내 포켓몬이 없으면 아무 것도 하지 않는다.
export function resetMyPokemon() {
  const record = getMyPokemon();
  if (!record) return null;

  return writeRecord({
    starterId: null,
    nickname: null,
    currentStageId: null,
    history: [],
    pointsSinceLastEvolution: 0,
    lifetimePoints: record.lifetimePoints,
    pendingEvolution: false,
    pendingBranchChoices: null,
    collection: record.collection,
  });
}
