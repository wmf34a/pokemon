import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeftIcon, HomeIcon, BookIcon, GamepadIcon, BellIcon, BugIcon } from "./Icons";
import { unreadNoticeCount } from "../utils/notices";
import InstallBanner from "./InstallBanner";

const NAV_ITEMS = [
  { to: "/", label: "홈", icon: HomeIcon, match: (p) => p === "/" },
  { to: "/dex", label: "도감", icon: BookIcon, match: (p) => p.startsWith("/dex") || p.startsWith("/pokemon") },
  {
    to: "/quiz",
    label: "퀴즈",
    icon: GamepadIcon,
    match: (p) =>
      p.startsWith("/quiz") ||
      p.startsWith("/daily") ||
      p.startsWith("/collection") ||
      p.startsWith("/missions"),
  },
];

export function TopBar({ title, backTo, bare = false }) {
  // 경로가 바뀌면 이 줄 때문에 다시 그려지고, 그때 새로 센다.
  // 알림을 읽고 나왔는데 빨간 점이 남아 있으면 안 된다
  useLocation();
  const unread = unreadNoticeCount();

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
        // 제목이 없는 화면(홈)에서는 아이콘만 얹는다. 배경과 선을 그리면
        // 홈의 큰 제목 위에 빈 띠가 하나 생겨서 어색하다
        background: bare ? "transparent" : "color-mix(in srgb, var(--color-bg) 92%, transparent)",
        backdropFilter: bare ? undefined : "blur(8px)",
        borderBottom: bare ? "none" : "1px solid var(--color-border)",
      }}
    >
      {!bare && backTo && (
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
      {!bare && (
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
      )}

      {/* 오른쪽 끝으로 민다. 제목이 길어도 아이콘 자리는 지킨다 */}
      <div style={{ marginLeft: "auto", display: "flex", flexShrink: 0 }}>
        <HeaderIcon to="/report" label="버그 제보">
          <BugIcon size={21} />
        </HeaderIcon>
        <HeaderIcon to="/notices" label={unread > 0 ? `알림 ${unread}개` : "알림"}>
          <BellIcon size={21} />
          {unread > 0 && (
            /* 숫자를 쓰지 않는다. 몇 개인지보다 "새 게 있다"가 전부다 */
            <span
              style={{
                position: "absolute",
                top: 9,
                right: 9,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-danger)",
              }}
            />
          )}
        </HeaderIcon>
      </div>
    </header>
  );
}

function HeaderIcon({ to, label, children }) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: "var(--radius-pill)",
        color: "var(--color-text)",
        textDecoration: "none",
      }}
    >
      {children}
    </NavLink>
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
      {/* 제목이 없어도 알림·제보 아이콘은 어느 화면에서나 닿을 수 있어야 한다 */}
      <TopBar title={title} backTo={backTo} bare={title === undefined} />
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
