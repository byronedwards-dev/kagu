import { T } from "@/lib/constants";

export default function ErrBox({ msg, onDismiss }) {
  return <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: 14, margin: "0 0 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
    <span style={{ fontSize: 13, color: T.red, lineHeight: 1.5, wordBreak: "break-word" }}>⚠ {msg}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>
  </div>;
}
