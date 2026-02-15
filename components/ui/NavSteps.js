import { T } from "@/lib/constants";

export default function NavSteps({ steps, current, done, onNav }) {
  return <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto", paddingBottom: 2 }}>
    {steps.map(s => {
      const cur = s.id === current, ok = done.has(s.id);
      return <button key={s.id} onClick={() => (cur || ok) && onNav(s.id)} style={{
        padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
        border: cur ? `1.5px solid ${T.accent}` : `1px solid ${ok ? "rgba(139,124,247,0.2)" : "transparent"}`,
        cursor: cur || ok ? "pointer" : "default", background: cur ? T.accentBg : "transparent",
        color: cur ? T.accent : ok ? T.textSoft : T.textDim, fontFamily: "inherit", whiteSpace: "nowrap",
      }}>{ok && !cur ? "✓ " : ""}{s.label}</button>;
    })}
  </div>;
}
