import { describe, it, expect, beforeEach } from "vitest";
import {
  sortPokemon,
  getAllTypes,
  getAllGenerations,
  GENERATION_LABEL_KO,
  getDexSortPref,
  setDexSortPref,
  getDexGenerationPref,
  setDexGenerationPref,
  pickRandom,
  SORT_OPTIONS,
} from "./pokemonData";

const sample = [
  { id: 25, nameKo: "피카츄", generation: "generation-i", types: ["electric"] },
  { id: 1, nameKo: "이상해씨", generation: "generation-i", types: ["grass", "poison"] },
  { id: 150, nameKo: "뮤츠", generation: "generation-i", types: ["psychic"] },
];

describe("sortPokemon", () => {
  it("도감번호순으로 정렬한다", () => {
    const sorted = sortPokemon(sample, SORT_OPTIONS.ID);
    expect(sorted.map((p) => p.id)).toEqual([1, 25, 150]);
  });

  it("가나다순으로 정렬한다", () => {
    const sorted = sortPokemon(sample, SORT_OPTIONS.NAME_KO);
    expect(sorted.map((p) => p.nameKo)).toEqual(["뮤츠", "이상해씨", "피카츄"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...sample];
    sortPokemon(sample, SORT_OPTIONS.NAME_KO);
    expect(sample).toEqual(original);
  });
});

describe("getAllTypes", () => {
  it("중복 없이 타입 목록을 반환한다", () => {
    expect(getAllTypes(sample)).toEqual(
      ["electric", "grass", "poison", "psychic"].sort()
    );
  });
});

describe("pickRandom", () => {
  it("요청한 개수만큼 중복 없이 뽑는다", () => {
    const picked = pickRandom(sample, 2);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((p) => p.id)).size).toBe(2);
  });

  it("목록보다 많이 요청하면 목록 전체 길이만큼만 반환한다", () => {
    const picked = pickRandom(sample, 10);
    expect(picked).toHaveLength(sample.length);
  });
});

describe("getAllGenerations", () => {
  it("데이터에 있는 세대만 1세대→9세대 순서로 돌려준다", () => {
    const list = [
      { generation: "generation-iii" },
      { generation: "generation-i" },
      { generation: "generation-iii" },
    ];
    expect(getAllGenerations(list)).toEqual(["generation-i", "generation-iii"]);
    expect(GENERATION_LABEL_KO["generation-iii"]).toBe("3세대");
  });
});

describe("도감 세대 필터 저장", () => {
  beforeEach(() => localStorage.clear());

  it("저장한 세대를 그대로 돌려주고, null 이면 지운다", () => {
    expect(getDexGenerationPref()).toBe(null);
    setDexGenerationPref("generation-iii");
    expect(getDexGenerationPref()).toBe("generation-iii");
    setDexGenerationPref(null);
    expect(getDexGenerationPref()).toBe(null);
  });

  it("모르는 값이 들어 있으면 무시한다", () => {
    localStorage.setItem("pokemonDex.generation", "generation-xxx");
    expect(getDexGenerationPref()).toBe(null);
  });
});

describe("도감 정렬 저장", () => {
  beforeEach(() => localStorage.clear());

  it("저장 안 했으면 가나다순, 저장하면 그 값을 돌려준다", () => {
    expect(getDexSortPref()).toBe(SORT_OPTIONS.NAME_KO);
    setDexSortPref(SORT_OPTIONS.GENERATION);
    expect(getDexSortPref()).toBe(SORT_OPTIONS.GENERATION);
  });

  it("모르는 값이 들어 있으면 기본값으로 되돌린다", () => {
    localStorage.setItem("pokemonDex.sort", "없는정렬");
    expect(getDexSortPref()).toBe(SORT_OPTIONS.NAME_KO);
  });
});
