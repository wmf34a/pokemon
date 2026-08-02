import { TYPE_LABEL_KO, TYPE_COLOR } from "../utils/pokemonData";

// 타입 배경색 대비 텍스트가 WCAG 기준을 만족하도록 밝기에 따라 흑/백을 선택한다.
function readableTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1c1c1e" : "#ffffff";
}

export default function TypeBadge({ type }) {
  const bg = TYPE_COLOR[type] || "#999";
  return (
    <span
      style={{
        background: bg,
        color: readableTextColor(bg),
        borderRadius: "var(--radius-pill)",
        padding: "3px 11px",
        fontSize: 12,
        fontWeight: 700,
        marginRight: 4,
        display: "inline-block",
        letterSpacing: 0.2,
      }}
    >
      {TYPE_LABEL_KO[type] || type}
    </span>
  );
}
