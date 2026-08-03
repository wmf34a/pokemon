// 도감 상세 화면(PokemonDetail)의 "진화" 섹션용 순수 로직.
// evolvesFrom을 따라 계보의 시작(1단계)까지 거슬러 올라간 뒤, evolvesTo를 따라
// 앞으로 걸어가며 단계별 배열을 만든다. 한 단계에 여러 갈래(예: 이브이)가 있으면
// 그 단계의 배열에 모두 담는다.
//
// 반환값: [[stage1Pokemon], [stage2PokemonOrBranches...], ...] — 단계가 하나뿐이고
// 그 단계에도 자기 자신 하나만 있으면(진화 계보가 아예 없는 포켓몬) [[pokemon]]을 반환한다.
export function buildEvolutionFamily(pokemon, allPokemon) {
  const byId = new Map(allPokemon.map((p) => [p.id, p]));

  let root = pokemon;
  while (root.evolvesFrom != null && byId.has(root.evolvesFrom)) {
    root = byId.get(root.evolvesFrom);
  }

  const stages = [];
  const seen = new Set();
  let currentStage = [root];
  while (currentStage.length > 0) {
    stages.push(currentStage);
    currentStage.forEach((p) => seen.add(p.id));

    const nextIds = new Set();
    currentStage.forEach((p) => {
      (p.evolvesTo || []).forEach((e) => nextIds.add(e.id));
    });

    currentStage = [...nextIds]
      .map((id) => byId.get(id))
      .filter((p) => p && !seen.has(p.id));
  }

  return stages;
}
