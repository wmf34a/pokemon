import { describe, it, expect } from "vitest";
import { getChosung, isChosungOnly, matchesQuery } from "./hangul";

describe("getChosung", () => {
  it("한글 이름을 초성으로 변환한다", () => {
    expect(getChosung("피카츄")).toBe("ㅍㅋㅊ");
  });

  it("한글이 아닌 문자는 그대로 둔다", () => {
    expect(getChosung("Pika1")).toBe("Pika1");
  });
});

describe("isChosungOnly", () => {
  it("초성으로만 이루어진 문자열을 true로 판정한다", () => {
    expect(isChosungOnly("ㅍㅋㅊ")).toBe(true);
  });

  it("완성형 한글이 섞이면 false를 반환한다", () => {
    expect(isChosungOnly("피카츄")).toBe(false);
  });
});

describe("matchesQuery", () => {
  it("초성 검색어로 이름을 매치한다", () => {
    expect(matchesQuery("피카츄", "ㅍㅋㅊ")).toBe(true);
    expect(matchesQuery("이상해씨", "ㅍㅋㅊ")).toBe(false);
  });

  it("완성형 검색어는 부분 문자열 매치를 사용한다", () => {
    expect(matchesQuery("피카츄", "카츄")).toBe(true);
  });

  it("빈 검색어는 항상 매치한다", () => {
    expect(matchesQuery("피카츄", "")).toBe(true);
  });
});
