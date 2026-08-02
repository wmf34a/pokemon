// 진화 순서 퀴즈(EvolutionQuiz)용 순수 로직.
// public/data/pokemon.json 전체 배열에서 무작위로 "진화 체인의 한 구간"(2~3단계)을
// 뽑아 정답 순서 배열로 반환한다. 이 파일은 React나 DOM에 의존하지 않아 단위
// 테스트가 가능하다(evolutionQuizChain.test.js 참고).
//
// 분기 진화(예: 이브이 -> 부스터/샤미드/쥬피썬더/…) 판단 규칙:
// 매 단계에서 evolvesTo[0]만 결정적으로 택해 한 갈래로만 진행한다. 분기가 있는
// 포켓몬을 아예 출제 후보에서 빼는 대신 이 방식을 택한 이유는, 이브이처럼 인기
// 있는 포켓몬을 후보 풀에서 통째로 제외하지 않으면서도 "정답은 항상 하나"임을
// 보장하기 위해서다(evolvesTo[0]는 항상 같은 원소이므로 매번 같은 정답이 나온다).

const MAX_CHAIN_LENGTH = 3;

// 출제 후보: 앞으로 더 진화할 수 있는(evolvesTo가 있는) 포켓몬 전체.
// 이미 최종 진화라 evolvesTo가 없는 포켓몬은 "순서"를 물을 거리가 없어 제외한다.
export function getEvolutionQuizCandidates(allPokemon) {
  return allPokemon.filter((p) => p.evolvesTo?.length > 0);
}

// startPokemon에서 시작해 evolvesTo[0]을 반복해서 따라가며 체인을 만든다.
// 최대 MAX_CHAIN_LENGTH단계까지, 또는 evolvesTo가 없는 최종 진화를 만날 때까지
// 진행한다. 다음 id가 allPokemon에 없으면(방어적, 데이터 누락) 지금까지 모은
// 체인에서 멈춘다.
export function buildEvolutionChain(startPokemon, allPokemon) {
  const byId = new Map(allPokemon.map((p) => [p.id, p]));
  const chain = [startPokemon];
  let current = startPokemon;
  while (chain.length < MAX_CHAIN_LENGTH && current.evolvesTo?.length > 0) {
    const next = byId.get(current.evolvesTo[0].id);
    if (!next) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

// 후보 중 하나를 무작위로 골라 정답 순서 체인을 만든다.
// 후보가 없거나(데이터 누락) 체인이 2단계 미만으로만 만들어지면(방어적 상황) null.
export function pickEvolutionQuizChain(allPokemon) {
  const candidates = getEvolutionQuizCandidates(allPokemon);
  if (candidates.length === 0) return null;
  const start = candidates[Math.floor(Math.random() * candidates.length)];
  const chain = buildEvolutionChain(start, allPokemon);
  return chain.length >= 2 ? chain : null;
}
