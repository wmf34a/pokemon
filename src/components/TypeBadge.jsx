import { TYPE_LABEL_KO, TYPE_COLOR } from "../utils/pokemonData";

export default function TypeBadge({ type }) {
  return (
    <span
      style={{
        background: TYPE_COLOR[type] || "#999",
        color: "#fff",
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        marginRight: 4,
        display: "inline-block",
      }}
    >
      {TYPE_LABEL_KO[type] || type}
    </span>
  );
}
