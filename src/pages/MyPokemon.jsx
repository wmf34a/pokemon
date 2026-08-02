import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { loadPokemonData, TYPE_COLOR } from "../utils/pokemonData";
import { getMyPokemon, graduateAndRestart, resetMyPokemon } from "../utils/myPokemon";

export default function MyPokemon() {
  const navigate = useNavigate();
  const [record, setRecord] = useState(undefined); // undefined = 아직 확인 전, null = 없음
  const [p, setP] = useState(null);
  const [dismissedGraduation, setDismissedGraduation] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

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
  const isFinalEvolution = p.evolvesTo?.length === 0;

  function handleGraduate() {
    graduateAndRestart();
    navigate("/mine/choose");
  }

  function handleReset() {
    resetMyPokemon();
    navigate("/mine/choose");
  }

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
        퀴즈를 풀면서 함께 키워보세요!
      </p>

      {isFinalEvolution && !dismissedGraduation && (
        <div
          style={{
            marginTop: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            background: "var(--color-surface-2)",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: 15 }}>
            최고 단계까지 진화를 마쳤어요!
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setDismissedGraduation(true)}
              className="press"
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              계속 보기
            </button>
            <button
              type="button"
              onClick={handleGraduate}
              className="press"
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--color-primary)",
                color: "var(--color-text-on-primary)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              새 친구 고르기
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: 13,
              textDecoration: "underline",
              cursor: "pointer",
              minHeight: 44,
              padding: "10px",
            }}
          >
            다른 포켓몬 고르기
          </button>
        ) : (
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              background: "var(--color-surface-2)",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700 }}>정말요?</p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
              지금 포켓몬의 진화 진행 상황은 사라져요.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="press"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="press"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--color-danger)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                새로 고르기
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
