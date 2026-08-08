import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_MISSIONS,
  DAILY_CARD_CAP,
  getCustomMissions,
  addCustomMission,
  removeCustomMission,
  getAllMissions,
  getMissionsWithStatus,
  isMissionCompletedToday,
  completeMission,
  completeBonus,
  getTodayCompletedCount,
  getWeeklyCompletedCount,
  getCardsAwardedToday,
  isCardCapReachedToday,
  isBonusAwardedToday,
} from "./dailyMission";

beforeEach(() => {
  localStorage.clear();
});

describe("DEFAULT_MISSIONS", () => {
  it("기본 미션 6개가 고정되어 있다", () => {
    expect(DEFAULT_MISSIONS).toHaveLength(6);
    expect(DEFAULT_MISSIONS.map((m) => m.id)).toContain("gotoSchool");
    expect(DEFAULT_MISSIONS.map((m) => m.id)).toContain("sleepOnTime");
  });
});

describe("커스텀 미션 관리", () => {
  it("정상적인 라벨로 추가하면 ok:true와 함께 저장된다", () => {
    const result = addCustomMission("숙제하기");
    expect(result.ok).toBe(true);
    expect(getCustomMissions()).toHaveLength(1);
    expect(getCustomMissions()[0].label).toBe("숙제하기");
  });

  it("공백만 있는 라벨은 거부한다", () => {
    const result = addCustomMission("   ");
    expect(result).toEqual({ ok: false, error: "empty" });
    expect(getCustomMissions()).toHaveLength(0);
  });

  it("20자를 초과하면 거부한다", () => {
    const result = addCustomMission("가".repeat(21));
    expect(result).toEqual({ ok: false, error: "too_long" });
  });

  it("10개를 초과하면 거부한다", () => {
    for (let i = 0; i < 10; i++) addCustomMission(`미션${i}`);
    const result = addCustomMission("11번째");
    expect(result).toEqual({ ok: false, error: "limit_reached" });
    expect(getCustomMissions()).toHaveLength(10);
  });

  it("삭제하면 해당 미션만 제거된다", () => {
    addCustomMission("A");
    const { mission } = addCustomMission("B");
    removeCustomMission(mission.id);
    expect(getCustomMissions().map((m) => m.label)).toEqual(["A"]);
  });

  it("getAllMissions는 기본 미션 뒤에 커스텀 미션을 이어붙인다", () => {
    addCustomMission("숙제하기");
    const all = getAllMissions();
    expect(all).toHaveLength(7);
    expect(all[6].label).toBe("숙제하기");
  });
});

describe("completeMission", () => {
  it("처음 완료하면 카드 결과와 함께 로그가 남는다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    const result = completeMission("gotoSchool", 25, () => 0, now);
    expect(result.cardResult).toEqual({ isNew: true, grade: "common" });
    expect(isMissionCompletedToday("gotoSchool", now)).toBe(true);
  });

  it("같은 날 같은 미션을 두 번 완료하면 null을 반환한다(취소/재완료 불가)", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission("gotoSchool", 25, () => 0, now);
    expect(completeMission("gotoSchool", 1, () => 0, now)).toBeNull();
  });

  it("이미 보유한 포켓몬이 뽑히면 재추첨 없이 기존 등급 그대로 온다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission("gotoSchool", 25, () => 0, now); // 25번 최초 획득(common)
    const result = completeMission("comeHome", 25, () => 0.9, now); // 같은 25번, legendary 나올 난수를 줘도
    expect(result.cardResult).toEqual({ isNew: false, grade: "common" });
  });

  it("기본 미션 6개를 모두 완료한 순간에만 allCompleted:true를 반환한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    const ids = DEFAULT_MISSIONS.map((m) => m.id);
    ids.slice(0, -1).forEach((id, i) => {
      const result = completeMission(id, i + 1, () => 0, now);
      expect(result.allCompleted).toBe(false);
    });
    const last = completeMission(ids[ids.length - 1], 99, () => 0, now);
    expect(last.allCompleted).toBe(true);
  });

  it("하루 카드 지급 상한(DAILY_CARD_CAP)을 넘긴 완료는 cardResult:null이지만 로그는 남는다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    for (let i = 0; i < DAILY_CARD_CAP; i++) {
      addCustomMission(`미션${i}`, now);
    }
    const customIds = getCustomMissions().map((m) => m.id);

    // 커스텀 미션만으로 이미 상한(DAILY_CARD_CAP)만큼 완료 — 전부 카드 지급됨
    customIds.forEach((id, i) => {
      const result = completeMission(id, i + 1, () => 0, now);
      expect(result.cardResult).not.toBeNull();
    });
    expect(isCardCapReachedToday(now)).toBe(true);

    // 상한을 넘긴 다음 완료(기본 미션 하나)는 카드 없이 로그만 남는다
    const overCap = completeMission("gotoSchool", 999, () => 0, now);
    expect(overCap.cardResult).toBeNull();
    expect(isMissionCompletedToday("gotoSchool", now)).toBe(true);
  });
});

