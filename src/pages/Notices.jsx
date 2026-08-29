import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { BugIcon } from "../components/Icons";
import { NOTICES, getLastReadId, markAllNoticesRead } from "../utils/notices";

/**
 * 업데이트 알림.
 *
 * 서버가 없어서 소식은 코드와 함께 배포된다(`utils/notices.js`).
 *
 * **어느 것이 새 소식인지는 화면에 들어온 순간의 값으로 굳힌다.** 들어오자마자
 * 읽음 처리를 하는데, 그 값을 그대로 다시 읽으면 새 배지가 눈앞에서 사라져서
 * 무엇이 새로 온 것인지 볼 수 없다.
 */
export default function Notices() {
  const [lastReadAtEntry] = useState(getLastReadId);
  // 읽음 처리 뒤에 한 번 더 그린다. 이 화면이 헤더를 품고 있어서,
  // 다시 그리지 않으면 알림을 보고 있는데 종에 빨간 점이 그대로 남는다
  const [, setMarked] = useState(false);

  useEffect(() => {
    markAllNoticesRead();
    setMarked(true);
  }, []);

  return (
    <AppShell title="알림" backTo="/">
      <div style={{ display: "grid", gap: 12 }}>
        {NOTICES.map((notice) => {
          const isNew = notice.id > lastReadAtEntry;
          return (
            <article
              key={notice.id}
              style={{
                padding: "var(--space-4)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isNew && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--color-danger)",
                      color: "#fff",
                    }}
                  >
                    NEW
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {notice.date}
                </span>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0 4px" }}>
                {notice.title}
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text-muted)", margin: 0 }}>
                {notice.body}
              </p>
            </article>
          );
        })}
      </div>

      <Link
        to="/report"
        className="press"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: "var(--space-5)",
          padding: "var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px dashed var(--color-border)",
          textDecoration: "none",
          color: "var(--color-text-muted)",
          fontSize: 14,
        }}
      >
        <BugIcon size={18} />
        이상한 점이 있나요? 알려주세요
      </Link>
    </AppShell>
  );
}
