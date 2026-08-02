import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { loadPokemonData, TYPE_COLOR } from "../utils/pokemonData";
import { getMyPokemon } from "../utils/myPokemon";

export default function MyPokemon() {
  const navigate = useNavigate();
  const [record, setRecord] = useState(undefined); // undefined = 아직 확인 전, null = 없음
  const [p, setP] = useState(null);

  useEffect(() => {
    const rec = getMyPokemon();
    setRecord(rec);
    if (!rec) {
      navigate("/mine/choose", { replace: true });
      return;
    }
    loadPokemonData().then((all) => {
      setP(all.find((x) => x.id === rec.currentStageId) || null);
    });
  }, [navigate]);

  if (record === undefined || record === null || !p) {
    return (
      <AppShell title="내 포켓몬" backTo="/">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 20, width: "60%", margin: "0 auto 8px" }} />
      </AppShell>
    );
  }

  const tint = TYPE_COLOR[p.types[0]] || "#999";

  return (
    <AppShell title="내 포켓몬" backTo="/">
      <div
        style={{
          textAlign: "center",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6) var(--space-4) var(--space-4)",
          background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`,
        }}
      >
        <img src={p.artwork} alt={record.nickname} style={{ width: 180, height: 180 }} />
        <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          #{String(p.id).padStart(4, "0")}
        </div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>{record.nickname}</h1>
        <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{p.nameKo}</div>
      </div>

      <p
        style={{
          marginTop: "var(--space-5)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        퀴즈를 풀면 다음 진화까지 포인트가 쌓여요. (진화 시스템은 곧 추가돼요)
      </p>
    </AppShell>
  );
}
