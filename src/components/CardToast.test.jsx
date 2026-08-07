import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CardToast from "./CardToast";

describe("CardToast", () => {
  it("isNew:true면 등급과 포켓몬 이름이 함께 렌더된다", () => {
    render(<CardToast result={{ isNew: true, grade: "rare" }} pokemonName="피카츄" />);
    expect(screen.getByText(/레어 카드 획득!/)).toBeInTheDocument();
    expect(screen.getByText(/피카츄/)).toBeInTheDocument();
  });

  it("초희귀 등급이면 반짝임 클래스가 붙는다", () => {
    render(<CardToast result={{ isNew: true, grade: "legendary" }} pokemonName="뮤츠" />);
    expect(screen.getByText(/초희귀 카드 획득!/).closest("div")).toHaveClass(
      "card-toast-legendary"
    );
  });

  it("isNew:false면 아무 것도 렌더하지 않는다(이미 보유 중인 카드)", () => {
    const { container } = render(
      <CardToast result={{ isNew: false, grade: "common" }} pokemonName="이상해씨" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("result가 null이면 아무 것도 렌더하지 않는다", () => {
    const { container } = render(<CardToast result={null} pokemonName="이상해씨" />);
    expect(container).toBeEmptyDOMElement();
  });
});
