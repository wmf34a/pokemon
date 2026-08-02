import { useRef, useState } from "react";
import { PlayIcon, PauseIcon } from "./Icons";

// 네이티브 <audio controls>는 플랫폼마다 UI가 제각각이라 앱 톤과 어긋나므로
// 재생/일시정지 아이콘 버튼으로 감싼 커스텀 컨트롤을 대신 사용한다.
export default function AudioButton({ src, label = "울음소리 듣기", trackKey, autoPlay = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "정지" : label}
      className="press"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        minHeight: 44,
        borderRadius: "var(--radius-pill)",
        border: "none",
        background: "var(--color-primary)",
        color: "var(--color-text-on-primary)",
        fontWeight: 700,
      }}
    >
      {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
      {playing ? "재생 중..." : label}
      <audio
        key={trackKey}
        ref={audioRef}
        src={src}
        autoPlay={autoPlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </button>
  );
}
