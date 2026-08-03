import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvolutionToast from "./EvolutionToast";

describe("EvolutionToast", () => {
  it("evolved일 때 새 단계 이름과 함께 렌더된다", () => {
    render(
      <EvolutionToast
        result={{
          evolved: true,
          branchChoicePending: false,
          newStagePokemon: { nameKo: "이상해풀" },
        }}
      />
    );
    expect(screen.getByText(/이상해풀\(으\)로 진화했어요/)).toBeInTheDocument();
  });

  it("newStagePokemon이 없어도 evolved면 폴백 문구로 렌더된다", () => {
    render(
      <EvolutionToast
        result={{ evolved: true, branchChoicePending: false, newStagePokemon: null }}
      />
    );
    expect(screen.getByText("짠! 진화했어요!")).toBeInTheDocument();
  });

  it("branchChoicePending일 때 홈 안내 문구가 렌더된다", () => {
    render(
      <EvolutionToast
        result={{ evolved: false, branchChoicePending: true, newStagePokemon: null }}
      />
    );
    expect(screen.getByText("진화 준비 완료! 홈에서 골라보세요")).toBeInTheDocument();
  });

  it("evolved도 branchChoicePending도 아니면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <EvolutionToast
        result={{ evolved: false, branchChoicePending: false, newStagePokemon: null }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("result가 null이어도 예외 없이 아무것도 렌더하지 않는다", () => {
    const { container } = render(<EvolutionToast result={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
