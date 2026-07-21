export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "이름 또는 초성으로 검색 (예: ㅍㅋㅊ)"}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #ddd",
        fontSize: 15,
        boxSizing: "border-box",
      }}
    />
  );
}
