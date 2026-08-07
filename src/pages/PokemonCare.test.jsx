import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PokemonCare from "./PokemonCare";
import { chooseStarter } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  artwork: "https://example.com/25.png",
  evolvesTo: [{ id: 26, minLevel: null }],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("PokemonCare", () => {
  it("내 포켓몬이 없으면 안내와 고르러 가기 링크를 보여준다", async () => {
    render(
      <MemoryRouter>
        <PokemonCare />
      </MemoryRouter>
    );
    expect(await screen.findByText(/아직 내 포켓몬이 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "포켓몬 고르러 가기" })).toHaveAttribute(
      "href",
      "/mine/choose"
    );
  });

  it("내 포켓몬이 있으면 이름과 게이지, 액션 버튼을 보여준다", async () => {
    chooseStarter(pikachu, "번개");
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <PokemonCare />
      </MemoryRouter>
    );
    expect(await screen.findByText("번개")).toBeInTheDocument();
    expect(screen.getByText("배고픔")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "밥주기" })).toBeInTheDocument();
  });

  it("밥주기를 누르면 버튼이 '(내일)' 안내로 바뀌고 비활성화된다", async () => {
    chooseStarter(pikachu, "번개");
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <PokemonCare />
      </MemoryRouter>
    );
    const feedBtn = await screen.findByRole("button", { name: "밥주기" });
    fireEvent.click(feedBtn);
    expect(await screen.findByRole("button", { name: "밥주기 (내일)" })).toBeDisabled();
  });
});
