import { Link } from "react-router-dom";

/**
 * 새 소식 바텀시트.
 *
 * 종 아이콘의 빨간 점만으로는 아무도 안 눌러 본다. 서버가 없어 푸시를 못 보내니,
 * 앱을 열었을 때 밑에서 올라오는 시트로 한 번 알려주고 읽음 처리한다.
 *
 * **처음 온 사람에게는 띄우지 않는다.** 그 사람에겐 지난 소식 전부가 "새 소식"이라
 * 여섯 개짜리 시트가 뜬다. 첫 방문은 `WhatsNewDialog` 가 맡는다(Home 에서 가른다).
 *
 * 가운데 팝업이 아니라 아래에서 올라오게 둔 이유는 한 손으로 잡은 폰에서
 * 닫기 버튼이 엄지에 닿아야 하기 때문이다.
 */
export default function NoticeSheet({ notices, onClose }) {
  if (!notices?.length) return null;

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
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="새 소식"
        onClick={(e) => e.stopPropagation()}
        className="notice-sheet"
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "80vh",
          overflowY: "auto",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-3) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            margin: "0 auto var(--space-4)",
            borderRadius: 2,
            background: "var(--color-border)",
          }}
        />

        <h3
          style={{
            fontSize: 18,
            fontFamily: "var(--font-heading)",
            fontWeight: 400,
            textAlign: "center",
            margin: 0,
          }}
        >
          {notices.length === 1 ? "새 소식이 있어요" : `새 소식 ${notices.length}개가 있어요`}
        </h3>

        <div style={{ display: "grid", gap: 14, margin: "var(--space-4) 0" }}>
          {notices.map((n) => (
            <div key={n.id}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{n.date}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{n.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--color-text-muted)", marginTop: 4 }}>
                {n.body}
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
            minHeight: 48,
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "var(--color-primary)",
            color: "var(--color-text-on-primary)",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          확인했어요
        </button>

        <Link
          to="/notices"
          onClick={onClose}
          style={{
            display: "block",
            marginTop: "var(--space-3)",
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-text-muted)",
          }}
        >
          지난 소식 보기
        </Link>
      </div>
    </div>
  );
}
