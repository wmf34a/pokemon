// Vibration API 헬퍼. iOS/iPadOS Safari는 이 API 자체를 지원하지 않으므로
// feature-detect 후 없으면 조용히 무시한다 — 버그가 아니라 플랫폼 제약이며,
// 이런 기기에서는 효과음 + 시각 연출만으로 피드백을 준다.
export function vibrate(pattern = 200) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // 일부 환경은 존재를 알려도 호출 시점에 던질 수 있어 방어적으로 무시
  }
}
