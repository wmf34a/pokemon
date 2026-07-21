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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 20px",
          borderRadius: 18,
          border: gen1Only ? "2px solid #1F3864" : "2px solid #e5e5e5",
          background: gen1Only ? "#EAF0FA" : "#fff",
          marginBottom: 20,
          cursor: "pointer",
          transition: "background .15s, border-color .15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={`${import.meta.env.BASE_URL}pokeball.svg`}
            alt=""
            style={{ width: 32, height: 32, flexShrink: 0 }}
          />
          <span>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1F3864" }}>
              1세대 포켓몬만 출제
            </div>
            <div style={{ fontSize: 13, color: "#777", marginTop: 2 }}>
              #001 ~ #151 (총 151마리)
            </div>
          </span>
        </span>

        <span style={{ position: "relative", width: 56, height: 32, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={gen1Only}
            onChange={toggleGen1Only}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              margin: 0,
              opacity: 0,
              cursor: "pointer",
              zIndex: 1,
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              background: gen1Only ? "#1F3864" : "#ccc",
              transition: "background .15s",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: 3,
              left: gen1Only ? 27 : 3,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.35)",
              transition: "left .15s",
            }}
          />
        </span>
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
