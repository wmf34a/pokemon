import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { loadPokemonData, TYPE_COLOR } from "../utils/pokemonData";
import TypeBadge from "../components/TypeBadge";
import AudioButton from "../components/AudioButton";
import { GlassesIcon } from "../components/Icons";

export default function PokemonDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);

  useEffect(() => {
    loadPokemonData().then((all) => {
      setP(all.find((x) => String(x.id) === String(id)) || null);
    });
  }, [id]);

  if (!p) {
    return (
      <AppShell title="포켓몬 도감" backTo="/dex">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 20, width: "60%", margin: "0 auto 8px" }} />
        <div className="skeleton" style={{ height: 100 }} />
      </AppShell>
    );
  }

  const tint = TYPE_COLOR[p.types[0]] || "#999";

  return (
    <AppShell title={p.nameKo} backTo="/dex">
      <div
        style={{
          textAlign: "center",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6) var(--space-4) var(--space-4)",
          background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`,
        }}
      >
        <img src={p.artwork} alt={p.nameKo} style={{ width: 180, height: 180 }} />
        <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          #{String(p.id).padStart(4, "0")}
        </div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>{p.nameKo}</h1>
        <div style={{ color: "var(--color-text-muted)", marginBottom: 8, fontSize: 14 }}>
          {p.genusKo}
        </div>
        <div>
          {p.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "var(--space-4) 0" }}>
        <StatBox label="키" value={`${p.height}m`} />
        <StatBox label="몸무게" value={`${p.weight}kg`} />
      </div>

      <Section label="특성">
        <p style={{ margin: 0 }}>{p.abilities.join(", ")}</p>
      </Section>

      <Section label="설명">
        <p style={{ margin: 0, lineHeight: 1.7 }}>{p.descriptionKo || p.descriptionEn}</p>
      </Section>

      {p.cry && (
        <Section label="울음소리">
          <AudioButton src={p.cry} trackKey={p.id} />
        </Section>
      )}

      <Link
        to="/quiz/silhouette"
        className="press pop-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: "var(--space-5)",
          padding: "14px 16px",
          minHeight: 48,
          background: "var(--color-accent)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-accent-ink)",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        <GlassesIcon size={20} strokeWidth={2} />
        실루엣 퀴즈 하러가기
      </Link>
    </AppShell>
  );
}

function StatBox({ label, value }) {
  return (
    <div
      style={{
        background: "var(--color-surface-2)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
