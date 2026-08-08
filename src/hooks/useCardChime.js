// 포켓몬 카드를 획득/공개할 때 재생하는 짧은 "딩" 1음 — 퀴즈 정답으로 뜨는
// CardToast와 일일 미션의 CardRevealModal이 함께 쓴다. useEvolutionChime.js와
// 같은 패턴(외부 에셋 없이 Web Audio API로 합성, 실패해도 절대 throw하지
// 않음)이지만 진화 축하음(3음 상승 아르페지오)과는 구분되는 별도 이벤트라
// 독립된 훅으로 둔다.

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

const DING_HZ = 880; // A5
const DING_DURATION_S = 0.15;

export function useCardChime() {
  return function playChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = DING_HZ;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + DING_DURATION_S);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + DING_DURATION_S);
    } catch {
      // 무음 처리
    }
  };
}
