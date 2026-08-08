import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getGen1OnlyPref, setGen1OnlyPref } from "../utils/pokemonData";
import {
  GlassesIcon,
  VolumeIcon,
  SwordsIcon,
  ShuffleIcon,
  SearchIcon,
  CalendarIcon,
  LayersIcon,
  ClipboardCheckIcon,
} from "../components/Icons";

const MODES = [
  { key: "silhouette", icon: GlassesIcon, title: "실루엣 퀴즈", desc: "그림자만 보고 포켓몬 맞히기", to: "/quiz/silhouette" },
  { key: "cry", icon: VolumeIcon, title: "울음소리 퀴즈", desc: "소리만 듣고 맞히기", to: "/quiz/cry" },
  { key: "type", icon: SwordsIcon, title: "타입 퀴즈", desc: "제시된 타입을 가진 포켓몬 고르기", to: "/quiz/type" },
  { key: "evolution", icon: ShuffleIcon, title: "진화 순서 맞추기", desc: "진화 전후 순서 배열", to: "/quiz/evolution" },
  { key: "zoom", icon: SearchIcon, title: "누구냔 넌", desc: "확대된 일부만 보고 맞히기", to: "/quiz/zoom" },
];

// 예전 "더보기" 탭에 있던 기능들. 하단 네비를 3탭(홈/도감/퀴즈)으로 줄이면서
// 이 페이지 하단 섹션으로 옮겨왔다. "포켓몬 키우기"는 /mine("내 포켓몬")
// 페이지로 합쳐져서 여기엔 없다 — 홈 화면 "내 포켓몬" 카드에서 바로 간다.
const MORE_MODES = [
  { key: "daily", icon: CalendarIcon, title: "오늘의 포켓몬", desc: "매일 새로운 포켓몬을 만나보세요", to: "/daily" },
  { key: "collection", icon: LayersIcon, title: "카드 수집", desc: "퀴즈 정답이나 미션 완료로 카드를 모아보세요", to: "/collection" },
  { key: "missions", icon: ClipboardCheckIcon, title: "일일 미션", desc: "오늘의 습관을 완료하고 카드 받기", to: "/missions" },
];

function ModeGrid({ modes }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {modes.map(({ key, icon: Icon, title, desc, to }) => (
        <Link
          key={key}
          to={to}
          className="press"
          style={{
            padding: "var(--space-4)",
            minHeight: 130,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            textDecoration: "none",
            color: "var(--color-text)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
              color: "var(--color-accent-ink)",
            }}
          >
            <Icon size={20} />
          </div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{desc}</div>
        </Link>
      ))}
    </div>
  );
}

export default function QuizHub() {
  const [gen1Only, setGen1Only] = useState(() => getGen1OnlyPref());

  function toggleGen1Only(e) {
    const checked = e.target.checked;
    setGen1Only(checked);
    setGen1OnlyPref(checked);
  }

  return (
    <AppShell title="퀴즈 모드 선택" backTo="/">
      <label
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius-lg)",
          border: gen1Only ? "2px solid var(--color-primary)" : "2px solid var(--color-border)",
          background: gen1Only
            ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))"
            : "var(--color-surface)",
          marginBottom: "var(--space-5)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={`${import.meta.env.BASE_URL}pokeball.svg`}
            alt=""
            style={{ width: 32, height: 32, flexShrink: 0 }}
          />
          <span>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--color-primary)" }}>
              1세대 포켓몬만 출제
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>
              #001 ~ #151 (총 151마리)
            </div>
          </span>
        </span>

        <span style={{ position: "relative", width: 52, height: 30, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={gen1Only}
            onChange={toggleGen1Only}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              margin: 0,
              opacity: 0,
              zIndex: 1,
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "var(--radius-pill)",
              background: gen1Only ? "var(--color-primary)" : "var(--color-border)",
              transition: "background 150ms ease",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: 3,
              left: gen1Only ? 25 : 3,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.35)",
              transition: "left 150ms ease",
            }}
          />
        </span>
      </label>

      <ModeGrid modes={MODES} />

      <h2
        style={{
          fontSize: 16,
          fontFamily: "var(--font-heading)",
          fontWeight: 400,
          marginTop: "var(--space-6)",
          marginBottom: "var(--space-3)",
        }}
      >
        더 즐기기
      </h2>
      <ModeGrid modes={MORE_MODES} />
    </AppShell>
  );
}
