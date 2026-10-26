import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
  GENERATION_ORDER,
  getQuizGenerationsPref,
  setQuizGenerationsPref,
} from "../utils/pokemonData";
import { pillStyle } from "../styles/tokens";
import {
  GlassesIcon,
  VolumeIcon,
  SwordsIcon,
  ShuffleIcon,
  SearchIcon,
  PuzzleIcon,
  CalendarIcon,
  LayersIcon,
  ClipboardCheckIcon,
} from "../components/Icons";

const MODES = [
  { key: "silhouette", icon: GlassesIcon, title: "실루엣 퀴즈", desc: "그림자만 보고 포켓몬 맞히기", to: "/quiz/silhouette" },
  { key: "cry", icon: VolumeIcon, title: "울음소리 퀴즈", desc: "소리만 듣고 맞히기", to: "/quiz/cry" },
  { key: "type", icon: SwordsIcon, title: "타입 퀴즈", desc: "제시된 타입을 가진 포켓몬 고르기", to: "/quiz/type" },
  { key: "evolution", icon: ShuffleIcon, title: "진화 순서 맞추기", desc: "진화 전후 순서 배열", to: "/quiz/evolution" },
  { key: "zoom", icon: SearchIcon, title: "누구냔 넌", desc: "확대된 일부만 보고 맞히기", to: "/quiz/zoom" },
  { key: "hint", icon: PuzzleIcon, title: "스무고개", desc: "힌트를 하나씩 듣고 좁혀가기 (자세한 힌트는 1세대만)", to: "/quiz/hint" },
];

// 예전 "더보기" 탭에 있던 기능들. 하단 네비를 3탭(홈/도감/퀴즈)으로 줄이면서
// 이 페이지 하단 섹션으로 옮겨왔다. "포켓몬 키우기"는 /mine("내 포켓몬")
// 페이지로 합쳐져서 여기엔 없다 — 홈 화면 "내 포켓몬" 카드에서 바로 간다.
const MORE_MODES = [
  { key: "daily", icon: CalendarIcon, title: "오늘의 포켓몬", desc: "매일 새로운 포켓몬을 만나보세요", to: "/daily" },
  { key: "collection", icon: LayersIcon, title: "카드 수집", desc: "퀴즈 정답이나 미션 완료로 카드를 모아보세요", to: "/collection" },
  { key: "missions", icon: ClipboardCheckIcon, title: "일일 미션", desc: "오늘의 습관을 완료하고 카드 받기", to: "/missions" },
];

function ModeGrid({ modes }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
      {modes.map(({ key, icon: Icon, title, desc, to }) => (
        <Link
          key={key}
          to={to}
          className="press"
          style={{
            padding: "var(--space-4)",
            minHeight: 130,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            textDecoration: "none",
            color: "var(--color-text)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
              color: "var(--color-accent-ink)",
            }}
          >
            <Icon size={20} />
          </div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{desc}</div>
        </Link>
      ))}
    </div>
  );
}

// 고른 세대를 "2·3세대 포켓몬만 출제"처럼 한 줄로 보여준다. 비어 있으면 전체.
function selectionSummary(selected) {
  if (selected.length === 0) return "전체 포켓몬에서 출제";
  const nums = selected.map((g) => GENERATION_ORDER.indexOf(g) + 1);
  return `${nums.join("·")}세대 포켓몬만 출제`;
}

export default function QuizHub() {
  const [selected, setSelected] = useState(() => getQuizGenerationsPref());

  function update(next) {
    setQuizGenerationsPref(next);
    // 저장 쪽에서 세대 순서로 정리하므로 화면도 같은 값을 다시 읽어 맞춘다
    setSelected(getQuizGenerationsPref());
  }

  function toggleGeneration(g) {
    update(selected.includes(g) ? selected.filter((x) => x !== g) : [...selected, g]);
  }

  const filtered = selected.length > 0;

  return (
    <AppShell title="퀴즈 모드 선택" backTo="/">
      <div
        style={{
          padding: "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius-lg)",
          border: filtered ? "2px solid var(--color-primary)" : "2px solid var(--color-border)",
          background: filtered
            ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))"
            : "var(--color-surface)",
          marginBottom: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={`${import.meta.env.BASE_URL}pokeball.svg`}
            alt=""
            style={{ width: 32, height: 32, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--color-primary)" }}>
              출제할 세대 고르기
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>
              {selectionSummary(selected)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "var(--space-3)" }}>
          <button onClick={() => update([])} aria-pressed={!filtered} style={pillStyle(!filtered)}>
            전체 세대
          </button>
          {GENERATION_ORDER.map((g, i) => (
            <button
              key={g}
              onClick={() => toggleGeneration(g)}
              aria-pressed={selected.includes(g)}
              style={pillStyle(selected.includes(g))}
            >
              {i + 1}세대
            </button>
          ))}
        </div>
      </div>

      <ModeGrid modes={MODES} />

      <h2
        style={{
          fontSize: 16,
          fontFamily: "var(--font-heading)",
          fontWeight: 400,
          marginTop: "var(--space-6)",
          marginBottom: "var(--space-3)",
        }}
      >
        더 즐기기
      </h2>
      <ModeGrid modes={MORE_MODES} />
    </AppShell>
  );
}
