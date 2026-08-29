import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildHints } from "./hintLadder";
import { APPEARANCE_HINTS } from "./appearanceHints";

const ALL = JSON.parse(readFileSync("public/data/pokemon.json", "utf8"));
const byName = (n) => ALL.find((p) => p.nameKo === n);

describe("buildHints", () => {
  it("1세대는 생김새 줄이 붙어 여섯 단계", () => {
    expect(buildHints(byName("이상해씨"))).toHaveLength(6);
  });

  it("2세대 이후는 다섯 단계", () => {
    const later = ALL.find((p) => p.generation !== "generation-i");
    expect(buildHints(later)).toHaveLength(5);
  });

  it("포켓몬이 없으면 빈 배열", () => {
    expect(buildHints(null)).toEqual([]);
  });

  it("빈 문장이 섞이지 않는다", () => {
    ALL.forEach((p) => {
      buildHints(p).forEach((line) => {
        expect(line.trim().length, p.nameKo).toBeGreaterThan(0);
      });
    });
  });
});

describe("이름이 새지 않는다", () => {
  /*
   * 이 퀴즈는 힌트가 곧 문제다. 힌트 어디엔가 이름이 들어 있으면 문제가 성립하지 않는다.
   * 분류명에 제 이름이 들어간 포켓몬이 실제로 있어서(모래뱀 ← "모래뱀포켓몬")
   * 전수로 확인한다.
   */
  it("1025마리 전부, 어느 힌트에도 제 한글 이름이 없다", () => {
    const leaked = ALL.filter((p) =>
      buildHints(p).some((line) => line.includes(p.nameKo))
    ).map((p) => p.nameKo);
    expect(leaked).toEqual([]);
  });

  it("영어 이름도 새지 않는다", () => {
    const leaked = ALL.filter((p) =>
      buildHints(p).some((line) => line.toLowerCase().includes(p.nameEn.toLowerCase()))
    ).map((p) => p.nameKo);
    expect(leaked).toEqual([]);
  });

  it("분류명에 제 이름이 든 포켓몬은 특성으로 바꿔 낸다", () => {
    const sandy = byName("모래뱀");
    const last = buildHints(sandy).at(-1);
    expect(last).not.toContain("모래뱀");
    expect(last).toContain("특성");
  });

  it("도감 설명 원문을 힌트로 쓰지 않는다", () => {
    ALL.slice(0, 200).forEach((p) => {
      if (!p.descriptionKo) return;
      buildHints(p).forEach((line) => {
        expect(line, p.nameKo).not.toContain(p.descriptionKo);
      });
    });
  });
});

describe("넓은 데서 좁은 데로", () => {
  it("첫 힌트는 세대, 마지막 힌트는 무엇으로 불리는지", () => {
    const hints = buildHints(byName("이상해씨"));
    expect(hints[0]).toContain("세대");
    expect(hints.at(-1)).toContain("불려요");
  });

  it("진화 힌트가 상대의 이름을 부르지 않는다", () => {
    // 이름을 부르면 거기서 퀴즈가 끝난다
    const hints = buildHints(byName("이상해풀"));
    expect(hints[3]).not.toContain("이상해씨");
    expect(hints[3]).toContain("진화");
  });

  it("전설은 진화 자리에서 알려준다", () => {
    expect(buildHints(byName("뮤츠"))[3]).toContain("전설");
  });

  it("진화도 전설도 아닌 포켓몬은 그렇게 말한다", () => {
    expect(buildHints(byName("메타몽"))[3]).toContain("진화하지 않는");
  });
});

describe("읽다가 걸리지 않는다", () => {
  it("복합 타입에 과/와를 받침대로 붙인다", () => {
    // "페어리과 강철" 이라고 쓰면 아이가 읽다가 걸린다
    const fairySteel = ALL.find(
      (p) => p.types.length === 2 && p.types[0] === "fairy" && p.types[1] === "steel"
    );
    if (fairySteel) expect(buildHints(fairySteel)[1]).toContain("페어리와 강철");
    expect(buildHints(byName("이상해씨"))[1]).toContain("풀과 독");
  });

  it("모든 힌트가 마침표로 끝난다", () => {
    ALL.forEach((p) => {
      buildHints(p).forEach((line) => {
        expect(line.endsWith("."), `${p.nameKo}: ${line}`).toBe(true);
      });
    });
  });
});

describe("다른 포켓몬의 이름도 부르지 않는다", () => {
  const NAMES = ALL.map((p) => p.nameKo);

  it("분류명이 다른 포켓몬 이름을 품으면 특성으로 바꿔 낸다", () => {
    // 사다이사의 분류명은 "모래뱀포켓몬"이다. 보기에 모래뱀이 끼면
    // 틀린 답을 가리키는 힌트가 된다 — 약한 힌트보다 나쁘다
    const last = buildHints(byName("사다이사"), NAMES).at(-1);
    expect(last).not.toContain("모래뱀");
    expect(last).toContain("특성");
  });

  it("1025마리 전부, 마지막 힌트가 어떤 포켓몬의 이름도 부르지 않는다", () => {
    const leaked = ALL.filter((p) => {
      const last = buildHints(p, NAMES).at(-1);
      return NAMES.some((n) => n && last.includes(n));
    }).map((p) => p.nameKo);
    expect(leaked).toEqual([]);
  });
});

describe("1세대 생김새 힌트", () => {
  const NAMES = ALL.map((p) => p.nameKo);
  const GEN1 = ALL.filter((p) => p.generation === "generation-i");

  it("1세대 151마리에 전부 있다", () => {
    expect(GEN1).toHaveLength(151);
    const missing = GEN1.filter((p) => !APPEARANCE_HINTS[p.id]).map((p) => p.nameKo);
    expect(missing).toEqual([]);
  });

  it("1세대 말고는 없다", () => {
    const stray = Object.keys(APPEARANCE_HINTS)
      .map(Number)
      .filter((id) => !GEN1.some((p) => p.id === id));
    expect(stray).toEqual([]);
  });

  it("어떤 포켓몬의 이름도 부르지 않는다", () => {
    const leaked = [];
    GEN1.forEach((p) => {
      const line = APPEARANCE_HINTS[p.id];
      NAMES.forEach((n) => {
        if (n && line.includes(n)) leaked.push(`${p.nameKo}: ${line} ← ${n}`);
      });
    });
    expect(leaked).toEqual([]);
  });

  it("도감 설명을 옮겨 적지 않았다", () => {
    GEN1.forEach((p) => {
      if (!p.descriptionKo) return;
      expect(APPEARANCE_HINTS[p.id]).not.toContain(p.descriptionKo);
    });
  });

  it("진화 힌트 다음, 분류명 힌트 앞에 온다", () => {
    // 넓은 데서 좁은 데로. 생김새는 분류명보다 넓다
    const hints = buildHints(byName("파이리"), NAMES);
    expect(hints[4]).toBe("꼬리 끝에 불이 켜져 있어요.");
    expect(hints[5]).toContain("불려요");
  });
});
