import { Link } from "react-router-dom";
import TypeBadge from "./TypeBadge";

export default function PokemonCard({ p }) {
  return (
    <Link
      to={`/pokemon/${p.id}`}
      style={{
        display: "block",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
        textDecoration: "none",
        color: "inherit",
        background: "#fff",
        transition: "transform .15s",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <img
          src={p.sprite}
          alt={p.nameKo}
          loading="lazy"
          style={{ width: 80, height: 80, imageRendering: "pixelated" }}
        />
      </div>
      <div style={{ fontSize: 12, color: "#999" }}>
        #{String(p.id).padStart(4, "0")}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nameKo}</div>
      <div style={{ marginTop: 4 }}>
        {p.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </Link>
  );
}
