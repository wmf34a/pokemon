import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon } from "./Icons";

// 네이티브 <audio controls>는 플랫폼마다 UI가 제각각이라 앱 톤과 어긋나므로
// 재생/일시정지 아이콘 버튼으로 감싼 커스텀 컨트롤을 대신 사용한다.
//
// autoPlay는 HTML autoplay 속성 대신 audio.play()를 직접 호출해서 처리한다.
// iPad Safari는 음소거 안 된 오디오의 autoplay 속성을 정책상 거의 항상 막지만,
// 스크립트에서 명시적으로 부른 play()는 방금 있었던 사용자 탭(제스처)을
// 유효한 활성 상태로 인정해서 통과시켜준다.
export default function AudioButton({ src, label = "울음소리 듣기", trackKey, autoPlay = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play()?.catch(() => {}); // 일부 환경(jsdom 등)은 play()가 Promise를 반환하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey, autoPlay]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.currentTime = 0;
      audio.play()?.catch(() => {}); // 일부 환경(jsdom 등)은 play()가 Promise를 반환하지 않는다
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </button>
  );
}
