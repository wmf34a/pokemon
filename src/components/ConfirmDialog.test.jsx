import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("open이 false면 아무 것도 렌더하지 않는다", () => {
    const { container } = render(
      <ConfirmDialog open={false} title="정말요?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("open이면 제목과 메시지를 보여준다", () => {
    render(
      <ConfirmDialog
        open
        title="정말 완료했나요?"
        message="완료로 표시하면 취소할 수 없어요"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("정말 완료했나요?")).toBeInTheDocument();
    expect(screen.getByText("완료로 표시하면 취소할 수 없어요")).toBeInTheDocument();
  });

  it("확인 버튼을 누르면 onConfirm이 호출된다", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="제목" onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("취소 버튼을 누르면 onCancel이 호출된다", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="제목" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
