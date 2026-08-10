import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_MISSIONS,
  MAX_CUSTOM_PER_DAY,
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
    const now = new Date("2026-08-07T09:00:00.000Z");
    const result = addCustomMission("숙제하기", now);
    expect(result.ok).toBe(true);
    expect(getCustomMissions(now)).toHaveLength(1);
    expect(getCustomMissions(now)[0].label).toBe("숙제하기");
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

  it("하루에 MAX_CUSTOM_PER_DAY개를 초과하면 거부한다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    for (let i = 0; i < MAX_CUSTOM_PER_DAY; i++) addCustomMission(`미션${i}`, now);
    const result = addCustomMission("초과분", now);
    expect(result).toEqual({ ok: false, error: "limit_reached" });
    expect(getCustomMissions(now)).toHaveLength(MAX_CUSTOM_PER_DAY);
  });

  it("다음날에는 다시 MAX_CUSTOM_PER_DAY개까지 만들 수 있다", () => {
    const today = new Date("2026-08-07T09:00:00.000Z");
    for (let i = 0; i < MAX_CUSTOM_PER_DAY; i++) addCustomMission(`미션${i}`, today);

    const tomorrow = new Date("2026-08-08T09:00:00.000Z");
    expect(addCustomMission("새미션", tomorrow).ok).toBe(true);
  });

  it("커스텀 미션은 다음날이 되면 목록에서 자동으로 사라진다(자정 리셋)", () => {
    const today = new Date("2026-08-07T09:00:00.000Z");
    addCustomMission("오늘만유효", today);
    expect(getCustomMissions(today)).toHaveLength(1);

    const tomorrow = new Date("2026-08-08T09:00:00.000Z");
    expect(getCustomMissions(tomorrow)).toHaveLength(0);
    expect(getAllMissions(tomorrow)).toHaveLength(DEFAULT_MISSIONS.length);
  });

  it("삭제하면 해당 미션만 제거된다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    addCustomMission("A", now);
    const { mission } = addCustomMission("B", now);
    removeCustomMission(mission.id, now);
    expect(getCustomMissions(now).map((m) => m.label)).toEqual(["A"]);
  });

  it("오늘 이미 완료한 커스텀 미션은 삭제할 수 없다(삭제 후 재등록으로 재완료하는 파밍 방지)", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    const { mission } = addCustomMission("숙제하기", now);
    completeMission(mission.id, 1, () => 0, now);

    const removed = removeCustomMission(mission.id, now);
    expect(removed).toBe(false);
    expect(getCustomMissions(now)).toHaveLength(1); // 그대로 남아있음
  });

  it("getAllMissions는 기본 미션 뒤에 오늘의 커스텀 미션을 이어붙인다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    addCustomMission("숙제하기", now);
    const all = getAllMissions(now);
    expect(all).toHaveLength(DEFAULT_MISSIONS.length + 1);
    expect(all[DEFAULT_MISSIONS.length].label).toBe("숙제하기");
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

  it("미션 완료는 카드 지급 상한 없이 매번 확정 지급된다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    for (let i = 0; i < MAX_CUSTOM_PER_DAY; i++) addCustomMission(`미션${i}`, now);
    const allIds = getAllMissions(now).map((m) => m.id); // 6 + 4 = 10개
    allIds.forEach((id, i) => {
      const result = completeMission(id, i + 1, () => 0, now);
      expect(result.cardResult).not.toBeNull();
    });
    expect(getCardsAwardedToday(now)).toBe(allIds.length);
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
    expect(isBonusAwardedToday(now)).toBe(true);
  });
});

describe("통계", () => {
  it("getTodayCompletedCount는 오늘 완료한 미션 수(보너스 제외)를 센다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, now);
    completeMission(DEFAULT_MISSIONS[1].id, 2, () => 0, now);
    expect(getTodayCompletedCount(now)).toBe(2);
  });

  it("더 이상 존재하지 않는 미션의 완료 기록은 오늘 완료 수에 안 잡힌다(완료 X/Y 표시가 항상 앞뒤 맞게)", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    const { mission } = addCustomMission("임시미션", now);
    completeMission(mission.id, 1, () => 0, now);
    expect(getTodayCompletedCount(now)).toBe(1);

    // 완료한 당일엔 못 지우므로, 그 전 버전 데이터가 남은 상황을 재현하려면
    // 저장소를 직접 조작한다.
    localStorage.setItem(
      "pokemonMissions.custom.v1",
      JSON.stringify(getCustomMissions(now).filter((m) => m.id !== mission.id))
    );

    expect(getTodayCompletedCount(now)).toBe(0);
  });

  it("getWeeklyCompletedCount는 이번 주(월요일부터) 완료 수를 센다", () => {
    const monday = new Date("2026-08-03T09:00:00.000Z"); // 2026-08-03은 월요일
    const friday = new Date("2026-08-07T09:00:00.000Z");
    completeMission(DEFAULT_MISSIONS[0].id, 1, () => 0, monday);
    completeMission(DEFAULT_MISSIONS[1].id, 2, () => 0, friday);
    expect(getWeeklyCompletedCount(friday)).toBe(2);
  });

  it("getCardsAwardedToday는 완료 수 + 보너스(지급됐으면 1)를 더한 값이다", () => {
    const now = new Date("2026-08-07T09:00:00.000Z");
    DEFAULT_MISSIONS.forEach((m, i) => completeMission(m.id, i + 1, () => 0, now));
    expect(getCardsAwardedToday(now)).toBe(DEFAULT_MISSIONS.length); // 보너스 전

    completeBonus(999, () => 0, now);
    expect(getCardsAwardedToday(now)).toBe(DEFAULT_MISSIONS.length + 1); // 보너스 포함
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
