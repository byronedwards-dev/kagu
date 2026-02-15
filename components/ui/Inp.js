import { T } from "@/lib/constants";

export default function Inp({ value, onChange, placeholder, onKeyDown, autoFocus, style: s }) {
  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.text, width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box", ...s }}
    onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border} />;
}
