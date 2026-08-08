import { useEffect, useState } from "react";
import { GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";
import { useCardChime } from "../hooks/useCardChime";

export default function CardRevealModal({ result, pokemon, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const playChime = useCardChime();

  useEffect(() => {
    if (!result) return undefined;
    setRevealed(false);
    const timer = setTimeout(() => {
      setRevealed(true);
      playChime(); // 카드가 뒤집혀 실제로 보이는 순간에 맞춰서 소리 재생
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result || !pokemon) return null;

  const color = GRADE_COLOR_VAR[result.grade] || GRADE_COLOR_VAR.common;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-5)",
        padding: "var(--space-4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="카드 뽑기 결과"
        className="card-flip-outer"
        style={{ width: 220, height: 280 }}
      >
        <div className={`card-flip-inner${revealed ? " is-flipped" : ""}`}>
          <div
            className="card-flip-face"
            style={{
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span style={{ fontSize: 40, color: "var(--color-text-on-primary)" }}>?</span>
          </div>
          <div
            className="card-flip-face card-flip-back"
            style={{
              background: "var(--color-surface)",
              border: `3px solid ${color}`,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "var(--space-4)",
              textAlign: "center",
            }}
          >
            <img src={pokemon.artwork} alt={pokemon.nameKo} style={{ width: 100, height: 100 }} />
            <div style={{ fontWeight: 700 }}>{pokemon.nameKo}</div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                background: `color-mix(in srgb, ${color} 25%, var(--color-surface))`,
              }}
            >
              {GRADE_LABEL_KO[result.grade]}
            </span>
            {!result.isNew && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                이미 있는 카드예요
              </div>
            )}
          </div>
        </div>
      </div>

      {revealed && (
        <button
          type="button"
          onClick={onClose}
          className="press"
          style={{
            minHeight: 44,
            padding: "10px 24px",
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "var(--color-accent)",
            color: "var(--color-accent-ink)",
            fontWeight: 700,
          }}
        >
          닫기
        </button>
      )}
    </div>
  );
}
