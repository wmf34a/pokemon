import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import TypeBadge from "../components/TypeBadge";
import { loadPokemonData } from "../utils/pokemonData";
import { getCards, GRADES, GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";

// null = 전체, "owned" = 보유만, 그 외에는 GRADES 값 중 하나(해당 등급만)
const FILTERS = [
  { value: null, label: "전체" },
  { value: "owned", label: "보유만" },
  ...GRADES.map((g) => ({ value: g, label: GRADE_LABEL_KO[g] })),
];

function pillStyle(active) {
  return {
    flexShrink: 0,
    padding: "8px 16px",
    minHeight: 36,
    borderRadius: "var(--radius-pill)",
    border: active ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
    background: active ? "var(--color-primary)" : "var(--color-surface)",
    color: active ? "var(--color-text-on-primary)" : "var(--color-text)",
    fontSize: 13,
    fontWeight: 600,
  };
}

export default function CardCollection() {
  const [all, setAll] = useState([]);
  const [cards, setCards] = useState({});
  const [flippedId, setFlippedId] = useState(null);
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    loadPokemonData().then(setAll);
    setCards(getCards());
  }, []);

  function toggleFlip(id) {
    if (!cards[id]) return;
    setFlippedId((cur) => (cur === id ? null : id));
  }

  const ownedCount = Object.keys(cards).length;

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        const card = cards[p.id];
        if (filter === null) return true;
        if (filter === "owned") return Boolean(card);
        return card?.grade === filter;
      }),
    [all, cards, filter]
  );

  return (
    <AppShell title="카드 수집" backTo="/quiz">
      <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        {ownedCount} / {all.length}장 수집
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 11, marginTop: 2 }}>
        등급은 포켓몬 게임 공식 데이터가 아니라 이 앱만의 수집 등급이에요
      </p>

      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, marginTop: "var(--space-3)", overflowX: "auto" }}
      >
        {FILTERS.map(({ value, label }) => (
          <button key={label} onClick={() => setFilter(value)} style={pillStyle(filter === value)}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: 40 }}>
          조건에 맞는 카드가 없어요.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginTop: "var(--space-3)",
        }}
      >
        {filtered.map((p) => {
          const card = cards[p.id];
          const isFlipped = flippedId === p.id;
          const color = card ? GRADE_COLOR_VAR[card.grade] : "var(--color-border)";

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleFlip(p.id)}
              disabled={!card}
              className="card-flip-outer press"
              aria-label={card ? `${p.nameKo} 카드` : "미보유 카드"}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                height: 190,
                cursor: card ? "pointer" : "default",
              }}
            >
              <div className={`card-flip-inner${isFlipped ? " is-flipped" : ""}`}>
                <div
                  className="card-flip-face"
                  style={{
                    background: "var(--color-surface)",
                    boxShadow: "var(--shadow-card)",
                    border: `2px solid ${color}`,
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={p.sprite}
                    alt={card ? p.nameKo : ""}
                    style={{
                      width: 72,
                      height: 72,
                      filter: card ? "none" : "brightness(0)",
                      opacity: card ? 1 : 0.35,
                    }}
                  />
                  {card ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>
                        {p.nameKo}
                      </div>
                      <span
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          background: `color-mix(in srgb, ${color} 25%, var(--color-surface))`,
                          color: "var(--color-text)",
                        }}
                      >
                        {GRADE_LABEL_KO[card.grade]}
                      </span>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
                      ???
                    </div>
                  )}
                </div>

                {card && (
                  <div
                    className="card-flip-face card-flip-back"
                    style={{
                      background: "var(--color-surface)",
                      boxShadow: "var(--shadow-card)",
                      border: `2px solid ${color}`,
                      padding: "var(--space-3)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 6,
                      textAlign: "left",
                    }}
                  >
                    <div>
                      {p.types.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      특성: {(p.abilitiesKo || p.abilities).join(", ")}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                      {p.descriptionKo || "한글 설명이 아직 없어요"}
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
