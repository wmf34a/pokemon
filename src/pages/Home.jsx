import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { BookIcon, GamepadIcon } from "../components/Icons";

export default function Home() {
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

      <div style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
        <NavCard
          to="/dex"
          icon={BookIcon}
          title="포켓몬 도감"
          desc="전체 목록 · 가나다순 · 검색"
          tint="var(--color-accent)"
          ink="var(--color-accent-ink)"
        />
        <NavCard
          to="/quiz"
          icon={GamepadIcon}
          title="퀴즈 바로가기"
          desc="실루엣 · 울음소리 · 초성 퀴즈"
          tint="var(--color-primary)"
          ink="var(--color-text-on-primary)"
        />
      </div>

      <p
        style={{
          marginTop: "var(--space-10)",
          fontSize: 12,
          color: "var(--color-text-muted)",
          lineHeight: 1.6,
        }}
      >
        본 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The
        Pokémon Company와 관련이 없습니다. 데이터 출처:{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">
          PokeAPI
        </a>
      </p>
    </AppShell>
  );
}

function NavCard({ to, icon: Icon, title, desc, tint, ink }) {
  return (
    <Link
      to={to}
      className="press pop-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-5)",
        borderRadius: "var(--radius-lg)",
        background: tint,
        color: ink,
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
        <Icon size={26} strokeWidth={1.9} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{title}</div>
        <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, opacity: 0.85 }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}
