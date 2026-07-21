import { describe, it, expect } from "vitest";
import {
  sortPokemon,
  getAllTypes,
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
