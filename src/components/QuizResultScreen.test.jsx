import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuizResultScreen from "./QuizResultScreen";

describe("QuizResultScreen", () => {
  it("정답 수/총점을 보여주고 다시 하기 클릭 시 onPlayAgain을 호출한다", () => {
    const onPlayAgain = vi.fn();
    render(
      <MemoryRouter>
        <QuizResultScreen
          title="실루엣 퀴즈"
          total={20}
          correctCount={12}
          score={340}
          onPlayAgain={onPlayAgain}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/20문제 중/)).toBeInTheDocument();
    expect(screen.getByText("12문제")).toBeInTheDocument();
    expect(screen.getByText("340점")).toBeInTheDocument();

    screen.getByRole("button", { name: "다시 하기" }).click();
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it("퀴즈 목록으로 링크는 /quiz로 연결된다", () => {
    render(
      <MemoryRouter>
        <QuizResultScreen
          title="울음소리 퀴즈"
          total={18}
          correctCount={5}
          score={90}
          onPlayAgain={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "퀴즈 목록으로" })).toHaveAttribute(
      "href",
      "/quiz"
    );
  });

  it("total은 항상 실제 전달된 값을 그대로 표시한다(하드코딩된 20이 아님)", () => {
    render(
      <MemoryRouter>
        <QuizResultScreen
          title="진화 순서 맞추기"
          total={17}
          correctCount={3}
          score={60}
          onPlayAgain={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/17문제 중/)).toBeInTheDocument();
  });
});
