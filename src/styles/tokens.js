// 퀴즈 페이지들(SilhouetteQuiz/ChosungQuiz/CryQuiz)이 공유하는 인라인 스타일.
// index.css의 CSS 변수를 그대로 참조해 색/반경/그림자를 한 곳에서 관리한다.

export const card = {
  background: "var(--color-surface-2)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5)",
  margin: "var(--space-3) 0",
};

export const primaryBtn = {
  padding: "12px 20px",
  minHeight: 44,
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "var(--color-primary)",
  color: "var(--color-text-on-primary)",
  fontWeight: 700,
  fontSize: 15,
  marginTop: "var(--space-3)",
};

export const hintBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 16px",
  minHeight: 44,
  borderRadius: "var(--radius-pill)",
  border: "1.5px solid var(--color-accent)",
  background: "color-mix(in srgb, var(--color-accent) 16%, transparent)",
  color: "#7a5c00",
  fontWeight: 700,
  fontSize: 13,
  marginBottom: "var(--space-2)",
};

export const choiceBtn = {
  padding: "14px 10px",
  minHeight: 44,
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 15,
  fontWeight: 600,
};

export const textInput = {
  flex: 1,
  padding: "12px 14px",
  minHeight: 44,
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 15,
};

export function pill(active) {
  return {
    padding: "8px 14px",
    minHeight: 36,
    borderRadius: "var(--radius-pill)",
    border: active ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
    background: active ? "var(--color-primary)" : "var(--color-surface)",
    color: active ? "var(--color-text-on-primary)" : "var(--color-text)",
    fontSize: 12,
    fontWeight: 600,
    marginRight: 6,
  };
}
