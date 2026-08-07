import { useEffect, useState } from "react";
import { getDailyPokemonId } from "../utils/dailyPokemon";
import { loadPokemonData } from "../utils/pokemonData";

// undefined: 로딩 전, null: 데이터 없음/id 매칭 실패, 그 외: 포켓몬 객체
export function useDailyPokemon() {
  const [pokemon, setPokemon] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    loadPokemonData().then((all) => {
      if (cancelled) return;
      const id = getDailyPokemonId(all);
      const found = id === null ? null : all.find((p) => p.id === id) || null;
      setPokemon(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return pokemon;
}
