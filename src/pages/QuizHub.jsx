import { useState } from "react";
import { Link } from "react-router-dom";
import { getGen1OnlyPref, setGen1OnlyPref } from "../utils/pokemonData";

const MODES = [
  { key: "silhouette", emoji: "🕶️", title: "실루엣 퀴즈", desc: "그림자만 보고 포켓몬 맞히기", ready: true },
  { key: "cry", emoji: "🔊", title: "울음소리 퀴즈", desc: "소리만 듣고 맞히기", ready: true },
  { key: "chosung", emoji: "🔤", title: "초성 퀴즈", desc: "초성 + 특징으로 맞히기", ready: true },
  { key: "type", emoji: "⚔️", title: "타입 상성 퀴즈", desc: "효과가 굉장한 타입 고르기", ready: false },
  { key: "evolution", emoji: "🔁", title: "진화 순서 맞추기", desc: "진화 전후 순서 배열", ready: false },
  { key: "updown", emoji: "🔢", title: "도감번호 업다운", desc: "숫자야구 스타일", ready: false },
];

export default function QuizHub() {
  const [gen1Only, setGen1Only] = useState(() => getGen1OnlyPref());

  function toggleGen1Only(e) {
    const checked = e.target.checked;
    setGen1Only(checked);
    setGen1OnlyPref(checked);
  }

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <Link to="/">← 홈</Link>
      <h1 style={{ fontSize: 24, margin: "12px 0" }}>퀴즈 모드 선택</h1>

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 999,
          border: "1px solid #ddd",
          marginBottom: 16,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        <input type="checkbox" checked={gen1Only} onChange={toggleGen1Only} />
        1세대(#1~#151) 포켓몬만 출제
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {MODES.map((m) => (
          <Link
            key={m.key}
            to={m.ready ? `/quiz/${m.key}` : "#"}
            onClick={(e) => !m.ready && e.preventDefault()}
            style={{
              padding: 16,
              borderRadius: 14,
              border: "1px solid #eee",
              textDecoration: "none",
              color: "#222",
              background: m.ready ? "#fff" : "#f5f5f5",
              opacity: m.ready ? 1 : 0.6,
            }}
          >
            <div style={{ fontSize: 26 }}>{m.emoji}</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{m.title}</div>
            <div style={{ fontSize: 13, color: "#888" }}>{m.desc}</div>
            {!m.ready && <div style={{ fontSize: 12, color: "#bbb", marginTop: 6 }}>준비중</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
