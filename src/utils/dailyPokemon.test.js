import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTodayDateString, getDailyPokemonId } from "./dailyPokemon";

const allPokemon = Array.from({ length: 151 }, (_, i) => ({ id: i + 1 }));

beforeEach(() => {
  localStorage.clear();
});

describe("getTodayDateString", () => {
  it("Date를 YYYY-MM-DD로 포맷한다", () => {
    const d = new Date(2026, 7, 7); // month is 0-indexed: 7 = August
    expect(getTodayDateString(d)).toBe("2026-08-07");
  });

  it("한 자리 월/일은 0으로 패딩한다", () => {
    const d = new Date(2026, 0, 5);
    expect(getTodayDateString(d)).toBe("2026-01-05");
  });
});

describe("getDailyPokemonId", () => {
  it("같은 날짜로 두 번 호출하면 같은 id를 반환한다(새로고침해도 유지)", () => {
    const first = getDailyPokemonId(allPokemon, "2026-08-07");
    const second = getDailyPokemonId(allPokemon, "2026-08-07");
    expect(second).toBe(first);
  });

  it("날짜가 바뀌면 저장된 값을 재계산한다", () => {
    const day1 = getDailyPokemonId(allPokemon, "2026-08-07");
    const raw = JSON.parse(localStorage.getItem("pokemonDaily.v1"));
    expect(raw.date).toBe("2026-08-07");
    expect(raw.pokemonId).toBe(day1);

    getDailyPokemonId(allPokemon, "2026-08-08");
    const raw2 = JSON.parse(localStorage.getItem("pokemonDaily.v1"));
    expect(raw2.date).toBe("2026-08-08");
  });

  it("같은 날짜 문자열이면 항상 같은 id를 결정적으로 계산한다(다른 인스턴스/재계산에도 동일)", () => {
    const a = getDailyPokemonId(allPokemon, "2026-08-07");
    localStorage.clear();
    const b = getDailyPokemonId(allPokemon, "2026-08-07");
    expect(a).toBe(b);
  });

  it("전체 포켓몬 목록이 비어있으면 null을 반환한다", () => {
    expect(getDailyPokemonId([], "2026-08-07")).toBeNull();
  });

  it("localStorage 접근이 실패해도 예외를 던지지 않고 id를 반환한다", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => getDailyPokemonId(allPokemon, "2026-08-07")).not.toThrow();
    spy.mockRestore();
    setSpy.mockRestore();
  });
});
