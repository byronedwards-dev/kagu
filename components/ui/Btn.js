import { T } from "@/lib/constants";

export default function Btn({ children, onClick, disabled, ghost, small, danger, style: s }) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding: small ? "6px 14px" : "11px 22px", borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600,
    border: ghost ? `1px solid ${danger ? "rgba(248,113,113,.4)" : T.border}` : "none",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s",
    background: danger ? "rgba(248,113,113,.12)" : ghost ? "transparent" : T.accent,
    color: danger ? T.red : ghost ? T.accent : "#fff",
    opacity: disabled ? .4 : 1, fontFamily: "inherit", ...s,
  }}>{children}</button>;
}
