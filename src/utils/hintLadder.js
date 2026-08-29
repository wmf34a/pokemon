import { TYPE_LABEL_KO } from "./pokemonData";
import { josa } from "./hangul";
import { APPEARANCE_HINTS } from "./appearanceHints";

/**
 * 스무고개 힌트 사다리.
 *
 * 넓은 데서 좁은 데로 내려간다. 세대 → 타입 → 생김새 → 진화 → 무슨 포켓몬인지.
 * 한 단계씩 열어가며 좁혀 들어가는 것이 이 퀴즈의 재미라서, 순서가 뒤집히면
 * (예: 진화 상대의 이름을 먼저 부르면) 그 자리에서 끝나 버린다.
 *
 * **도감 설명(descriptionKo)은 쓰지 않는다.** 그건 공식 도감 원문이다.
 * 힌트는 타입·색·크기·진화단계처럼 사실 속성만 가지고 여기서 직접 조립한다.
 *
 * **이름을 흘리면 안 된다.** 분류명에 제 이름이 들어간 포켓몬이 있어서
 * (모래뱀 ← "모래뱀포켓몬") 그럴 때는 특성으로 바꿔 낸다. 테스트가 전수로 막는다.
 */

const GENERATION_NO = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};

export const COLOR_LABEL_KO = {
  black: "검은색",
  blue: "파란색",
  brown: "갈색",
  gray: "회색",
  green: "초록색",
  pink: "분홍색",
  purple: "보라색",
  red: "빨간색",
  white: "흰색",
  yellow: "노란색",
};

/** 키를 아이가 가늠할 수 있는 말로. 숫자만 주면 0.7m 가 큰지 작은지 모른다 */
function sizeWord(height) {
  if (height < 0.5) return "손에 올릴 만큼 작아요.";
  if (height < 1) return "무릎 정도로 작아요.";
  if (height < 1.7) return "사람만 해요.";
  if (height < 3) return "사람보다 커요.";
  return "아주 커다래요.";
}

function generationHint(p) {
  const no = GENERATION_NO[p.generation];
  return no ? `${no}세대 포켓몬이에요.` : "언제 나왔는지 알려지지 않은 포켓몬이에요.";
}

function typeHint(p) {
  const names = (p.types || []).map((t) => TYPE_LABEL_KO[t] || t);
  if (names.length === 0) return "타입이 알려지지 않았어요.";
  if (names.length === 1) return `${names[0]} 타입이에요.`;
  // 받침에 따라 과/와가 갈린다. "페어리과 강철" 이라고 쓰면 읽다가 걸린다
  const joined = names.reduce((acc, name, i) =>
    i === 0 ? name : `${acc}${josa(acc, "과", "와")} ${name}`
  );
  return `${joined} 두 가지 타입을 가졌어요.`;
}

function lookHint(p) {
  const color = COLOR_LABEL_KO[p.color] || p.color;
  return `${color}이고, ${sizeWord(p.height)}`;
}

/**
 * 진화 관계. **상대의 이름은 부르지 않는다** — 이름을 부르면 거기서 끝난다.
 * 전설·환상은 마릿수가 적어 강한 힌트라 이 단계에 함께 둔다.
 */
function evolutionHint(p) {
  if (p.isMythical) return "좀처럼 만날 수 없는 환상의 포켓몬이에요.";
  if (p.isLegendary) return "전설의 포켓몬이에요.";

  const canEvolve = (p.evolvesTo || []).length > 0;
  const evolved = p.evolvesFrom != null;

  if (evolved && canEvolve) return "한 번 진화했고, 또 진화할 수 있어요.";
  if (evolved) return "진화를 마친 모습이에요.";
  if (canEvolve) return "아직 진화하지 않았어요. 더 자랄 수 있어요.";
  return "진화하지 않는 포켓몬이에요.";
}

/**
 * 가장 좁은 힌트.
 *
 * 분류명을 그대로 쓸 수 없는 경우가 둘 있다.
 *
 * - 제 이름이 들어간 경우 (모래뱀 ← "모래뱀포켓몬"): 답이 새어 나간다.
 * - **다른 포켓몬의 이름이 들어간 경우** (사다이사 ← "모래뱀포켓몬"): 더 나쁘다.
 *   보기에 모래뱀이 끼면 틀린 답을 가리키는 힌트가 된다. 약한 힌트보다 나쁘다.
 *
 * 둘 다 특성으로 바꿔 낸다. `names` 를 안 넘기면 제 이름만 본다.
 */
function identityHint(p, names) {
  const genus = p.genusKo;
  const namesAPokemon = genus && (names || [p.nameKo]).some((n) => n && genus.includes(n));

  if (genus && !namesAPokemon) return `${genus}이라고 불려요.`;

  const ability = (p.abilitiesKo || [])[0];
  if (ability) return `'${ability}'라는 특성을 가졌어요.`;
  return "이름은 직접 맞혀 보세요.";
}

/**
 * 넓은 것부터 좁은 것까지. **순서를 바꾸지 말 것** —
 * 좁은 힌트가 먼저 나오면 그 자리에서 퀴즈가 끝난다.
 *
 * 생김새 줄은 1세대에만 있다. 그래서 힌트 개수가 포켓몬마다 다르다(5개 또는 6개).
 * 화면은 `hints.length` 를 쓰고 고정값을 쓰지 않는다.
 */
export function buildHints(pokemon, names) {
  if (!pokemon) return [];

  const appearance = APPEARANCE_HINTS[pokemon.id];

  return [
    generationHint(pokemon),
    typeHint(pokemon),
    lookHint(pokemon),
    evolutionHint(pokemon),
    ...(appearance ? [appearance] : []),
    identityHint(pokemon, names),
  ];
}
