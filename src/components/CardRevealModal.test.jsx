import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import CardRevealModal from "./CardRevealModal";

const pikachu = { nameKo: "피카츄", artwork: "https://example.com/25.png" };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CardRevealModal", () => {
  it("result나 pokemon이 없으면 아무 것도 렌더하지 않는다", () => {
    const { container } = render(<CardRevealModal result={null} pokemon={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("일정 시간 후 카드가 공개되며 등급/이름과 닫기 버튼이 나타난다", () => {
    render(
      <CardRevealModal result={{ isNew: true, grade: "rare" }} pokemon={pikachu} onClose={() => {}} />
    );
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("피카츄")).toBeInTheDocument();
    expect(screen.getByText("레어")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("이미 보유 중이던 카드면 안내 문구가 함께 보인다", () => {
    render(
      <CardRevealModal result={{ isNew: false, grade: "common" }} pokemon={pikachu} onClose={() => {}} />
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("이미 있는 카드예요")).toBeInTheDocument();
  });

  it("포켓몬 울음소리(cry)가 있으면 그 소리를 재생할 audio 엘리먼트를 렌더한다", () => {
    const withCry = { ...pikachu, id: 25, cry: "https://example.com/25.ogg" };
    render(
      <CardRevealModal result={{ isNew: true, grade: "common" }} pokemon={withCry} onClose={() => {}} />
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(document.querySelector("audio")).toHaveAttribute("src", "https://example.com/25.ogg");
  });

  it("cry가 없으면 audio 엘리먼트 없이 조용히 넘어간다(대체 효과음으로 폴백)", () => {
    render(
      <CardRevealModal result={{ isNew: true, grade: "common" }} pokemon={pikachu} onClose={() => {}} />
    );
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }).not.toThrow();
    expect(document.querySelector("audio")).not.toBeInTheDocument();
  });
});
