import { SearchIcon, XIcon } from "./Icons";

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <SearchIcon
        size={18}
        style={{
          position: "absolute",
          left: 14,
          color: "var(--color-text-muted)",
          pointerEvents: "none",
        }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "이름 또는 초성으로 검색 (예: ㅍㅋㅊ)"}
        style={{
          width: "100%",
          minHeight: 44,
          padding: "10px 40px 10px 40px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: 15,
          boxSizing: "border-box",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
          style={{
            position: "absolute",
            right: 6,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: "var(--color-surface-2)",
            color: "var(--color-text-muted)",
          }}
        >
          <XIcon size={15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
