import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { getGen1OnlyPref, setGen1OnlyPref } from "../utils/pokemonData";
import {
  GlassesIcon,
  VolumeIcon,
  PuzzleIcon,
  SwordsIcon,
  ShuffleIcon,
  HashIcon,
} from "../components/Icons";

const MODES = [
  { key: "silhouette", icon: GlassesIcon, title: "실루엣 퀴즈", desc: "그림자만 보고 포켓몬 맞히기", ready: true },
  { key: "cry", icon: VolumeIcon, title: "울음소리 퀴즈", desc: "소리만 듣고 맞히기", ready: true },
  { key: "chosung", icon: PuzzleIcon, title: "초성 퀴즈", desc: "초성 + 특징으로 맞히기", ready: true },
  { key: "type", icon: SwordsIcon, title: "타입 상성 퀴즈", desc: "효과가 굉장한 타입 고르기", ready: false },
  { key: "evolution", icon: ShuffleIcon, title: "진화 순서 맞추기", desc: "진화 전후 순서 배열", ready: false },
  { key: "updown", icon: HashIcon, title: "도감번호 업다운", desc: "숫자야구 스타일", ready: false },
];

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {MODES.map(({ key, icon: Icon, title, desc, ready }) => (
          <Link
            key={key}
            to={ready ? `/quiz/${key}` : "#"}
            onClick={(e) => !ready && e.preventDefault()}
            aria-disabled={!ready}
            tabIndex={ready ? 0 : -1}
            className={ready ? "press" : undefined}
            style={{
              padding: "var(--space-4)",
              minHeight: 130,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
              color: "var(--color-text)",
              background: ready ? "var(--color-surface)" : "var(--color-surface-2)",
              boxShadow: ready ? "var(--shadow-card)" : "none",
              opacity: ready ? 1 : 0.6,
              cursor: ready ? "pointer" : "default",
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
                background: ready
                  ? "color-mix(in srgb, var(--color-accent) 30%, transparent)"
                  : "var(--color-border)",
                color: ready ? "var(--color-accent-ink)" : "var(--color-text-muted)",
              }}
            >
              <Icon size={20} />
            </div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{desc}</div>
            {!ready && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
                준비중
              </div>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
