import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadPokemonData } from "../utils/pokemonData";
import TypeBadge from "../components/TypeBadge";

export default function PokemonDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);

  useEffect(() => {
    loadPokemonData().then((all) => {
      setP(all.find((x) => String(x.id) === String(id)) || null);
    });
  }, [id]);

  if (!p) return <div style={{ padding: 20 }}>불러오는 중...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <Link to="/dex">← 도감으로</Link>
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <img src={p.artwork} alt={p.nameKo} style={{ width: 200 }} />
        <div style={{ color: "#999" }}>#{String(p.id).padStart(4, "0")}</div>
        <h1>{p.nameKo}</h1>
        <div style={{ color: "#666", marginBottom: 8 }}>{p.genusKo}</div>
        <div>
          {p.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, lineHeight: 1.7 }}>
        <p>
          <b>키</b> {p.height}m &nbsp;&nbsp; <b>몸무게</b> {p.weight}kg
        </p>
        <p>
          <b>특성</b> {p.abilities.join(", ")}
        </p>
        <p>{p.descriptionKo || p.descriptionEn}</p>

        {p.cry && (
          <div>
            <b>울음소리</b>
            <br />
            <audio key={p.id} controls src={p.cry} />
          </div>
        )}
      </div>

      <Link
        to="/quiz/silhouette"
        style={{
          display: "inline-block",
          marginTop: 20,
          padding: "10px 16px",
          background: "#F2C31A",
          borderRadius: 10,
          color: "#1F3864",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        🕶️ 실루엣 퀴즈 하러가기
      </Link>
    </div>
  );
}
