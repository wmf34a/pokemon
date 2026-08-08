import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getMyPokemon } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";
import {
  getCareState,
  feed,
  play,
  sleep,
  canFeedToday,
  canPlayToday,
  canSleepToday,
  getMoodLevel,
  MOOD_LABEL_KO,
  MOOD_FILTER,
} from "../utils/pokemonCare";

const GRUMPY_TOAST_KEY = "pokemonCare.grumpyToastShown.v1";

function Gauge({ label, value }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: "var(--radius-pill)",
          background: "var(--color-surface-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: "var(--color-accent)",
            borderRadius: "var(--radius-pill)",
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? undefined : "press"}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: "var(--radius-md)",
        border: "none",
        background: disabled ? "var(--color-surface-2)" : "var(--color-primary)",
        color: disabled ? "var(--color-text-muted)" : "var(--color-text-on-primary)",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {disabled ? `${label} (내일)` : label}
    </button>
  );
}

export default function PokemonCare() {
  const [mine, setMine] = useState(undefined);
  const [pokemon, setPokemon] = useState(null);
  const [state, setState] = useState(null);
  const [showGrumpyToast, setShowGrumpyToast] = useState(false);

  useEffect(() => {
    const record = getMyPokemon();
    setMine(record);
    if (!record) return;
    loadPokemonData().then((all) => {
      setPokemon(all.find((p) => p.id === record.currentStageId) || null);
    });
    setState(getCareState());
  }, []);

  const mood = state ? getMoodLevel(state) : null;

  useEffect(() => {
    if (mood !== "grumpy") return;
    let alreadyShown;
    try {
      alreadyShown = sessionStorage.getItem(GRUMPY_TOAST_KEY);
    } catch {
      alreadyShown = null;
    }
    if (alreadyShown) return;
    setShowGrumpyToast(true);
    try {
      sessionStorage.setItem(GRUMPY_TOAST_KEY, "1");
    } catch {
      // 세션 저장 불가 환경에서는 방문마다 다시 뜨는 정도로 허용
    }
  }, [mood]);

  if (mine === undefined) {
    return (
      <AppShell title="포켓몬 키우기" backTo="/quiz">
        <div className="skeleton" style={{ height: 260 }} />
      </AppShell>
    );
  }

  if (!mine) {
    return (
      <AppShell title="포켓몬 키우기" backTo="/quiz">
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-4)" }}>
          아직 내 포켓몬이 없어요. 먼저 포켓몬을 골라주세요.
        </p>
        <Link
          to="/mine/choose"
          className="press"
          style={{
            display: "inline-block",
            marginTop: "var(--space-3)",
            padding: "12px 20px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary)",
            color: "var(--color-text-on-primary)",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          포켓몬 고르러 가기
        </Link>
      </AppShell>
    );
  }

  function handleAction(actionFn) {
    setState(actionFn());
  }

  return (
    <AppShell title="포켓몬 키우기" backTo="/quiz">
      <div style={{ textAlign: "center" }}>
        {pokemon && (
          <img
            src={pokemon.artwork}
            alt={mine.nickname}
            style={{ width: 160, height: 160, filter: mood ? MOOD_FILTER[mood] : "none" }}
          />
        )}
        <h2 style={{ fontSize: 22, marginTop: 8 }}>{mine.nickname}</h2>
        {mood && (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{MOOD_LABEL_KO[mood]}</p>
        )}

        {showGrumpyToast && (
          <div
            style={{
              display: "inline-flex",
              padding: "10px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1.5px solid var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 14%, var(--color-surface))",
              color: "var(--color-text)",
              fontWeight: 700,
              fontSize: 13,
              margin: "var(--space-2) 0",
            }}
          >
            {mine.nickname}가 삐쳤어요! 돌봐주세요
          </div>
        )}

        {state && (
          <div style={{ textAlign: "left", marginTop: "var(--space-4)" }}>
            <Gauge label="배고픔" value={state.hunger} />
            <Gauge label="행복도" value={state.happiness} />
            <Gauge label="피로도" value={state.fatigue} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "var(--space-5)" }}>
          <ActionButton label="밥주기" disabled={!canFeedToday()} onClick={() => handleAction(feed)} />
          <ActionButton label="놀아주기" disabled={!canPlayToday()} onClick={() => handleAction(play)} />
          <ActionButton label="재우기" disabled={!canSleepToday()} onClick={() => handleAction(sleep)} />
        </div>
      </div>
    </AppShell>
  );
}
