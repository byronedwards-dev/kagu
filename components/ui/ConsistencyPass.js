"use client";
import { T } from "@/lib/constants";
import Btn from "./Btn";

export default function ConsistencyPass({ result, loading, onRun, onApply, onDiscard }) {
  // State 1: Not run yet
  if (!result && !loading) {
    return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Character Consistency</span>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>Scan prompts for recurring secondary characters and harmonize their descriptions</div>
        </div>
        <Btn small ghost onClick={onRun}>Run Check</Btn>
      </div>
    </div>;
  }

  // Loading
  if (loading) {
    return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Character Consistency</span>
      <div style={{ fontSize: 13, color: T.textDim, padding: "8px 0" }}>Analyzing prompts for recurring characters...</div>
    </div>;
  }

  // State 3: No characters found
  if (result.characters.length === 0) {
    return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{"\u2705"}</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Character Consistency</span>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 1 }}>No recurring secondary characters found</div>
          </div>
        </div>
        <Btn small ghost onClick={onRun}>Re-run</Btn>
      </div>
    </div>;
  }

  // State 4: Applied
  if (result.appliedAt) {
    return <div style={{ background: T.card, border: `1px solid rgba(74,222,128,0.3)`, borderRadius: 10, padding: 14, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{"\u2705"}</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>Character Consistency</span>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 1 }}>Applied · {result.characters.length} character{result.characters.length !== 1 ? "s" : ""} harmonized</div>
          </div>
        </div>
        <Btn small ghost onClick={onRun}>Re-run</Btn>
      </div>
    </div>;
  }

  // State 2: Results pending review
  return <div style={{ background: T.card, border: `1px solid rgba(139,124,247,0.3)`, borderRadius: 10, padding: 14, marginTop: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Character Consistency</span>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn small onClick={onApply}>Apply Changes</Btn>
        <Btn small ghost onClick={onDiscard}>Discard</Btn>
      </div>
    </div>

    <div style={{ display: "grid", gap: 8 }}>
      {result.characters.map((ch, i) => (
        <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              background: "rgba(139,124,247,0.12)", border: "1px solid rgba(139,124,247,0.3)",
              borderRadius: 100, padding: "2px 10px", fontSize: 12, fontWeight: 600, color: T.accent,
            }}>{ch.name}</span>
            <span style={{ fontSize: 11, color: T.textDim }}>Pages {ch.pages.join(", ")}</span>
          </div>
          <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: ch.changes?.length ? 6 : 0 }}>
            {ch.canonical}
          </div>
          {ch.changes?.length > 0 && <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
            {ch.changes.map((c, j) => <div key={j}>{c}</div>)}
          </div>}
        </div>
      ))}
    </div>
  </div>;
}
