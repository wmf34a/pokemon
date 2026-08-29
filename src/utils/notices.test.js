import { describe, it, expect, beforeEach } from "vitest";
import {
  NOTICES,
  getLastReadId,
  markAllNoticesRead,
  unreadNoticeCount,
  hasSeenTour,
  markTourSeen,
} from "./notices";

describe("업데이트 알림", () => {
  beforeEach(() => localStorage.clear());

  it("id 가 겹치지 않는다", () => {
    const ids = NOTICES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("최신순으로 정렬돼 있다", () => {
    const ids = NOTICES.map((n) => n.id);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("제목과 내용이 비어 있지 않다", () => {
    NOTICES.forEach((n) => {
      expect(n.title.trim().length).toBeGreaterThan(0);
      expect(n.body.trim().length).toBeGreaterThan(0);
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("처음 온 사람에게는 전부 새 소식이다", () => {
    expect(getLastReadId()).toBe(0);
    expect(unreadNoticeCount()).toBe(NOTICES.length);
  });

  it("읽고 나면 새 소식이 없다", () => {
    markAllNoticesRead();
    expect(unreadNoticeCount()).toBe(0);
  });

  it("읽은 뒤에 소식이 늘면 그만큼만 새 소식이다", () => {
    // 가장 큰 번호에서 하나 아래까지 읽은 상태를 만든다
    const ids = NOTICES.map((n) => n.id).sort((a, b) => a - b);
    localStorage.setItem("pokemonQuiz.noticeRead", String(ids[ids.length - 2]));
    expect(unreadNoticeCount()).toBe(1);
  });

  it("저장이 막혀 있어도 터지지 않는다", () => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, "getItem");
    Storage.prototype.getItem = () => {
      throw new Error("막힘");
    };
    expect(() => unreadNoticeCount()).not.toThrow();
    expect(getLastReadId()).toBe(0);
    Object.defineProperty(Storage.prototype, "getItem", original);
  });
});

describe("처음 한 번만 뜨는 안내", () => {
  beforeEach(() => localStorage.clear());

  it("처음 온 사람에게는 뜬다", () => {
    expect(hasSeenTour()).toBe(false);
  });

  it("한 번 보고 나면 다시 뜨지 않는다", () => {
    markTourSeen();
    expect(hasSeenTour()).toBe(true);
  });

  it("저장이 막혀 있으면 본 것으로 친다", () => {
    // 올 때마다 팝업이 뜨는 것이 안 뜨는 것보다 나쁘다
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, "getItem");
    Storage.prototype.getItem = () => {
      throw new Error("막힘");
    };
    expect(hasSeenTour()).toBe(true);
    Object.defineProperty(Storage.prototype, "getItem", original);
  });
});
