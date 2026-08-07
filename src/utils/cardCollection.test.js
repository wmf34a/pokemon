import { describe, it, expect, beforeEach, vi } from "vitest";
import { rollGrade, awardCard, getCards, hasCard } from "./cardCollection";

beforeEach(() => {
  localStorage.clear();
});

describe("rollGrade", () => {
  it("난수 0 이상 0.5 미만이면 일반이다", () => {
    expect(rollGrade(() => 0)).toBe("common");
    expect(rollGrade(() => 0.4999)).toBe("common");
  });

  it("난수 0.5 이상 0.8 미만이면 보통이다", () => {
    expect(rollGrade(() => 0.5)).toBe("uncommon");
    expect(rollGrade(() => 0.7999)).toBe("uncommon");
  });

  it("난수 0.8 이상 0.95 미만이면 레어다", () => {
    expect(rollGrade(() => 0.8)).toBe("rare");
    expect(rollGrade(() => 0.9499)).toBe("rare");
  });

  it("난수 0.95 이상이면 초희귀다", () => {
    expect(rollGrade(() => 0.95)).toBe("legendary");
    expect(rollGrade(() => 0.999999)).toBe("legendary");
  });
});

describe("awardCard", () => {
  it("처음 뽑는 포켓몬이면 isNew:true와 함께 카드를 저장한다", () => {
    const result = awardCard(25, () => 0.9); // 0.9 -> rare
    expect(result).toEqual({ isNew: true, grade: "rare" });
    expect(getCards()[25]).toMatchObject({ grade: "rare" });
    expect(typeof getCards()[25].earnedAt).toBe("string");
  });

  it("이미 있는 포켓몬이면 재추첨하지 않고 기존 등급을 그대로 반환한다", () => {
    awardCard(25, () => 0); // common으로 고정
    const second = awardCard(25, () => 0.99); // legendary가 나올 난수를 줘도
    expect(second).toEqual({ isNew: false, grade: "common" }); // 그대로 common 유지
  });

  it("hasCard는 보유 여부를 정확히 반환한다", () => {
    expect(hasCard(25)).toBe(false);
    awardCard(25, () => 0);
    expect(hasCard(25)).toBe(true);
  });

  it("localStorage 접근이 실패해도 예외를 던지지 않고 등급을 반환한다", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => awardCard(25, () => 0)).not.toThrow();
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
