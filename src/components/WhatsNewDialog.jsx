import { BellIcon, BugIcon, PuzzleIcon } from "./Icons";

/**
 * 새로 생긴 것 안내.
 *
 * 딱 한 번만 뜬다(`hasSeenTour`). 종과 벌레 아이콘이 화면 오른쪽 위에
 * 새로 생겼는데 아무 말도 없으면 그것이 뭔지 모른 채 지나간다.
 *
 * **어디에 생겼는지를 말로 적는다.** 화살표로 가리키면 기기마다 위치가 어긋난다.
 */
const ITEMS = [
  {
    icon: PuzzleIcon,
    title: "스무고개 퀴즈",
    body: "힌트를 하나씩 열어가며 맞혀요. 적게 볼수록 점수가 높아요.",
  },
  {
    icon: BellIcon,
    title: "알림",
    body: "화면 오른쪽 위 종 모양이에요. 새 기능이 생기면 여기에 알려드려요.",
  },
  {
    icon: BugIcon,
    title: "버그 제보",
    body: "종 옆에 있어요. 이상한 점을 알려주시면 고칠게요.",
  },
];

export default function WhatsNewDialog({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="새로 생긴 것"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 340,
          borderRadius: "var(--radius-lg)",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-5)",
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontFamily: "var(--font-heading)",
            fontWeight: 400,
            textAlign: "center",
            margin: 0,
          }}
        >
          새로 생긴 것들이에요
        </h3>

        <div style={{ display: "grid", gap: 14, margin: "var(--space-4) 0" }}>
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
                  color: "var(--color-accent-ink)",
                }}
              >
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-muted)" }}>
                  {body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="press"
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "var(--color-primary)",
            color: "var(--color-text-on-primary)",
            fontWeight: 700,
          }}
        >
          알겠어요
        </button>
      </div>
    </div>
  );
}
