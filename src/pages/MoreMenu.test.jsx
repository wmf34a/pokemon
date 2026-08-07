import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MoreMenu from "./MoreMenu";

describe("MoreMenu", () => {
  it("오늘의 포켓몬 링크는 활성화되어 있다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /오늘의 포켓몬/ });
    expect(link).toHaveAttribute("href", "/daily");
  });

  it("아직 구현 안 된 기능은 '준비중'으로 표시되고 링크가 비활성화된다", () => {
    render(
      <MemoryRouter>
        <MoreMenu />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /일일 미션/ });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("준비중").length).toBeGreaterThan(0);
  });
});
