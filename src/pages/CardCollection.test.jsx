import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CardCollection from "./CardCollection";
import { loadPokemonData } from "../utils/pokemonData";
import { awardCard } from "../utils/cardCollection";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const bulbasaur = {
  id: 1,
  nameKo: "이상해씨",
  types: ["grass", "poison"],
  abilities: ["overgrow"],
  descriptionKo: "설명입니다.",
  sprite: "https://example.com/1.png",
};
const pikachu = {
  id: 25,
  nameKo: "피카츄",
  types: ["electric"],
  abilities: ["static"],
  descriptionKo: "전기를 모은다.",
  sprite: "https://example.com/25.png",
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("CardCollection", () => {
  it("보유한 카드는 이름과 등급이 보이고, 미보유 카드는 물음표로 가려진다", async () => {
    awardCard(1, () => 0); // 이상해씨만 획득(common)
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    const card = await screen.findByRole("button", { name: "이상해씨 카드" });
    expect(within(card).getByText("이상해씨")).toBeInTheDocument();
    expect(within(card).getByText("일반")).toBeInTheDocument();
    expect(screen.getByText("???")).toBeInTheDocument();
    expect(screen.queryByText("피카츄")).not.toBeInTheDocument();
  });

  it("진행률을 보유수/전체수로 표시한다", async () => {
    awardCard(1, () => 0);
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    expect(await screen.findByText("1 / 2장 수집")).toBeInTheDocument();
  });

  it("보유 카드를 클릭하면 뒷면(설명)이 DOM에 나타난다", async () => {
    awardCard(1, () => 0);
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    const card = await screen.findByRole("button", { name: "이상해씨 카드" });
    fireEvent.click(card);
    expect(screen.getByText("설명입니다.")).toBeInTheDocument();
  });

  it("'보유만' 필터를 누르면 미보유 카드(물음표)가 사라진다", async () => {
    awardCard(1, () => 0); // 이상해씨만 획득
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    await screen.findByRole("button", { name: "이상해씨 카드" });
    expect(screen.getByText("???")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "보유만" }));

    expect(screen.queryByText("???")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이상해씨 카드" })).toBeInTheDocument();
  });

  it("등급 필터를 누르면 해당 등급 카드만 남는다", async () => {
    awardCard(1, () => 0); // common
    awardCard(25, () => 0.9); // rare
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]);

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    await screen.findByRole("button", { name: "이상해씨 카드" });
    fireEvent.click(screen.getByRole("button", { name: "레어" }));

    expect(screen.getByRole("button", { name: "피카츄 카드" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이상해씨 카드" })).not.toBeInTheDocument();
  });

  it("조건에 맞는 카드가 없으면 안내 문구를 보여준다", async () => {
    loadPokemonData.mockResolvedValue([bulbasaur, pikachu]); // 아무 것도 획득 안 함

    render(
      <MemoryRouter>
        <CardCollection />
      </MemoryRouter>
    );

    await screen.findByText("0 / 2장 수집");
    fireEvent.click(screen.getByRole("button", { name: "초희귀" }));

    expect(screen.getByText("조건에 맞는 카드가 없어요.")).toBeInTheDocument();
  });
});
