import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28 }}>포켓몬 도감 & 퀴즈</h1>
      <p style={{ color: "#666" }}>
        아이와 함께, 또는 포켓몬을 좋아하는 누구나 즐길 수 있는 미니 도감 &
        퀴즈 웹앱입니다.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
        <Link to="/dex" style={cardStyle}>
          📖 포켓몬 도감
          <div style={subStyle}>전체 목록 · 가나다순 · 검색</div>
        </Link>
        <Link to="/quiz" style={cardStyle}>
          🎮 퀴즈 바로가기
          <div style={subStyle}>실루엣 · 울음소리 · 초성 퀴즈</div>
        </Link>
      </div>

      <p style={{ marginTop: 40, fontSize: 12, color: "#999" }}>
        본 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The
        Pokémon Company와 관련이 없습니다. 데이터 출처:{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">
          PokeAPI
        </a>
      </p>
    </div>
  );
}

const cardStyle = {
  flex: "1 1 220px",
  padding: 20,
  borderRadius: 16,
  background: "#F2C31A",
  color: "#1F3864",
  fontWeight: 700,
  fontSize: 18,
  textDecoration: "none",
  boxShadow: "0 2px 8px rgba(0,0,0,.08)",
};

const subStyle = {
  fontWeight: 400,
  fontSize: 13,
  marginTop: 6,
  color: "#3a3a3a",
};
