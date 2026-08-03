import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuizHub from "./QuizHub";

describe("QuizHub", () => {
  it("구현된 퀴즈 모드로 가는 링크를 활성화해서 보여준다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    const silhouetteLink = screen.getByRole("link", { name: /실루엣 퀴즈/ });
    expect(silhouetteLink).toHaveAttribute("href", "/quiz/silhouette");

    const chosungLink = screen.getByRole("link", { name: /초성 퀴즈/ });
    expect(chosungLink).toHaveAttribute("href", "/quiz/chosung");

    const evolutionLink = screen.getByRole("link", { name: /진화 순서 맞추기/ });
    expect(evolutionLink).toHaveAttribute("href", "/quiz/evolution");

    const zoomLink = screen.getByRole("link", { name: /누구냔 넌/ });
    expect(zoomLink).toHaveAttribute("href", "/quiz/zoom");

    const typeLink = screen.getByRole("link", { name: /타입 퀴즈/ });
    expect(typeLink).toHaveAttribute("href", "/quiz/type");
  });

  it("준비중인 모드는 '준비중' 표시를 보여준다", () => {
    render(
      <MemoryRouter>
        <QuizHub />
      </MemoryRouter>
    );

    expect(screen.getAllByText("준비중").length).toBeGreaterThan(0);
  });
});
