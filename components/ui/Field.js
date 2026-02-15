import { T } from "@/lib/constants";

export default function Field({ label, children, note }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, letterSpacing: .3 }}>{label}</label>
    {children}{note && <span style={{ fontSize: 11, color: T.textDim, fontStyle: "italic" }}>{note}</span>}
  </div>;
}
