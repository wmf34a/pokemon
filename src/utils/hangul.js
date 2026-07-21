// 한글 초성 검색 유틸리티
// 예: "피카츄" -> "ㅍㅋㅊ"

const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

export function getChosung(str) {
  let result = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const choIndex = Math.floor(
        (code - HANGUL_BASE) / (JUNG_COUNT * JONG_COUNT)
      );
      result += CHO[choIndex];
    } else {
      result += ch;
    }
  }
  return result;
}

// 검색어가 전부 초성으로만 이루어져 있는지 확인
export function isChosungOnly(str) {
  return [...str].every((ch) => CHO.includes(ch) || ch === " ");
}

// 이름이 검색어(완성형 한글 또는 초성)에 매치되는지 확인
export function matchesQuery(name, query) {
  if (!query) return true;
  const q = query.trim();
  if (!q) return true;

  if (isChosungOnly(q)) {
    return getChosung(name).includes(q);
  }
  return name.toLowerCase().includes(q.toLowerCase());
}
