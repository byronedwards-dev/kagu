"use client";
import { useState } from "react";
import { T } from "@/lib/constants";
import { STEP_RULES, SECTION_LABELS } from "@/lib/rules";

export default function ActiveRules({ step, rules, hasCompanion }) {
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);

  let sections = STEP_RULES[step];
  if (!sections) return null;

  if (!hasCompanion) sections = sections.filter(s => s !== "companion");
  if (!rules.customNotes?.trim()) sections = sections.filter(s => s !== "customNotes");
  if (sections.length === 0) return null;

  const getRuleContent = (key) => {
    if (key === "bannedWords") return (rules.bannedWords || []).join(", ");
    return rules[key] || "";
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => { setOpen(!open); if (open) setExpandedKey(null); }} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent", border: "none",
        padding: "4px 0", fontSize: 12, color: T.textDim,
        cursor: "pointer", fontFamily: "inherit",
      }}
        onMouseEnter={e => e.target.style.color = T.accent}
        onMouseLeave={e => e.target.style.color = T.textDim}
      >
        <span style={{ pointerEvents: "none" }}>Rules ({sections.length}) {open ? "\u25BC" : "\u25B6"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sections.map(key => (
              <button key={key} onClick={() => setExpandedKey(expandedKey === key ? null : key)} style={{
                display: "inline-flex", alignItems: "center",
                background: expandedKey === key ? "rgba(139,124,247,0.12)" : T.card,
                border: `1px solid ${expandedKey === key ? "rgba(139,124,247,0.3)" : T.border}`,
                borderRadius: 100, padding: "4px 12px",
                fontSize: 11, fontWeight: expandedKey === key ? 600 : 400,
                color: expandedKey === key ? T.accent : T.textDim,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {SECTION_LABELS[key] || key}
              </button>
            ))}
          </div>

          {expandedKey && (
            <div style={{
              marginTop: 8, background: T.card,
              border: `1px solid ${T.border}`, borderRadius: 10,
              padding: 14, maxHeight: 200, overflowY: "auto",
            }}>
              <pre style={{
                fontSize: 12, color: T.textSoft,
                whiteSpace: "pre-wrap", margin: 0,
                fontFamily: "inherit", lineHeight: 1.5,
              }}>
                {getRuleContent(expandedKey)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
