import { describe, it, expect, beforeEach } from "vitest";
import {
  sortPokemon,
  getAllTypes,
  getAllGenerations,
  GENERATION_LABEL_KO,
  getDexSortPref,
  setDexSortPref,
  getDexTypePref,
  setDexTypePref,
  getDexGenerationPref,
  setDexGenerationPref,
  getDexLegendaryPref,
  setDexLegendaryPref,
  getQuizGenerationsPref,
  setQuizGenerationsPref,
  applyQuizGenerationFilter,
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

describe("도감 타입 필터 저장", () => {
  beforeEach(() => localStorage.clear());

  it("저장한 타입을 돌려주고, 모르는 값은 무시한다", () => {
    expect(getDexTypePref()).toBe(null);
    setDexTypePref("fire");
    expect(getDexTypePref()).toBe("fire");
    localStorage.setItem("pokemonDex.type", "없는타입");
    expect(getDexTypePref()).toBe(null);
  });
});

describe("도감 전설·환상 필터", () => {
  beforeEach(() => localStorage.clear());

  it("켜고 끈 상태를 기억한다", () => {
    expect(getDexLegendaryPref()).toBe(false);
    setDexLegendaryPref(true);
    expect(getDexLegendaryPref()).toBe(true);
    setDexLegendaryPref(false);
    expect(getDexLegendaryPref()).toBe(false);
  });

});

describe("퀴즈 출제 세대 설정", () => {
  beforeEach(() => localStorage.clear());

  const list = [
    { id: 1, generation: "generation-i" },
    { id: 152, generation: "generation-ii" },
    { id: 252, generation: "generation-iii" },
  ];

  it("아무것도 고르지 않았으면 전체 포켓몬을 그대로 낸다", () => {
    expect(getQuizGenerationsPref()).toEqual([]);
    expect(applyQuizGenerationFilter(list)).toEqual(list);
  });

  it("고른 세대(여러 개 가능)의 포켓몬만 낸다", () => {
    setQuizGenerationsPref(["generation-ii", "generation-iii"]);
    expect(getQuizGenerationsPref()).toEqual(["generation-ii", "generation-iii"]);
    expect(applyQuizGenerationFilter(list).map((p) => p.id)).toEqual([152, 252]);
  });

  it("모르는 세대 값과 중복은 버리고 세대 순서로 저장한다", () => {
    setQuizGenerationsPref(["generation-iii", "generation-xxx", "generation-i", "generation-iii"]);
    expect(getQuizGenerationsPref()).toEqual(["generation-i", "generation-iii"]);
  });

  it("빈 배열을 저장하면 전체로 돌아간다", () => {
    setQuizGenerationsPref(["generation-i"]);
    setQuizGenerationsPref([]);
    expect(getQuizGenerationsPref()).toEqual([]);
  });

  it("예전 '1세대만' 설정을 쓰던 사람은 1세대 선택으로 이어받는다", () => {
    localStorage.setItem("pokemonQuiz.gen1Only", "1");
    expect(getQuizGenerationsPref()).toEqual(["generation-i"]);
    expect(applyQuizGenerationFilter(list).map((p) => p.id)).toEqual([1]);
  });

  it("새 설정을 저장하면 예전 설정은 더 이상 영향을 주지 않는다", () => {
    localStorage.setItem("pokemonQuiz.gen1Only", "1");
    setQuizGenerationsPref([]);
    expect(getQuizGenerationsPref()).toEqual([]);
  });
});
