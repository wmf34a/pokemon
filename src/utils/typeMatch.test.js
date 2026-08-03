import { describe, it, expect } from "vitest";
import { typesMatch } from "./typeMatch";

describe("typesMatch", () => {
  it("단일 타입이 같으면 true", () => {
    expect(typesMatch(["water"], ["water"])).toBe(true);
  });

  it("복합 타입이 순서만 달라도 true(순서 무관 비교)", () => {
    expect(typesMatch(["fire", "flying"], ["flying", "fire"])).toBe(true);
  });

  it("타입 개수가 다르면 false", () => {
    expect(typesMatch(["water"], ["water", "poison"])).toBe(false);
  });

  it("한 타입만 겹치고 나머지가 다르면 false", () => {
    expect(typesMatch(["water", "poison"], ["water", "flying"])).toBe(false);
  });

  it("완전히 다른 타입이면 false", () => {
    expect(typesMatch(["grass"], ["electric"])).toBe(false);
  });
});