describe("completeBonus", () => {
  it("전체 미션을 완료하기 전에는 null을 반환한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, now);
    expect(completeBonus(999, () => 0, now)).toBeNull();
  });

  it("전체 미션 완료 후 한 번만 보너스 카드를 지급한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    DEFAULT_MISSIONS.forEach((m, i) => completeMission(m.id, i + 1, () => 0, now));
    const bonus = completeBonus(999, () => 0.9, now);
    expect(bonus).toEqual({ isNew: true, grade: "rare" });
    expect(completeBonus(998, () => 0, now)).toBeNull(); // 이미 지급됨
  });

  it("보너스도 같은 하루 카드 상한을 공유한다 — 일반 완료로 상한을 다 썼으면 보너스는 카드 없이 완료만 기록된다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    addCustomMission("커스텀1", now);
    addCustomMission("커스텀2", now); // 기본 6 + 커스텀 2 = 8개 = 상한과 정확히 같음

    const allIds = getAllMissions().map((m) => m.id);
    allIds.forEach((id, i) => {
      const result = completeMission(id, i + 1, () => 0, now);
      expect(result.cardResult).not.toBeNull(); // 8개까지는 전부 카드 지급, 상한 정확히 소진
    });
    expect(isCardCapReachedToday(now)).toBe(true);

    const bonus = completeBonus(999, () => 0, now);
    expect(bonus).toBeNull(); // 상한을 이미 다 써서 보너스는 카드 없음
    expect(isBonusAwardedToday(now)).toBe(true); // 그래도 "전체 완료" 자체는 기록됨
  });
});

describe("통계", () => {
  it("getTodayCompletedCount는 오늘 완료한 미션 수(보너스 제외)를 센다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, now);
    completeMission(DEFAULT_MISSIONS[1].id, 2, () => 0, now);
    expect(getTodayCompletedCount(now)).toBe(2);
  });

  it("getWeeklyCompletedCount는 이번 주(월요일부터) 완료 수를 센다", () => {
    const monday = new Date("2026-08-03T09:00:00.000Z"); // 2026-08-03은 월요일
    const friday = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, monday);
    completeMission(DEFAULT_MISSIONS[1].id, 2, () => 0, friday);
    expect(getWeeklyCompletedCount(friday)).toBe(2);
  });

  it("getCardsAwardedToday는 습관 체크 수가 아니라 실제 카드 지급 수(상한 반영)를 센다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    for (let i = 0; i < DAILY_CARD_CAP + 2; i++) addCustomMission(`미션${i}`, now);
    const customIds = getCustomMissions().map((m) => m.id);

    customIds.forEach((id, i) => completeMission(id, i + 1, () => 0, now));

    // 습관 체크는 DAILY_CARD_CAP+2번 다 기록되지만
    expect(getTodayCompletedCount(now)).toBe(DAILY_CARD_CAP + 2);
    // 카드는 상한(DAILY_CARD_CAP)만큼만 실제로 지급된다
    expect(getCardsAwardedToday(now)).toBe(DAILY_CARD_CAP);
  });
});

describe("getMissionsWithStatus", () => {
  it("완료한 미션은 completedToday:true와 completedAt을 함께 반환한다", () => {
    const now = new Date("2026-08-07T09:02:11.000Z");
    completeMission("gotoSchool", 1, () => 0, now);
    const list = getMissionsWithStatus(now);
    const done = list.find((m) => m.id === "gotoSchool");
    expect(done.completedToday).toBe(true);
    expect(done.completedAt).toBe(now.toISOString());
    const notDone = list.find((m) => m.id === "comeHome");
    expect(notDone.completedToday).toBe(false);
    expect(notDone.completedAt).toBeNull();
  });
});

describe("방어적 동작", () => {
  it("localStorage 접근이 실패해도 예외를 던지지 않는다", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => completeMission("gotoSchool", 1, () => 0)).not.toThrow();
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
