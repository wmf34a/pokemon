import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { SparklesIcon } from "../components/Icons";
import { loadPokemonData } from "../utils/pokemonData";
import { getMyPokemon } from "../utils/myPokemon";

export default function Home() {
  const [mine, setMine] = useState(undefined); // undefined = 확인 전, null = 없음, 객체 = 있음
  const [artwork, setArtwork] = useState(null);

  useEffect(() => {
    const rec = getMyPokemon();
    setMine(rec);
    if (rec) {
      loadPokemonData().then((all) => {
        const p = all.find((x) => x.id === rec.currentStageId);
        setArtwork(p?.artwork || null);
      });
    }
  }, []);

  return (
    <AppShell title={undefined}>
      <div style={{ padding: "var(--space-4) 0 var(--space-2)" }}>
        <img
          src={`${import.meta.env.BASE_URL}pokeball.svg`}
          alt=""
          style={{ width: 40, height: 40, marginBottom: "var(--space-3)" }}
        />
        <h1 style={{ fontSize: 30, color: "var(--color-primary)" }}>
          포켓몬 도감 & 퀴즈
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)", lineHeight: 1.5 }}>
          아이와 함께, 또는 포켓몬을 좋아하는 누구나 즐길 수 있는 미니 도감 &
          퀴즈 앱입니다.
        </p>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        {mine === undefined && (
          <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
        )}

        {mine === null && (
          <Link
            to="/mine/choose"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-5)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "color-mix(in srgb, currentColor 18%, transparent)",
                flexShrink: 0,
              }}
            >
              <SparklesIcon size={26} strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                나만의 포켓몬을 만나보세요!
              </div>
              <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                포켓몬을 골라 퀴즈를 풀며 키워보세요
              </div>
            </div>
          </Link>
        )}

        {mine && (
          <Link
            to="/mine"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-card)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--color-surface-2)",
                flexShrink: 0,
              }}
            >
              {artwork && (
                <img src={artwork} alt={mine.nickname} style={{ width: 52, height: 52 }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>내 포켓몬</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                {mine.nickname}
              </div>
            </div>
          </Link>
        )}
      </div>

      <p style={{ marginTop: "var(--space-10)", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
        본 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The
        Pokémon Company와 관련이 없습니다. 데이터 출처:{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokeAPI</a>
      </p>
    </AppShell>
  );
}
