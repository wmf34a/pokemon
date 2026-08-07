import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MoreMenu from "./MoreMenu";

describe("MoreMenu", () => {
  it("모든 링크가 활성화되어 각자의 경로로 연결된다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /오늘의 포켓몬/ })).toHaveAttribute("href", "/daily");
    expect(screen.getByRole("link", { name: /카드 수집/ })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: /포켓몬 키우기/ })).toHaveAttribute("href", "/care");
    expect(screen.getByRole("link", { name: /일일 미션/ })).toHaveAttribute("href", "/missions");
  });

  it("모든 기능이 구현되어 있으면 '준비중' 표시가 없다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    expect(screen.queryByText("준비중")).not.toBeInTheDocument();
  });
});
