export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 320,
          borderRadius: "var(--radius-lg)",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-5)",
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: 18, fontFamily: "var(--font-heading)", fontWeight: 400 }}>
          {title}
        </h3>
        {message && (
          <p style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 14 }}>
            {message}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontWeight: 700,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="press"
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
