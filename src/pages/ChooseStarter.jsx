import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import SearchBar from "../components/SearchBar";
import TypeBadge from "../components/TypeBadge";
import {
  loadPokemonData,
  getAllTypes,
  TYPE_LABEL_KO,
  TYPE_COLOR,
} from "../utils/pokemonData";
import { matchesQuery } from "../utils/hangul";
import { getStarterCandidates, chooseStarter } from "../utils/myPokemon";
import { resetCareState } from "../utils/pokemonCare";

export default function ChooseStarter() {
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(null);
  const [picked, setPicked] = useState(null);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    loadPokemonData()
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const candidates = useMemo(() => getStarterCandidates(all), [all]);
  const types = useMemo(() => getAllTypes(candidates), [candidates]);

  const filtered = useMemo(() => {
    let list = candidates.filter((p) => matchesQuery(p.nameKo, query));
    if (typeFilter) list = list.filter((p) => p.types.includes(typeFilter));
    return list;
  }, [candidates, query, typeFilter]);

  function handleConfirm() {
    chooseStarter(picked, nickname);
    resetCareState(); // 새 포켓몬은 이전 포켓몬의 배고픔/행복/피로/쿨다운을 물려받지 않는다
    navigate("/mine");
  }

  if (picked) {
    return (
      <AppShell title="포켓몬 고르기" backTo="/">
        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <img
            src={picked.artwork || picked.sprite}
            alt={picked.nameKo}
            style={{ width: 160, height: 160 }}
          />
          <h2 style={{ fontSize: 22, marginTop: 4 }}>{picked.nameKo}</h2>
          <div style={{ marginTop: 4 }}>
            {picked.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <label
            htmlFor="starter-nickname"
            style={{
              display: "block",
              marginTop: "var(--space-5)",
              marginBottom: 6,
              fontSize: 13,
              color: "var(--color-text-muted)",
              textAlign: "left",
            }}
          >
            별명을 지어주세요 (비워두면 "{picked.nameKo}"로 시작해요)
          </label>
          <input
            id="starter-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={picked.nameKo}
            style={{
              width: "100%",
              minHeight: 44,
              padding: "10px 14px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />

          <button
            type="button"
            onClick={handleConfirm}
            className="press"
            style={{
              width: "100%",
              marginTop: "var(--space-4)",
              minHeight: 48,
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            이 포켓몬으로 시작하기
          </button>

          <button
            type="button"
            onClick={() => setPicked(null)}
            style={{
              width: "100%",
              marginTop: "var(--space-3)",
              minHeight: 44,
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            다시 고르기
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="포켓몬 고르기" backTo="/">
      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: 14 }}>
          {error} (README의 "데이터 준비" 단계를 먼저 실행하세요)
        </p>
      )}

      <SearchBar value={query} onChange={setQuery} />

      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          margin: "var(--space-3) 0 var(--space-4)",
          overflowX: "auto",
        }}
      >
        <button onClick={() => setTypeFilter(null)} style={pillStyle(!typeFilter)}>
          전체
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={pillStyle(typeFilter === t)}
          >
            {TYPE_LABEL_KO[t] || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 168 }} />
          ))}
        </div>
      ) : (
        <>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            {filtered.length}마리 중에서 골라보세요
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((p) => (
              <StarterCard key={p.id} p={p} onPick={setPicked} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: 40 }}>
              조건에 맞는 포켓몬이 없어요.
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}

function StarterCard({ p, onPick }) {
  const tint = TYPE_COLOR[p.types[0]] || "#999";
  return (
    <button
      type="button"
      onClick={() => onPick(p)}
      className="press"
      style={{
        display: "block",
        width: "100%",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3)",
        textAlign: "center",
        border: "none",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-card)",
        cursor: "pointer",
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
    </button>
  );
}

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
