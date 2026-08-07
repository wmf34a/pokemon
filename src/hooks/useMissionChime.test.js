import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMissionChime } from "./useMissionChime";

describe("useMissionChime", () => {
  it("AudioContext가 없는 환경(jsdom)에서도 예외 없이 호출된다", () => {
    const { result } = renderHook(() => useMissionChime());
    expect(() => result.current()).not.toThrow();
  });
});
