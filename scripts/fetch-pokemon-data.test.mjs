import { describe, it, expect } from "vitest";
import { idFromUrl, findChainNode, extractEvolutionInfo } from "./evolutionChain.mjs";

// 이브이 계열을 흉내낸 가짜 체인 트리 (분기 진화, 1단계에서 바로 갈림)
const eeveeChain = {
  species: { name: "eevee", url: "https://pokeapi.co/api/v2/pokemon-species/133/" },
  evolution_details: [],
  evolves_to: [
    {
      species: { name: "vaporeon", url: "https://pokeapi.co/api/v2/pokemon-species/134/" },
      evolution_details: [{ min_level: null }],
      evolves_to: [],
    },
    {
      species: { name: "jolteon", url: "https://pokeapi.co/api/v2/pokemon-species/135/" },
      evolution_details: [{ min_level: null }],
      evolves_to: [],
    },
  ],
};

// 이상해씨 계열을 흉내낸 가짜 체인 트리 (선형 3단 진화)
const bulbasaurChain = {
  species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
  evolution_details: [],
  evolves_to: [
    {
      species: { name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon-species/2/" },
      evolution_details: [{ min_level: 16 }],
      evolves_to: [
        {
          species: { name: "venusaur", url: "https://pokeapi.co/api/v2/pokemon-species/3/" },
          evolution_details: [{ min_level: 32 }],
          evolves_to: [],
        },
      ],
    },
  ],
};

describe("idFromUrl", () => {
  it("URL 마지막 경로 세그먼트를 숫자 id로 추출한다", () => {
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon-species/2/")).toBe(2);
    expect(idFromUrl("https://pokeapi.co/api/v2/evolution-chain/1/")).toBe(1);
  });

  it("url이 없으면 null을 반환한다", () => {
    expect(idFromUrl(null)).toBe(null);
    expect(idFromUrl(undefined)).toBe(null);
    expect(idFromUrl("")).toBe(null);
  });
});

describe("findChainNode", () => {
  it("루트 노드를 찾으면 depth 1, parentId null을 반환한다", () => {
    const found = findChainNode(bulbasaurChain, "bulbasaur");
    expect(found.depth).toBe(1);
    expect(found.parentId).toBe(null);
  });

  it("중간 단계 노드를 찾으면 depth 2, parentId는 루트의 id다", () => {
    const found = findChainNode(bulbasaurChain, "ivysaur");
    expect(found.depth).toBe(2);
    expect(found.parentId).toBe(1);
  });

  it("마지막 단계 노드를 찾으면 depth 3, parentId는 중간 단계의 id다", () => {
    const found = findChainNode(bulbasaurChain, "venusaur");
    expect(found.depth).toBe(3);
    expect(found.parentId).toBe(2);
  });

  it("체인에 없는 이름이면 null을 반환한다", () => {
    expect(findChainNode(bulbasaurChain, "pikachu")).toBe(null);
  });
});

describe("extractEvolutionInfo", () => {
  it("선형 진화의 1단계는 evolvesFrom null, evolvesTo에 다음 단계 하나", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "bulbasaur");
    expect(info).toEqual({
      evolutionStage: 1,
      evolvesFrom: null,
      evolvesTo: [{ id: 2, minLevel: 16 }],
    });
  });

  it("선형 진화의 중간 단계는 evolvesFrom에 이전 단계 id가 들어간다", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "ivysaur");
    expect(info).toEqual({
      evolutionStage: 2,
      evolvesFrom: 1,
      evolvesTo: [{ id: 3, minLevel: 32 }],
    });
  });

  it("최종 진화는 evolvesTo가 빈 배열이다", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "venusaur");
    expect(info).toEqual({ evolutionStage: 3, evolvesFrom: 2, evolvesTo: [] });
  });

  it("분기 진화(이브이)는 evolvesTo에 여러 원소가 들어간다", () => {
    const info = extractEvolutionInfo(eeveeChain, "eevee");
    expect(info.evolutionStage).toBe(1);
    expect(info.evolvesFrom).toBe(null);
    expect(info.evolvesTo).toEqual([
      { id: 134, minLevel: null },
      { id: 135, minLevel: null },
    ]);
  });

  it("체인에서 종을 찾지 못하면 1단계/진화없음으로 방어적으로 처리한다", () => {
    const info = extractEvolutionInfo(bulbasaurChain, "missingno");
    expect(info).toEqual({ evolutionStage: 1, evolvesFrom: null, evolvesTo: [] });
  });
});
