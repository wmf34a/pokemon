import { useState } from "react";
import usePwaInstall, { isIOS } from "../hooks/usePwaInstall";
import { InstallIcon, XIcon } from "./Icons";

export default function InstallBanner() {
  const { isStandalone, canPromptNatively, promptInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isStandalone) return null;

  async function handleClick() {
    if (canPromptNatively) {
      await promptInstall();
      return;
    }
    setShowGuide(true);
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "6px var(--space-4)",
          paddingTop: "calc(6px + var(--safe-top))",
          background: "var(--color-accent)",
          color: "var(--color-accent-ink)",
        }}
      >
        <InstallIcon size={16} strokeWidth={2} />
        <button
          onClick={handleClick}
          style={{
            border: "none",
            background: "none",
            color: "inherit",
            fontWeight: 700,
            fontSize: 13,
            minHeight: 32,
            padding: "4px 6px",
          }}
        >
          홈 화면에 설치하고 앱처럼 써보세요
        </button>
      </div>

      {showGuide && <InstallGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}

function InstallGuideModal({ onClose }) {
  const steps = isIOS()
    ? ["Safari 하단의 공유 버튼을 눌러주세요", "아래에서 홈 화면에 추가를 선택해주세요"]
    : ["브라우저 메뉴 버튼을 눌러주세요", "홈 화면에 추가(또는 앱 설치)를 선택해주세요"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="앱 설치 안내"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-5)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 340,
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6) var(--space-5) var(--space-5)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: "var(--color-surface-2)",
            color: "var(--color-text-muted)",
          }}
        >
          <XIcon size={16} strokeWidth={2} />
        </button>

        <h2 style={{ fontSize: 18, marginBottom: "var(--space-4)" }}>
          홈 화면에 추가하기
        </h2>

        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
          {steps.map((step, i) => (
            <li key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  color: "var(--color-text-on-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14 }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
