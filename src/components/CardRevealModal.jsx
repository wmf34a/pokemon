import { useEffect, useRef, useState } from "react";
import { GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";
import { useCardChime } from "../hooks/useCardChime";

export default function CardRevealModal({ result, pokemon, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const audioRef = useRef(null);
  const playChime = useCardChime(); // pokemon.cry가 없는 경우의 대체음

  useEffect(() => {
    if (!result) return undefined;
    setRevealed(false);
    const timer = setTimeout(() => {
      setRevealed(true);
      // 카드가 뒤집혀 실제로 보이는 순간, 그 포켓몬의 실제 울음소리를 재생한다.
      // autoplay 속성이 아니라 명시적 play() 호출이라, 확인 버튼 탭에서 이어지는
      // 짧은 지연(500ms)은 iOS Safari의 사용자 제스처 유효 구간 안에 들어와
      // 자동재생 정책에 막히지 않는다(AudioButton.jsx와 같은 패턴).
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        // 일부 환경(jsdom 등)은 play()가 Promise를 반환하지 않는다 — 방어적으로 체크.
        audioRef.current.play()?.catch(() => {});
      } else {
        playChime();
      }
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
            {pokemon.cry && (
              <audio key={pokemon.id} ref={audioRef} src={pokemon.cry} style={{ display: "none" }} />
            )}
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
