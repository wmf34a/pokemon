import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
    <div style={{ padding: 20, maxWidth: 960, margin: "0 auto" }}>
      <Link to="/">← 홈</Link>
      <h1 style={{ fontSize: 24, margin: "12px 0" }}>포켓몬 도감</h1>

      {error && (
        <p style={{ color: "crimson" }}>
          {error} (README의 "데이터 준비" 단계를 먼저 실행하세요)
        </p>
      )}

      <SearchBar value={query} onChange={setQuery} />

      <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
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

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
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
        <p>불러오는 중...</p>
      ) : (
        <>
          <p style={{ color: "#888", fontSize: 13 }}>{filtered.length}마리</p>
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
        </>
      )}
    </div>
  );
}

function pillStyle(active) {
  return {
    padding: "6px 14px",
    borderRadius: 999,
    border: active ? "2px solid #1F3864" : "1px solid #ddd",
    background: active ? "#1F3864" : "#fff",
    color: active ? "#fff" : "#333",
    fontSize: 13,
    cursor: "pointer",
  };
}
