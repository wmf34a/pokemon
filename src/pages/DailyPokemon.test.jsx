import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyPokemon from "./DailyPokemon";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = {
  id: 25,
  nameKo: "피카츄",
  types: ["electric"],
  descriptionKo: "볼주머니에 전기를 모은다.",
  artwork: "https://example.com/pikachu.png",
  cry: "https://example.com/pikachu.ogg",
};

describe("DailyPokemon", () => {
  it("로딩 중에는 스켈레톤을 보여준다", () => {
    loadPokemonData.mockReturnValue(new Promise(() => {})); // 영원히 대기
    render(
      <MemoryRouter>
        <DailyPokemon />
      </MemoryRouter>
    );
    expect(document.querySelector(".skeleton")).toBeTruthy();
  });

  it("로딩 후 오늘의 포켓몬 이름/설명이 렌더된다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyPokemon />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("피카츄")).toBeInTheDocument());
    expect(screen.getByText("볼주머니에 전기를 모은다.")).toBeInTheDocument();
  });
});
