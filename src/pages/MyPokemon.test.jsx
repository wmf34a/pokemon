import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyPokemon from "./MyPokemon";
import { chooseStarter } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  types: ["electric"],
  artwork: "https://example.com/25.png",
  evolvesTo: [{ id: 26, minLevel: null }],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("MyPokemon", () => {
  it("내 포켓몬 정보와 포켓몬 키우기 게이지/액션 버튼을 함께 보여준다", async () => {
    chooseStarter(pikachu, "번개");
    loadPokemonData.mockResolvedValue([pikachu]);

    render(
      <MemoryRouter>
        <MyPokemon />
      </MemoryRouter>
    );

    expect(await screen.findByText("번개")).toBeInTheDocument();
    expect(screen.getByText("배고픔")).toBeInTheDocument();
    expect(screen.getByText("행복도")).toBeInTheDocument();
    expect(screen.getByText("피로도")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "밥주기" })).toBeInTheDocument();
  });

  it("밥주기를 누르면 쿨다운 남은 시간이 버튼에 표시되고 비활성화된다", async () => {
    chooseStarter(pikachu, "번개");
    loadPokemonData.mockResolvedValue([pikachu]);

    render(
      <MemoryRouter>
        <MyPokemon />
      </MemoryRouter>
    );

    const feedBtn = await screen.findByRole("button", { name: "밥주기" });
    fireEvent.click(feedBtn);

    const cooledDownBtn = await screen.findByRole("button", { name: /밥주기 \(.+후\)/ });
    expect(cooledDownBtn).toBeDisabled();
  });
});
