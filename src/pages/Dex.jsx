import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import PokemonCard from "../components/PokemonCard";
import SearchBar from "../components/SearchBar";
import {
  loadPokemonData,
  sortPokemon,
  getAllTypes,
  SORT_OPTIONS,
  TYPE_LABEL_KO,
} from "../utils/pokemonData";
import { matchesQuery } from "../utils/hangul";

export default function Dex() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(SORT_OPTIONS.NAME_KO);
  const [typeFilter, setTypeFilter] = useState(null);

  useEffect(() => {
    loadPokemonData()
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => getAllTypes(all), [all]);

  const filtered = useMemo(() => {
    let list = all.filter((p) => matchesQuery(p.nameKo, query));
    if (typeFilter) list = list.filter((p) => p.types.includes(typeFilter));
    return sortPokemon(list, sortKey);
  }, [all, query, sortKey, typeFilter]);

  return (
    <AppShell title="포켓몬 도감" backTo="/">
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
          gap: 8,
          margin: "var(--space-3) 0",
          overflowX: "auto",
        }}
      >
        {Object.values(SORT_OPTIONS).map((opt) => (
          <button
            key={opt}
            onClick={() => setSortKey(opt)}
            style={pillStyle(sortKey === opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: "var(--space-4)",
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
            {filtered.length}마리
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((p) => (
              <PokemonCard key={p.id} p={p} />
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
