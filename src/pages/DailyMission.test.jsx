import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyMission from "./DailyMission";
import { loadPokemonData } from "../utils/pokemonData";

vi.mock("../utils/pokemonData", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadPokemonData: vi.fn() };
});

const pikachu = { id: 25, nameKo: "피카츄", artwork: "https://example.com/25.png" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("DailyMission", () => {
  it("기본 미션 6개를 모두 렌더한다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    expect(await screen.findByText("등원하기")).toBeInTheDocument();
    expect(screen.getByText("하원하기")).toBeInTheDocument();
    expect(screen.getByText("제시간에 자기")).toBeInTheDocument();
  });

  it("완료 → 확인 팝업 → 확인하면 미션이 완료 상태로 바뀐다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.click(screen.getAllByRole("button", { name: "완료" })[0]);
    expect(screen.getByText("정말 완료했나요?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "완료" })).toHaveLength(5);
    });
  });

  it("취소를 누르면 미션이 완료되지 않는다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.click(screen.getAllByRole("button", { name: "완료" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getAllByRole("button", { name: "완료" })).toHaveLength(6);
  });

  it("20자 넘는 커스텀 미션은 에러 메시지를 보여주고 추가되지 않는다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.change(screen.getByPlaceholderText("새 미션 이름 (최대 20자)"), {
      target: { value: "가".repeat(21) },
    });
    fireEvent.submit(screen.getByRole("button", { name: "추가" }).closest("form"));

    expect(screen.getByText("미션 이름은 20자 이하로 적어주세요")).toBeInTheDocument();
  });

  it("커스텀 미션을 추가하고 삭제할 수 있다", async () => {
    loadPokemonData.mockResolvedValue([pikachu]);
    render(
      <MemoryRouter>
        <DailyMission />
      </MemoryRouter>
    );
    await screen.findByText("등원하기");

    fireEvent.change(screen.getByPlaceholderText("새 미션 이름 (최대 20자)"), {
      target: { value: "숙제하기" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "추가" }).closest("form"));
    // 커스텀 미션은 완료용 상단 목록과 삭제용 관리 목록 양쪽에 렌더되므로
    // (getMissionsWithStatus()가 기본+커스텀 미션을 병합해 반환) 2번 나타난다.
    expect(await screen.findAllByText("숙제하기")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.queryByText("숙제하기")).not.toBeInTheDocument());
  });
});
