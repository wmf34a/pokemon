import { useEffect } from "react";
import { GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";
import { useCardChime } from "../hooks/useCardChime";

export default function CardToast({ result, pokemonName }) {
  const playChime = useCardChime();

  useEffect(() => {
    if (result?.isNew) playChime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result?.isNew) return null;

  const color = GRADE_COLOR_VAR[result.grade] || GRADE_COLOR_VAR.common;

  return (
    <div
      className={result.grade === "legendary" ? "card-toast-legendary" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: "var(--radius-pill)",
        border: `1.5px solid ${color}`,
        background: `color-mix(in srgb, ${color} 18%, var(--color-surface))`,
        color: "var(--color-text)",
        fontWeight: 700,
        fontSize: 14,
        margin: "var(--space-2) 0",
      }}
    >
      {GRADE_LABEL_KO[result.grade]} 카드 획득! {pokemonName}
    </div>
  );
}
