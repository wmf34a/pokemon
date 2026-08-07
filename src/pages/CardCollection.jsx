import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import TypeBadge from "../components/TypeBadge";
import { loadPokemonData } from "../utils/pokemonData";
import { getCards, GRADE_LABEL_KO, GRADE_COLOR_VAR } from "../utils/cardCollection";

function formatAbility(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CardCollection() {
  const [all, setAll] = useState([]);
  const [cards, setCards] = useState({});
  const [flippedId, setFlippedId] = useState(null);

  useEffect(() => {
    loadPokemonData().then(setAll);
    setCards(getCards());
  }, []);

  function toggleFlip(id) {
    if (!cards[id]) return;
    setFlippedId((cur) => (cur === id ? null : id));
  }

  const ownedCount = Object.keys(cards).length;

  return (
    <AppShell title="카드 수집" backTo="/more">
      <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        {ownedCount} / {all.length}장 수집
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginTop: "var(--space-3)",
        }}
      >
        {all.map((p) => {
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
                      특성: {p.abilities.map(formatAbility).join(", ")}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                      {p.descriptionKo || p.descriptionEn}
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
