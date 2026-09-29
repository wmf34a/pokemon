import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import PokemonCard from "../components/PokemonCard";
import SearchBar from "../components/SearchBar";
import {
  loadPokemonData,
  sortPokemon,
  getAllTypes,
  getAllGenerations,
  SORT_OPTIONS,
  TYPE_LABEL_KO,
  GENERATION_LABEL_KO,
  getDexSortPref,
  setDexSortPref,
  getDexTypePref,
  setDexTypePref,
  getDexGenerationPref,
  setDexGenerationPref,
  getDexLegendaryPref,
  setDexLegendaryPref,
} from "../utils/pokemonData";
import { pillStyle } from "../styles/tokens";
import { matchesQuery } from "../utils/hangul";

export default function Dex() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKeyState] = useState(getDexSortPref);
  const [typeFilter, setTypeFilterState] = useState(getDexTypePref);
  const [genFilter, setGenFilterState] = useState(getDexGenerationPref);
  const [legendaryOnly, setLegendaryOnlyState] = useState(getDexLegendaryPref);

  const setSortKey = (value) => {
    setSortKeyState(value);
    setDexSortPref(value);
  };

  const setTypeFilter = (value) => {
    setTypeFilterState(value);
    setDexTypePref(value);
  };

  const setGenFilter = (value) => {
    setGenFilterState(value);
    setDexGenerationPref(value);
  };

  const toggleLegendaryOnly = () => {
    setLegendaryOnlyState(!legendaryOnly);
    setDexLegendaryPref(!legendaryOnly);
  };

  useEffect(() => {
    loadPokemonData()
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => getAllTypes(all), [all]);
  const generations = useMemo(() => getAllGenerations(all), [all]);

  // 세대 필터는 "세대순" 정렬일 때만 노출하므로, 다른 정렬로 옮기면 필터도 푼다.
  const activeGen = sortKey === SORT_OPTIONS.GENERATION ? genFilter : null;

  const filtered = useMemo(() => {
    let list = all.filter((p) => matchesQuery(p.nameKo, query));
    if (typeFilter) list = list.filter((p) => p.types.includes(typeFilter));
    if (activeGen) list = list.filter((p) => p.generation === activeGen);
    if (legendaryOnly) list = list.filter((p) => p.isLegendary || p.isMythical);
    return sortPokemon(list, sortKey);
  }, [all, query, sortKey, typeFilter, activeGen, legendaryOnly]);

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

      {sortKey === SORT_OPTIONS.GENERATION && (
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 6,
            marginBottom: "var(--space-3)",
            overflowX: "auto",
          }}
        >
          <button onClick={() => setGenFilter(null)} style={pillStyle(!genFilter)}>
            전체 세대
          </button>
          {generations.map((g) => (
            <button
              key={g}
              onClick={() => setGenFilter(g)}
              style={pillStyle(genFilter === g)}
            >
              {GENERATION_LABEL_KO[g] || g}
            </button>
          ))}
        </div>
      )}

      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: "var(--space-4)",
          overflowX: "auto",
        }}
      >
        <button
          onClick={toggleLegendaryOnly}
          aria-pressed={legendaryOnly}
          style={pillStyle(legendaryOnly)}
        >
          전설·환상
        </button>
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
