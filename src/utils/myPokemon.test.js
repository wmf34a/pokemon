import { describe, it, expect, beforeEach } from "vitest";
import {
  getMyPokemon,
  chooseStarter,
  getStarterCandidates,
  addPoints,
  resolveBranchEvolution,
  clearPendingEvolution,
  graduateAndRestart,
  resetMyPokemon,
  EVOLUTION_THRESHOLD,
} from "./myPokemon";

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

const venusaur = {
  id: 3,
  nameKo: "이상해꽃",
  evolutionStage: 3,
  evolvesTo: [],
};

const eevee = {
  id: 133,
  nameKo: "이브이",
  evolutionStage: 1,
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
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
      pendingBranchChoices: null,
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

  it("처음 시작하면 lifetimePoints/collection은 0/빈 배열이다", () => {
    const record = chooseStarter(bulbasaur, "몽몽이");
    expect(record.lifetimePoints).toBe(0);
    expect(record.collection).toEqual([]);
  });

  it("졸업(graduateAndRestart) 이후 다시 고르면 lifetimePoints/collection을 이어받는다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    graduateAndRestart();

    const record = chooseStarter(pikachu, "라이차");
    expect(record.lifetimePoints).toBe(50);
    expect(record.collection).toEqual([1]);
  });
});

describe("getStarterCandidates", () => {
  it("evolutionStage가 1이고 evolvesTo가 있는 포켓몬만 후보로 반환한다", () => {
    const all = [bulbasaur, pikachu, mewtwo, ivysaur];
    const candidates = getStarterCandidates(all);
    expect(candidates.map((p) => p.id)).toEqual([1, 25]);
  });
});

describe("addPoints", () => {
  it("내 포켓몬이 없으면 아무 것도 하지 않고 null을 반환한다", () => {
    expect(addPoints(30, bulbasaur)).toBe(null);
    expect(getMyPokemon()).toBe(null);
  });

  it("임계값 미만이면 진화 없이 포인트만 누적한다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    const result = addPoints(30, bulbasaur);

    expect(result).toEqual({
      evolved: false,
      branchChoicePending: false,
      newStageId: null,
      pointsSinceLastEvolution: 30,
    });
    const record = getMyPokemon();
    expect(record.pointsSinceLastEvolution).toBe(30);
    expect(record.lifetimePoints).toBe(30);
    expect(record.currentStageId).toBe(1);
  });

  it(`${EVOLUTION_THRESHOLD}점을 넘기면 초과분을 이월하고 단일 분기면 자동으로 진화한다`, () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(190, bulbasaur);
    const result = addPoints(30, bulbasaur);

    expect(result).toEqual({
      evolved: true,
      branchChoicePending: false,
      newStageId: 2,
      pointsSinceLastEvolution: 20,
    });
    const record = getMyPokemon();
    expect(record.currentStageId).toBe(2);
    expect(record.history).toEqual([1, 2]);
    expect(record.pointsSinceLastEvolution).toBe(20);
    expect(record.pendingEvolution).toBe(true);
    expect(record.pendingBranchChoices).toBe(null);
  });

  it("분기 진화(이브이)는 임계값을 넘겨도 자동으로 고르지 않고 선택 대기 상태로 남는다", () => {
    chooseStarter(eevee, "이브이");
    const result = addPoints(200, eevee);

    expect(result).toEqual({
      evolved: false,
      branchChoicePending: true,
      newStageId: null,
      pointsSinceLastEvolution: 0,
    });
    const record = getMyPokemon();
    expect(record.currentStageId).toBe(133); // 아직 안 바뀜
    expect(record.history).toEqual([133]);
    expect(record.pendingEvolution).toBe(true);
    expect(record.pendingBranchChoices).toEqual(eevee.evolvesTo);
  });

  it("최종 진화(evolvesTo 없음)는 임계값을 넘겨도 진화하지 않고 포인트만 쌓인다", () => {
    chooseStarter(venusaur, "이상해꽃");
    const result = addPoints(250, venusaur);

    expect(result).toEqual({
      evolved: false,
      branchChoicePending: false,
      newStageId: null,
      pointsSinceLastEvolution: 250,
    });
    const record = getMyPokemon();
    expect(record.currentStageId).toBe(3);
    expect(record.pendingEvolution).toBe(false);
  });
});

describe("resolveBranchEvolution", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(resolveBranchEvolution(134)).toBe(null);
  });

  it("분기 선택이 필요한 상태가 아니면 null을 반환하고 아무 것도 바꾸지 않는다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    expect(resolveBranchEvolution(2)).toBe(null);
    expect(getMyPokemon().currentStageId).toBe(1);
  });

  it("제시되지 않은 분기 id를 고르면 null을 반환하고 아무 것도 바꾸지 않는다", () => {
    chooseStarter(eevee, "이브이");
    addPoints(200, eevee);
    expect(resolveBranchEvolution(999)).toBe(null);
    expect(getMyPokemon().currentStageId).toBe(133);
  });

  it("유효한 분기를 고르면 currentStageId/history를 갱신하고 pendingEvolution은 유지한다", () => {
    chooseStarter(eevee, "이브이");
    addPoints(200, eevee);
    const record = resolveBranchEvolution(134);

    expect(record.currentStageId).toBe(134);
    expect(record.history).toEqual([133, 134]);
    expect(record.pendingEvolution).toBe(true);
    expect(record.pendingBranchChoices).toBe(null);
  });
});

describe("clearPendingEvolution", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(clearPendingEvolution()).toBe(null);
  });

  it("pendingEvolution/pendingBranchChoices를 모두 내린다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(190, bulbasaur);
    addPoints(30, bulbasaur);
    expect(getMyPokemon().pendingEvolution).toBe(true);

    const record = clearPendingEvolution();
    expect(record.pendingEvolution).toBe(false);
    expect(record.pendingBranchChoices).toBe(null);
    expect(getMyPokemon().pendingEvolution).toBe(false);
  });
});

describe("graduateAndRestart", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(graduateAndRestart()).toBe(null);
  });

  it("현재 포켓몬을 collection에 추가하고 getMyPokemon()이 null을 반환하게 만든다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    graduateAndRestart();

    expect(getMyPokemon()).toBe(null);
  });

  it("lifetimePoints/collection은 보존한 채로 currentStageId 등만 초기화한다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    graduateAndRestart();

    // getMyPokemon()으로는 확인할 수 없으므로(currentStageId가 null이라 무효 취급),
    // 다시 chooseStarter를 호출해 이어받는지로 간접 확인한다.
    const record = chooseStarter(pikachu, "라이차");
    expect(record.lifetimePoints).toBe(50);
    expect(record.collection).toEqual([1]);
  });
});

describe("resetMyPokemon", () => {
  it("내 포켓몬이 없으면 null을 반환한다", () => {
    expect(resetMyPokemon()).toBe(null);
  });

  it("완전 진화 전이어도 getMyPokemon()이 null을 반환하게 만든다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    resetMyPokemon();

    expect(getMyPokemon()).toBe(null);
  });

  it("graduateAndRestart와 달리 collection에 추가하지 않는다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    resetMyPokemon();

    const record = chooseStarter(pikachu, "라이차");
    expect(record.collection).toEqual([]); // 이상해씨가 들어가 있지 않아야 함
  });

  it("lifetimePoints는 보존한다", () => {
    chooseStarter(bulbasaur, "몽몽이");
    addPoints(50, bulbasaur);
    resetMyPokemon();

    const record = chooseStarter(pikachu, "라이차");
    expect(record.lifetimePoints).toBe(50);
  });
});
