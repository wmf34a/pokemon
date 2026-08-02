import { describe, it, expect, beforeEach } from "vitest";
import { getMyPokemon, chooseStarter, getStarterCandidates } from "./myPokemon";

const bulbasaur = {
  id: 1,
  nameKo: "이상해씨",
  evolutionStage: 1,
  evolvesTo: [{ id: 2, minLevel: 16 }],
};

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  evolutionStage: 1,
  evolvesTo: [{ id: 26, minLevel: null }],
};

const mewtwo = {
  id: 150,
  nameKo: "뮤츠",
  evolutionStage: 1,
  evolvesTo: [],
};

const ivysaur = {
  id: 2,
  nameKo: "이상해풀",
  evolutionStage: 2,
  evolvesTo: [{ id: 3, minLevel: 32 }],
};

beforeEach(() => {
  localStorage.clear();
});

describe("getMyPokemon", () => {
  it("저장된 값이 없으면 null을 반환한다", () => {
    expect(getMyPokemon()).toBe(null);
  });

  it("저장된 JSON이 손상되었으면 null을 반환한다", () => {
    localStorage.setItem("pokemonMine.v1", "{ not valid json");
    expect(getMyPokemon()).toBe(null);
  });

  it("저장된 값이 필수 필드가 없는 객체면 null을 반환한다", () => {
    localStorage.setItem("pokemonMine.v1", JSON.stringify({ nickname: "몽몽이" }));
    expect(getMyPokemon()).toBe(null);
  });

  it("chooseStarter로 저장한 값을 그대로 읽어온다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    expect(getMyPokemon()).toEqual({
      starterId: 1,
      nickname: "몽몽이",
      currentStageId: 1,
      history: [1],
      pointsSinceLastEvolution: 0,
      lifetimePoints: 0,
      pendingEvolution: false,
      collection: [],
    });
  });
});

describe("chooseStarter", () => {
  it("닉네임이 공백이면 포켓몬의 nameKo를 기본값으로 사용한다", () => {
    const record = chooseStarter(bulbasaur, "   ");
    expect(record.nickname).toBe("이상해씨");
  });

  it("닉네임 앞뒤 공백은 제거한다", () => {
    const record = chooseStarter(bulbasaur, "  몽몽이  ");
    expect(record.nickname).toBe("몽몽이");
  });
});

describe("getStarterCandidates", () => {
  it("evolutionStage가 1이고 evolvesTo가 있는 포켓몬만 후보로 반환한다", () => {
    const all = [bulbasaur, pikachu, mewtwo, ivysaur];
    const candidates = getStarterCandidates(all);
    expect(candidates.map((p) => p.id)).toEqual([1, 25]);
  });
});
