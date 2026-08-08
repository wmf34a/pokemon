import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCareState,
  feed,
  play,
  sleep,
  canFeed,
  canPlay,
  canSleep,
  getFeedCooldownMs,
  getSleepCooldownMs,
  isAnyActionReady,
  getMoodLevel,
  resetCareState,
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

describe("액션 (쿨다운 기반)", () => {
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

  it("canFeed/canPlay/canSleep은 방금 했으면 false, 다른 액션은 영향받지 않는다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    expect(canFeed(now)).toBe(true);
    feed(now);
    expect(canFeed(now)).toBe(false);
    expect(canPlay(now)).toBe(true);
    expect(canSleep(now)).toBe(true);
  });

  it("쿨다운(밥주기 6시간)이 지나면 다시 할 수 있다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    feed(now);
    expect(canFeed(new Date(now.getTime() + 5 * 3_600_000))).toBe(false); // 5시간 후 — 아직
    expect(canFeed(new Date(now.getTime() + 6 * 3_600_000))).toBe(true); // 6시간 후 — 가능
  });

  it("getFeedCooldownMs는 남은 시간을 밀리초로 반환하고, 쿨다운이 끝나면 0이다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    feed(now);
    const oneHourLater = new Date(now.getTime() + 3_600_000);
    expect(getFeedCooldownMs(oneHourLater)).toBe(5 * 3_600_000); // 6시간 중 1시간 지남
    const afterCooldown = new Date(now.getTime() + 6 * 3_600_000);
    expect(getFeedCooldownMs(afterCooldown)).toBe(0);
  });

  it("재우기 쿨다운은 8시간이다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    sleep(now);
    expect(getSleepCooldownMs(new Date(now.getTime() + 7 * 3_600_000))).toBeGreaterThan(0);
    expect(getSleepCooldownMs(new Date(now.getTime() + 8 * 3_600_000))).toBe(0);
  });

  it("isAnyActionReady는 밥/놀기/재우기 중 하나라도 가능하면 true다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    expect(isAnyActionReady(now)).toBe(true); // 아무 것도 안 한 상태

    feed(now);
    play(now);
    sleep(now);
    expect(isAnyActionReady(now)).toBe(false); // 셋 다 방금 함 — 전부 쿨다운 중

    expect(isAnyActionReady(new Date(now.getTime() + 6 * 3_600_000))).toBe(true); // 밥/놀기 쿨다운 끝
  });
});

describe("resetCareState", () => {
  it("이전 포켓몬의 배고픔/행복/피로/쿨다운을 새 포켓몬에 물려주지 않고 기본값으로 되돌린다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    getCareState(now);
    feed(now); // 배고픔 90, lastFedAt = now
    play(now); // 행복 100, 피로 35

    const reset = resetCareState(new Date(now.getTime() + 60_000));
    expect(reset.hunger).toBe(80);
    expect(reset.happiness).toBe(80);
    expect(reset.fatigue).toBe(20);
    expect(canFeed(new Date(now.getTime() + 60_000))).toBe(true); // 쿨다운도 초기화됨
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
