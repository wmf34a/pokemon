import { describe, it, expect } from "vitest";
import { getChosung, isChosungOnly, matchesQuery, hasJongseong, josa } from "./hangul";

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

describe("hasJongseong", () => {
  it("받침이 있으면 true", () => {
    expect(hasJongseong("강철")).toBe(true);
    expect(hasJongseong("불꽃")).toBe(true);
  });

  it("받침이 없으면 false", () => {
    expect(hasJongseong("페어리")).toBe(false);
    expect(hasJongseong("바위")).toBe(false);
  });

  it("한글이 아닌 글자로 끝나면 없는 것으로 본다", () => {
    expect(hasJongseong("Pikachu")).toBe(false);
    expect(hasJongseong("")).toBe(false);
  });
});

describe("josa", () => {
  it("받침에 따라 과/와를 고른다", () => {
    expect(josa("강철", "과", "와")).toBe("과");
    expect(josa("페어리", "과", "와")).toBe("와");
  });
});
