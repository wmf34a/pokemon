import AppShell from "../components/AppShell";
import TypeBadge from "../components/TypeBadge";
import AudioButton from "../components/AudioButton";
import { useDailyPokemon } from "../hooks/useDailyPokemon";

export default function DailyPokemon() {
  const pokemon = useDailyPokemon();

  if (pokemon === undefined) {
    return (
      <AppShell title="오늘의 포켓몬" backTo="/more">
        <div className="skeleton" style={{ height: 260 }} />
      </AppShell>
    );
  }

  if (!pokemon) {
    return (
      <AppShell title="오늘의 포켓몬" backTo="/more">
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-4)" }}>
          포켓몬 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="오늘의 포켓몬" backTo="/more">
      <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
        <img
          src={pokemon.artwork}
          alt={pokemon.nameKo}
          style={{ width: 180, height: 180 }}
        />
        <h2 style={{ fontSize: 26, marginTop: "var(--space-3)" }}>{pokemon.nameKo}</h2>
        <div style={{ marginTop: 8 }}>
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <p
          style={{
            marginTop: "var(--space-4)",
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
            textAlign: "left",
          }}
        >
          {pokemon.descriptionKo}
        </p>
        {pokemon.cry && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <AudioButton src={pokemon.cry} trackKey={pokemon.id} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
