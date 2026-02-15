import { T } from "@/lib/constants";

export default function Pill({ children, color }) {
  return <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", color: color || T.textDim, background: T.bg, padding: "2px 8px", borderRadius: 100, border: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{children}</span>;
}
