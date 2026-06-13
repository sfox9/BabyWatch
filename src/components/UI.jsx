import { C, font, fontSans } from "../lib/theme";

export function Badge({ children, color = C.clay }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11,
      fontFamily: fontSans, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: 30, cursor: disabled ? "default" : "pointer", fontFamily: fontSans,
    fontWeight: 700, letterSpacing: "0.02em", transition: "all .18s",
    padding: small ? "6px 16px" : "11px 26px",
    fontSize: small ? 13 : 15,
    opacity: disabled ? 0.6 : 1,
  };
  const variants = {
    primary: { background: C.clay, color: C.white },
    secondary: { background: C.sand, color: C.warm },
    sage: { background: C.sage, color: C.white },
    ghost: { background: "transparent", color: C.clay, border: `1.5px solid ${C.clay}` },
    danger: { background: C.dustyRose, color: C.white },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>{children}</button>
  );
}

const labelStyle = {
  fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 4,
  fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
};

const fieldStyle = {
  width: "100%", boxSizing: "border-box", background: C.white,
  border: `1.5px solid ${C.softBorder}`, borderRadius: 10, padding: "10px 14px",
  fontFamily: fontSans, fontSize: 16, color: C.text, outline: "none",
};

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={labelStyle}>{label}</div>}
      <input {...props} style={{ ...fieldStyle, ...props.style }} />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={labelStyle}>{label}</div>}
      <select {...props} style={{ ...fieldStyle, ...props.style }}>{children}</select>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(61,43,31,0.38)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: C.cream, borderRadius: 20, padding: 28, maxWidth: 430, width: "100%",
        boxShadow: "0 8px 40px rgba(61,43,31,0.18)", maxHeight: "90vh", overflowY: "auto",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: font, fontSize: 22, color: C.warm, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Decorative leaf — SVG only, no emoji.
export function LeafMark({ style }) {
  return (
    <svg viewBox="0 0 60 80" style={{ position: "absolute", opacity: 0.07, pointerEvents: "none", ...style }} fill={C.earth}>
      <path d="M30 75 C30 75 5 55 5 30 C5 10 20 2 30 2 C40 2 55 10 55 30 C55 55 30 75 30 75Z" />
      <line x1="30" y1="75" x2="30" y2="10" stroke={C.earth} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
