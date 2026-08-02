import { Link } from "react-router-dom";
import TypeBadge from "./TypeBadge";
import { TYPE_COLOR } from "../utils/pokemonData";

export default function PokemonCard({ p }) {
  const tint = TYPE_COLOR[p.types[0]] || "#999";
  return (
    <Link
      to={`/pokemon/${p.id}`}
      className="press"
      style={{
        display: "block",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3)",
        textDecoration: "none",
        color: "inherit",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 84,
          height: 84,
          margin: "0 auto",
          borderRadius: "50%",
          background: `color-mix(in srgb, ${tint} 22%, var(--color-surface-2))`,
        }}
      >
        <img
          src={p.sprite}
          alt={p.nameKo}
          loading="lazy"
          style={{ width: 60, height: 60, imageRendering: "pixelated" }}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
        #{String(p.id).padStart(4, "0")}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nameKo}</div>
      <div style={{ marginTop: 6 }}>
        {p.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </Link>
  );
}
