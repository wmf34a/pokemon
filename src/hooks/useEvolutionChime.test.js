import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEvolutionChime } from "./useEvolutionChime";

describe("useEvolutionChime", () => {
  it("AudioContext가 없는 환경(jsdom)에서도 예외 없이 호출된다", () => {
    const { result } = renderHook(() => useEvolutionChime());
    expect(() => result.current()).not.toThrow();
  });
});
