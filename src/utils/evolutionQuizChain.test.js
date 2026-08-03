import { describe, it, expect } from "vitest";
import {
  getEvolutionQuizCandidates,
  buildEvolutionChain,
  pickEvolutionQuizChain,
} from "./evolutionQuizChain";

const bulbasaur = { id: 1, nameKo: "이상해씨", evolvesTo: [{ id: 2, minLevel: 16 }] };
const ivysaur = { id: 2, nameKo: "이상해풀", evolvesTo: [{ id: 3, minLevel: 32 }] };
const venusaur = { id: 3, nameKo: "이상해꽃", evolvesTo: [] };
const eevee = {
  id: 133,
  nameKo: "이브이",
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
};
const vaporeon = { id: 134, nameKo: "샤미드", evolvesTo: [] };
const jolteon = { id: 135, nameKo: "쥬피썬더", evolvesTo: [] };
const mewtwo = { id: 150, nameKo: "뮤츠", evolvesTo: [] };
const brokenLink = { id: 999, nameKo: "고장난고리", evolvesTo: [{ id: 12345, minLevel: 1 }] };

const all = [bulbasaur, ivysaur, venusaur, eevee, vaporeon, jolteon, mewtwo, brokenLink];

describe("getEvolutionQuizCandidates", () => {
  it("evolvesTo가 있는(최종 진화가 아닌) 포켓몬만 후보로 반환한다", () => {
    const candidates = getEvolutionQuizCandidates(all);
    expect(candidates.map((p) => p.id)).toEqual([1, 2, 133, 999]);
  });
});

describe("buildEvolutionChain", () => {
  it("선형 3단 진화는 시작점부터 끝까지 순서대로 모은다", () => {
    const chain = buildEvolutionChain(bulbasaur, all);
    expect(chain.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("중간 단계에서 시작하면 그 지점부터의 체인만 모은다", () => {
    const chain = buildEvolutionChain(ivysaur, all);
    expect(chain.map((p) => p.id)).toEqual([2, 3]);
  });

  it("분기 진화는 evolvesTo[0]만 결정적으로 따라간다", () => {
    const chain = buildEvolutionChain(eevee, all);
    expect(chain.map((p) => p.id)).toEqual([133, 134]);
  });

  it("최대 3단계까지만 모은다", () => {
    const chain = buildEvolutionChain(bulbasaur, all);
    expect(chain.length).toBeLessThanOrEqual(3);
  });

  it("다음 단계 id가 데이터에 없으면(방어적) 지금까지 모은 체인에서 멈춘다", () => {
    const chain = buildEvolutionChain(brokenLink, all);
    expect(chain.map((p) => p.id)).toEqual([999]);
  });
});

describe("pickEvolutionQuizChain", () => {
  it("후보가 없으면 null을 반환한다", () => {
    expect(pickEvolutionQuizChain([mewtwo, venusaur])).toBe(null);
  });

  it("체인이 2단계 미만으로만 만들어지면(방어적 상황) null을 반환한다", () => {
    expect(pickEvolutionQuizChain([brokenLink])).toBe(null);
  });

  it("후보 중 하나를 골라 2~3단계짜리 체인을 반환한다", () => {
    // brokenLink는 무작위로 뽑히면 항상 null이 나오는 방어적 케이스라(위 테스트에서
    // 별도로 검증) 이 성공 경로 테스트에서는 제외해 결과가 항상 결정적이게 한다.
    const validCandidates = [bulbasaur, ivysaur, venusaur, eevee, vaporeon, jolteon];
    const chain = pickEvolutionQuizChain(validCandidates);
    expect(chain).not.toBe(null);
    expect(chain.length).toBeGreaterThanOrEqual(2);
    expect(chain.length).toBeLessThanOrEqual(3);
  });
});
