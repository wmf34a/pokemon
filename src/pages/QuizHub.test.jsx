import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import QuizHub from "./QuizHub";

const renderHub = () =>
  render(
    <MemoryRouter>
      <QuizHub />
    </MemoryRouter>
  );

describe("QuizHub", () => {
  it("구현된 퀴즈 모드로 가는 링크를 활성화해서 보여준다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    const silhouetteLink = screen.getByRole("link", { name: /실루엣 퀴즈/ });
    expect(silhouetteLink).toHaveAttribute("href", "/quiz/silhouette");

    const evolutionLink = screen.getByRole("link", { name: /진화 순서 맞추기/ });
    expect(evolutionLink).toHaveAttribute("href", "/quiz/evolution");

    const zoomLink = screen.getByRole("link", { name: /누구냔 넌/ });
    expect(zoomLink).toHaveAttribute("href", "/quiz/zoom");

    const typeLink = screen.getByRole("link", { name: /타입 퀴즈/ });
    expect(typeLink).toHaveAttribute("href", "/quiz/type");
  });

  it("모든 모드가 구현되어 있으면 '준비중' 표시가 없다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    expect(screen.queryByText("준비중")).not.toBeInTheDocument();
  });

  it("예전 더보기 탭 기능들로 가는 링크도 함께 보여준다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /오늘의 포켓몬/ })).toHaveAttribute("href", "/daily");
    expect(screen.getByRole("link", { name: /카드 수집/ })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: /일일 미션/ })).toHaveAttribute("href", "/missions");
  });

  describe("출제 세대 고르기", () => {
    beforeEach(() => localStorage.clear());

    it("전체와 1~9세대 칩을 보여주고 처음에는 전체가 선택돼 있다", () => {
      renderHub();

      expect(screen.getByRole("button", { name: "전체 세대" })).toHaveAttribute("aria-pressed", "true");
      for (let n = 1; n <= 9; n++) {
        expect(screen.getByRole("button", { name: `${n}세대` })).toHaveAttribute("aria-pressed", "false");
      }
      expect(screen.getByText("전체 포켓몬에서 출제")).toBeInTheDocument();
    });

    it("여러 세대를 함께 고를 수 있고 선택을 저장한다", async () => {
      const user = userEvent.setup();
      renderHub();

      await user.click(screen.getByRole("button", { name: "2세대" }));
      await user.click(screen.getByRole("button", { name: "3세대" }));

      expect(screen.getByRole("button", { name: "2세대" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "3세대" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "전체 세대" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText("2·3세대 포켓몬만 출제")).toBeInTheDocument();
      expect(localStorage.getItem("pokemonQuiz.generations")).toBe("generation-ii,generation-iii");
    });

    it("선택한 세대를 다시 누르면 해제되고, 모두 해제하면 전체로 돌아간다", async () => {
      const user = userEvent.setup();
      renderHub();

      await user.click(screen.getByRole("button", { name: "1세대" }));
      await user.click(screen.getByRole("button", { name: "1세대" }));

      expect(screen.getByRole("button", { name: "전체 세대" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("전체 포켓몬에서 출제")).toBeInTheDocument();
    });

    it("'전체 세대'를 누르면 고른 세대가 모두 풀린다", async () => {
      const user = userEvent.setup();
      renderHub();

      await user.click(screen.getByRole("button", { name: "4세대" }));
      await user.click(screen.getByRole("button", { name: "전체 세대" }));

      expect(screen.getByRole("button", { name: "4세대" })).toHaveAttribute("aria-pressed", "false");
      expect(localStorage.getItem("pokemonQuiz.generations")).toBe("");
    });

    it("저장해 둔 선택을 다시 열었을 때 그대로 보여준다", () => {
      localStorage.setItem("pokemonQuiz.generations", "generation-v");
      renderHub();

      expect(screen.getByRole("button", { name: "5세대" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("5세대 포켓몬만 출제")).toBeInTheDocument();
    });
  });
});
