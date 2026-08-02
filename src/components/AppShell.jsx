import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeftIcon, HomeIcon, BookIcon, GamepadIcon } from "./Icons";
import InstallBanner from "./InstallBanner";

const NAV_ITEMS = [
  { to: "/", label: "홈", icon: HomeIcon, match: (p) => p === "/" },
  { to: "/dex", label: "도감", icon: BookIcon, match: (p) => p.startsWith("/dex") || p.startsWith("/pokemon") },
  { to: "/quiz", label: "퀴즈", icon: GamepadIcon, match: (p) => p.startsWith("/quiz") },
];

export function TopBar({ title, backTo }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 4,
        height: "var(--topbar-height)",
        paddingTop: "var(--safe-top)",
        paddingLeft: "max(var(--space-2), env(safe-area-inset-left, 0px))",
        paddingRight: "var(--space-4)",
        background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {backTo && (
        <NavLink
          to={backTo}
          aria-label="뒤로 가기"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "var(--radius-pill)",
            color: "var(--color-text)",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <ChevronLeftIcon size={22} />
        </NavLink>
      )}
      <h1
        style={{
          fontSize: 18,
          fontWeight: 400,
          fontFamily: "var(--font-heading)",
          letterSpacing: 0.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h1>
    </header>
  );
}

function BottomNav() {
  const { pathname: path } = useLocation();
  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        display: "flex",
        height: "calc(var(--bottomnav-height) + var(--safe-bottom))",
        paddingBottom: "var(--safe-bottom)",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
        const active = match(path);
        return (
          <NavLink
            key={to}
            to={to}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minHeight: 44,
              textDecoration: "none",
              color: active ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: active ? 700 : 500,
              fontSize: 11,
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.1 : 1.75} />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell({ title, backTo, children, hideNav }) {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <InstallBanner />
      {title !== undefined && <TopBar title={title} backTo={backTo} />}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          padding: `var(--space-4) var(--space-4) calc(var(--bottomnav-height) + var(--safe-bottom) + var(--space-6))`,
        }}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
