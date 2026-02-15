import { T } from "@/lib/constants";

export default function Sel({ value, onChange, options, placeholder = "Choose..." }) {
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: value ? T.text : T.textDim, width: "100%", outline: "none", fontFamily: "inherit", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238A8498' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
  }}><option value="">{placeholder}</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}
