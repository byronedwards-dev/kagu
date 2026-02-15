import { T } from "@/lib/constants";

export default function Txt({ value, onChange, rows = 4, placeholder, style: s }) {
  return <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: T.text, width: "100%", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.65, boxSizing: "border-box", ...s }}
    onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border} />;
}
