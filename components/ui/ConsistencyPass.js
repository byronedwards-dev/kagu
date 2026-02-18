"use client";
import { T } from "@/lib/constants";
import Btn from "./Btn";

const wrap = (children, borderColor) => (
  <div style={{
    background: `linear-gradient(135deg, rgba(139,124,247,0.06) 0%, rgba(139,124,247,0.02) 100%)`,
    border: `1.5px solid ${borderColor || "rgba(139,124,247,0.2)"}`,
    borderRadius: 12, padding: 16, marginBottom: 16,
  }}>{children}</div>
);

const label = (icon, text, sub) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 15 }}>{icon}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{text}</span>
    {sub && <span style={{ fontSize: 11, color: T.textDim }}>{sub}</span>}
  </div>
);

export default function ConsistencyPass({ result, loading, onRun, onApply, onDiscard }) {
  // State 1: Not run yet
  if (!result && !loading) {
    return wrap(
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {label("👥", "Character Consistency")}
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 4, marginLeft: 31 }}>Scan prompts for recurring secondary characters and harmonize their descriptions</div>
        </div>
        <Btn small ghost onClick={onRun}>Run Check</Btn>
      </div>
    );
  }

  // Loading
  if (loading) {
    return wrap(<>
      {label("👥", "Character Consistency")}
      <div style={{ fontSize: 13, color: T.textDim, padding: "8px 0 0 31px" }}>Analyzing prompts for recurring characters...</div>
    </>);
  }

  // State 3: No characters found
  if (result.characters.length === 0) {
    return wrap(
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label("✅", "Character Consistency", "No recurring secondary characters found")}
        <Btn small ghost onClick={onRun}>Re-run</Btn>
      </div>,
      "rgba(74,222,128,0.25)"
    );
  }

  // State 4: Applied
  if (result.appliedAt) {
    return wrap(
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label("✅", "Character Consistency", `Applied · ${result.characters.length} character${result.characters.length !== 1 ? "s" : ""} harmonized`)}
        <Btn small ghost onClick={onRun}>Re-run</Btn>
      </div>,
      "rgba(74,222,128,0.25)"
    );
  }

  // State 2: Results pending review
  return wrap(<>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      {label("👥", "Character Consistency", `${result.characters.length} found`)}
      <div style={{ display: "flex", gap: 6 }}>
        <Btn small onClick={onApply}>Apply Changes</Btn>
        <Btn small ghost onClick={onDiscard}>Discard</Btn>
      </div>
    </div>

    <div style={{ display: "grid", gap: 8 }}>
      {result.characters.map((ch, i) => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10 }}>
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
  </>);
}
