import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDailyPokemon } from "./useDailyPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const bulbasaur = { id: 1, nameKo: "이상해씨" };
const pikachu = { id: 25, nameKo: "피카츄" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useDailyPokemon", () => {
  it("초기값은 undefined이고 데이터 로딩 후 오늘의 포켓몬 객체로 채워진다", async () => {
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);
    const { result } = renderHook(() => useDailyPokemon());

    expect(result.current).toBeUndefined();

    await waitFor(() => expect(result.current).not.toBeUndefined());
    expect([bulbasaur, pikachu]).toContainEqual(result.current);
  });

  it("전체 목록이 비어있으면 null을 반환한다", async () => {
    loadPokemonData.mockResolvedValue([]);
    const { result } = renderHook(() => useDailyPokemon());

    await waitFor(() => expect(result.current).toBeNull());
  });
});
