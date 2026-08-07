import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { CalendarIcon, LayersIcon, HeartIcon, ClipboardCheckIcon } from "../components/Icons";

export const MODES = [
  { key: "daily", icon: CalendarIcon, title: "오늘의 포켓몬", desc: "매일 새로운 포켓몬을 만나보세요", to: "/daily", ready: true },
  { key: "collection", icon: LayersIcon, title: "카드 수집", desc: "퀴즈를 풀고 카드를 모아보세요", to: "/collection", ready: true },
  { key: "care", icon: HeartIcon, title: "포켓몬 키우기", desc: "매일 돌보며 애착을 키워요", to: "/care", ready: true },
  { key: "missions", icon: ClipboardCheckIcon, title: "일일 미션", desc: "오늘의 습관을 완료하고 카드 받기", to: "/missions", ready: true },
];

export default function MoreMenu() {
  return (
    <AppShell title="더보기" backTo="/">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {MODES.map(({ key, icon: Icon, title, desc, to, ready }) => (
          <Link
            key={key}
            to={ready ? to : "#"}
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
