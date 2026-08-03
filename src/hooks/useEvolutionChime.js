// 진화 알림 토스트가 뜰 때 재생하는 짧은 합성 축하음.
// 외부 오디오 에셋 없이 Web Audio API로 3음 상승 아르페지오를 만든다.
// AudioContext 생성/재생이 실패하는 환경(구형 브라우저, jsdom 등)에서는
// 조용히 무시하고 절대 throw하지 않는다 — 퀴즈 흐름을 막으면 안 되기 때문.

let sharedContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) {
    try {
      sharedContext = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedContext;
}

const CHIME_NOTES_HZ = [523.25, 659.25, 783.99]; // C5, E5, G5
const NOTE_DURATION_S = 0.09;
const NOTE_GAP_S = 0.03;

export function useEvolutionChime() {
  return function playChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      let startTime = ctx.currentTime;
      CHIME_NOTES_HZ.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + NOTE_DURATION_S);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + NOTE_DURATION_S);
        startTime += NOTE_DURATION_S + NOTE_GAP_S;
      });
    } catch {
      // 무음 처리
    }
  };
}
