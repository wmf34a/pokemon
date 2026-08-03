// TypeQuiz에서 "이 포켓몬이 제시된 타입 조합을 정확히 갖고 있는가"를 순서 무관하게
// 비교하는 순수 함수. 물/독처럼 복합 타입은 두 타입을 모두, 순서와 상관없이 가져야
// 일치로 본다.
export function typesMatch(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((t, i) => t === sortedB[i]);
}
