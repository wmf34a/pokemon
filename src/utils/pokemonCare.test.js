import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCareState,
  feed,
  play,
  sleep,
  canFeedToday,
  canPlayToday,
  canSleepToday,
  getMoodLevel,
} from "./pokemonCare";

beforeEach(() => {
  localStorage.clear();
});

describe("getCareState", () => {
  it("첫 호출이면 기본값(배고픔80/행복80/피로20)으로 초기화한다", () => {
    const state = getCareState(new Date("2026-08-07T09:00:00.000Z"));
    expect(state.hunger).toBe(80);
    expect(state.happiness).toBe(80);
    expect(state.fatigue).toBe(20);
  });

  it("경과 시간(시간 단위)만큼 배고픔/행복은 깎이고 피로는 오른다", () => {
    getCareState(new Date("2026-08-07T09:00:00.000Z"));
    const state = getCareState(new Date("2026-08-07T19:00:00.000Z")); // 10시간 경과
    expect(state.hunger).toBe(60); // 80 - 10*2
    expect(state.happiness).toBe(70); // 80 - 10*1
    expect(state.fatigue).toBe(30); // 20 + 10*1
  });

  it("0~100 범위를 벗어나지 않는다(클램프)", () => {
    getCareState(new Date("2026-08-07T09:00:00.000Z"));
    const state = getCareState(new Date("2026-08-10T17:00:00.000Z")); // 80시간 경과
    expect(state.hunger).toBe(0);
    expect(state.happiness).toBe(0);
    expect(state.fatigue).toBe(100);
  });

  it("localStorage 접근이 실패해도 예외를 던지지 않는다", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => getCareState()).not.toThrow();
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});

describe("액션 (1일 1회 제한)", () => {
  it("feed()는 배고픔을 50 올리고, 같은 시각(같은 날) 두 번째 호출은 추가로 올리지 않는다", () => {
    const start = new Date("2026-08-07T09:00:00.000Z");
    getCareState(start);
    // 클램프에 걸리지 않게 20시간 지나 배고픔을 40까지 내린 뒤 확인한다
    // (80에서 바로 먹이면 30이든 50이든 100으로 클램프되어 보너스 값을 구분 못 함).
    const later = new Date("2026-08-08T05:00:00.000Z");
    const decayed = getCareState(later);
    expect(decayed.hunger).toBe(40); // 80 - 20*2
    const first = feed(later);
    expect(first.hunger).toBe(90); // clamp(40+50)
    const second = feed(later);
    expect(second.hunger).toBe(90); // 오늘 두 번째 호출은 무시
  });

  it("하루 1번씩 밥주기를 반복해도 배고픔이 0으로 수렴하지 않는다(순감소 없음)", () => {
    let now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    let last;
    for (let day = 0; day < 5; day++) {
      now = new Date(now.getTime() + 24 * 3_600_000);
      last = feed(now);
    }
    expect(last.hunger).toBeGreaterThanOrEqual(80); // 5일 연속 하루 1번씩 챙겨도 초기값 이상 유지
  });

  it("play()는 행복 +25, 피로 +15를 적용한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    const result = play(now);
    expect(result.happiness).toBe(100); // clamp(80+25)
    expect(result.fatigue).toBe(35); // 20+15
  });

  it("sleep()은 피로 -40을 적용한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    const result = sleep(now);
    expect(result.fatigue).toBe(0); // clamp(20-40)
  });

  it("canFeedToday/canPlayToday/canSleepToday는 오늘 이미 했으면 false를 반환한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    expect(canFeedToday(now)).toBe(true);
    feed(now);
    expect(canFeedToday(now)).toBe(false);
    expect(canPlayToday(now)).toBe(true);
    expect(canSleepToday(now)).toBe(true);
  });

  it("날짜가 바뀌면 다시 액션을 할 수 있다", () => {
    const day1 = new Date("2026-08-07T09:00:00.000Z");
    getCareState(day1);
    feed(day1);
    expect(canFeedToday(day1)).toBe(false);

    const day2 = new Date("2026-08-08T09:00:00.000Z");
    expect(canFeedToday(day2)).toBe(true);
  });
});

describe("getMoodLevel", () => {
  it("종합 점수 70 이상이면 happy다", () => {
    expect(getMoodLevel({ hunger: 90, happiness: 90, fatigue: 10 })).toBe("happy");
  });
  it("종합 점수 40~69면 normal이다", () => {
    expect(getMoodLevel({ hunger: 50, happiness: 50, fatigue: 50 })).toBe("normal");
  });
  it("종합 점수 20~39면 tired다", () => {
    expect(getMoodLevel({ hunger: 30, happiness: 20, fatigue: 70 })).toBe("tired");
  });
  it("종합 점수 20 미만이면 grumpy다", () => {
    expect(getMoodLevel({ hunger: 5, happiness: 5, fatigue: 95 })).toBe("grumpy");
  });
});
