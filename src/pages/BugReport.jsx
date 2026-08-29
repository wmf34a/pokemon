import { useState } from "react";
import AppShell from "../components/AppShell";
import { BugIcon } from "../components/Icons";
import { primaryBtn, textInput } from "../styles/tokens";

/**
 * 버그 제보.
 *
 * **서버가 없다.** 이 앱은 정적 파일만 올라가 있어서 제보를 받아 둘 곳이 없다.
 * 그래서 메일 앱을 열어 주는 방식으로 만들었다 — 쓴 내용과 기기 정보를 미리 채워
 * 보내기만 누르면 되게 한다.
 *
 * **무엇이 함께 가는지 화면에 그대로 보여준다.** 메일로 나가는 정보라
 * 모르는 채로 보내게 하면 안 된다. 기기 정보 말고는 아무것도 붙이지 않는다.
 */
const TO = "wmf34a@naver.com";

function deviceInfo() {
  const { userAgent } = navigator;
  const size = `${window.screen.width}x${window.screen.height}`;
  const when = new Date().toISOString().slice(0, 16).replace("T", " ");
  return [`보낸 때: ${when}`, `화면 크기: ${size}`, `브라우저: ${userAgent}`].join("\n");
}

export default function BugReport() {
  const [text, setText] = useState("");
  const info = deviceInfo();
  const ready = text.trim().length > 0;

  function send() {
    const subject = "[포켓몬 도감] 버그 제보";
    const body = `${text.trim()}\n\n---- 아래는 자동으로 붙는 정보 ----\n${info}\n`;
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <AppShell title="버그 제보" backTo="/notices">
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-muted)" }}>
        이상하게 나오는 것을 알려주시면 고칠게요. 어느 화면에서, 무엇을 눌렀을 때
        그랬는지 적어 주시면 훨씬 빨리 찾을 수 있어요.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder="예) 퀴즈에서 힌트를 다 열었는데 다음 문제로 넘어가지 않아요"
        style={{ ...textInput, width: "100%", resize: "vertical", lineHeight: 1.6 }}
      />

      <details
        style={{
          marginTop: "var(--space-3)",
          padding: "var(--space-3)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          fontSize: 13,
          color: "var(--color-text-muted)",
        }}
      >
        <summary style={{ cursor: "pointer" }}>함께 보내지는 정보 보기</summary>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            margin: "8px 0 0",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {info}
        </pre>
      </details>

      <button
        type="button"
        onClick={send}
        disabled={!ready}
        style={{
          ...primaryBtn,
          width: "100%",
          marginTop: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: ready ? 1 : 0.5,
        }}
      >
        <BugIcon size={18} />
        메일 앱으로 보내기
      </button>

      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
        누르면 메일 앱이 열려요. 마지막으로 보내기를 눌러야 전송돼요.
      </p>
    </AppShell>
  );
}
