import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAwardPoints } from "./useMyPokemonPoints";
import { chooseStarter } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const bulbasaur = { id: 1, nameKo: "이상해씨", evolvesTo: [{ id: 2, minLevel: 16 }] };
const ivysaur = { id: 2, nameKo: "이상해풀", evolvesTo: [{ id: 3, minLevel: 32 }] };
const eevee = {
  id: 133,
  nameKo: "이브이",
  evolvesTo: [
    { id: 134, minLevel: null },
    { id: 135, minLevel: null },
  ],
};
const vaporeon = { id: 134, nameKo: "샤미드" };
const jolteon = { id: 135, nameKo: "쥬피썬더" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useAwardPoints", () => {
  it("내 포켓몬 레코드가 없으면 null을 반환하고 데이터를 불러오지 않는다", async () => {
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(30);
    expect(outcome).toBeNull();
    expect(loadPokemonData).not.toHaveBeenCalled();
  });

  it("임계값을 넘기지 않으면 evolved:false, newStagePokemon:null을 반환한다", async () => {
    chooseStarter(bulbasaur, "친구");
    loadPokemonData.mockResolvedValue([bulbasaur, ivysaur]);
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(10);
    expect(outcome).toEqual({
      evolved: false,
      branchChoicePending: false,
      newStagePokemon: null,
    });
  });

  it("단일 진화 시 evolved:true와 새 단계 포켓몬 객체를 반환한다", async () => {
    chooseStarter(bulbasaur, "친구");
    loadPokemonData.mockResolvedValue([bulbasaur, ivysaur]);
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(200);
    expect(outcome).toEqual({
      evolved: true,
      branchChoicePending: false,
      newStagePokemon: ivysaur,
    });
  });

  it("분기 진화 대기 시 branchChoicePending:true, newStagePokemon:null을 반환한다", async () => {
    chooseStarter(eevee, "친구");
    loadPokemonData.mockResolvedValue([eevee, vaporeon, jolteon]);
    const { result } = renderHook(() => useAwardPoints());
    const outcome = await result.current(200);
    expect(outcome).toEqual({
      evolved: false,
      branchChoicePending: true,
      newStagePokemon: null,
    });
  });
});
