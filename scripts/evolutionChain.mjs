/**
 * 진화 체인(evolution chain) 트리를 순수하게 다루는 헬퍼 함수 모음.
 * 네트워크 호출(fetch-pokemon-data.mjs)과 분리되어 있어 단위 테스트가 가능하다
 * (fetch-pokemon-data.test.mjs 참고). 이 파일은 import 시 아무 부수효과도 없다.
 *
 * PokeAPI evolution-chain 응답의 `chain` 트리 형태:
 * {
 *   species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
 *   evolution_details: [],              // 루트는 항상 비어있음
 *   evolves_to: [
 *     {
 *       species: { name: "ivysaur", url: ".../pokemon-species/2/" },
 *       evolution_details: [{ min_level: 16, ... }],
 *       evolves_to: [ ... ]
 *     }
 *   ]
 * }
 */

// URL 마지막 경로 세그먼트를 숫자 id로 추출.
// 예) "https://pokeapi.co/api/v2/pokemon-species/2/" -> 2
export function idFromUrl(url) {
  if (!url) return null;
  const segments = url.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

// 체인 트리를 재귀적으로 순회해 speciesName과 이름이 일치하는 노드를 찾는다.
// 반환값: { node, depth (루트=1), parentId (없으면 null) } | null
export function findChainNode(root, speciesName, depth = 1, parentId = null) {
  if (!root) return null;
  if (root.species?.name === speciesName) {
    return { node: root, depth, parentId };
  }
  const nextParentId = idFromUrl(root.species?.url);
  for (const child of root.evolves_to || []) {
    const found = findChainNode(child, speciesName, depth + 1, nextParentId);
    if (found) return found;
  }
  return null;
}

// speciesName에 해당하는 evolutionStage/evolvesFrom/evolvesTo를 계산.
// 체인에서 찾지 못하면(방어적 상황) 1단계 + 진화 없음으로 처리한다.
export function extractEvolutionInfo(chainRoot, speciesName) {
  const found = findChainNode(chainRoot, speciesName);
  if (!found) {
    return { evolutionStage: 1, evolvesFrom: null, evolvesTo: [] };
  }
  const { node, depth, parentId } = found;
  const evolvesTo = (node.evolves_to || []).map((child) => ({
    id: idFromUrl(child.species?.url),
    minLevel: child.evolution_details?.[0]?.min_level ?? null,
  }));
  return { evolutionStage: depth, evolvesFrom: parentId, evolvesTo };
}
