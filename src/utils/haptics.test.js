import { describe, it, expect, vi, afterEach } from "vitest";
import { vibrate } from "./haptics";

afterEach(() => {
  delete navigator.vibrate;
});

describe("vibrate", () => {
  it("navigator.vibrate가 없으면(jsdom 기본, iOS Safari와 동일한 상황) 예외 없이 무시한다", () => {
    expect(() => vibrate(200)).not.toThrow();
  });

  it("navigator.vibrate가 있으면 주어진 패턴으로 호출한다", () => {
    const spy = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
    vibrate(200);
    expect(spy).toHaveBeenCalledWith(200);
  });

  it("navigator.vibrate 호출이 예외를 던져도 밖으로 전파하지 않는다", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        throw new Error("blocked");
      },
      configurable: true,
    });
    expect(() => vibrate(200)).not.toThrow();
  });
});
