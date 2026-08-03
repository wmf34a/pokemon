import { describe, it, expect } from "vitest";
import { buildEvolutionFamily } from "./evolutionFamily";

const bulbasaur = { id: 1, nameKo: "이상해씨", evolvesFrom: null, evolvesTo: [{ id: 2, minLevel: 16 }] };
const ivysaur = { id: 2, nameKo: "이상해풀", evolvesFrom: 1, evolvesTo: [{ id: 3, minLevel: 32 }] };
const venusaur = { id: 3, nameKo: "이상해꽃", evolvesFrom: 2, evolvesTo: [] };

const eevee = {
  id: 133,
  nameKo: "이브이",
  evolvesFrom: null,
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
};
const vaporeon = { id: 134, nameKo: "샤미드", evolvesFrom: 133, evolvesTo: [] };
const jolteon = { id: 135, nameKo: "쥬피썬더", evolvesFrom: 133, evolvesTo: [] };

const mewtwo = { id: 150, nameKo: "뮤츠", evolvesFrom: null, evolvesTo: [] };

describe("buildEvolutionFamily", () => {
  it("선형 3단 진화는 [스타트],[중간],[최종] 3단계로 반환한다", () => {
    const all = [bulbasaur, ivysaur, venusaur];
    expect(buildEvolutionFamily(venusaur, all)).toEqual([
      [bulbasaur],
      [ivysaur],
      [venusaur],
    ]);
  });

  it("중간 단계에서 조회해도 항상 stage 1부터 시작한다(뒤로 거슬러 올라감)", () => {
    const all = [bulbasaur, ivysaur, venusaur];
    expect(buildEvolutionFamily(ivysaur, all)).toEqual([
      [bulbasaur],
      [ivysaur],
      [venusaur],
    ]);
  });

  it("분기 진화는 2단계에서 여러 갈래를 모두 배열에 담는다", () => {
    const all = [eevee, vaporeon, jolteon];
    const family = buildEvolutionFamily(eevee, all);
    expect(family).toHaveLength(2);
    expect(family[0]).toEqual([eevee]);
    expect(family[1].map((p) => p.id).sort()).toEqual([134, 135]);
  });

  it("진화 계보가 없는 포켓몬은 자기 자신 하나만 있는 1단계를 반환한다", () => {
    const all = [mewtwo];
    expect(buildEvolutionFamily(mewtwo, all)).toEqual([[mewtwo]]);
  });

  it("evolvesFrom이 allPokemon에 없는 id를 가리키면(방어적) 거기서 역행을 멈춘다", () => {
    const orphan = { id: 999, nameKo: "고아", evolvesFrom: 12345, evolvesTo: [] };
    expect(buildEvolutionFamily(orphan, [orphan])).toEqual([[orphan]]);
  });
});
