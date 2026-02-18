"use client";
import { useState } from "react";
import { T } from "@/lib/constants";
import { STEP_RULES, SECTION_LABELS } from "@/lib/rules";

export default function ActiveRules({ step, rules, hasCompanion, onRulesChange }) {
  const [open, setOpen] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const [editing, setEditing] = useState(null); // key being edited
  const [editVal, setEditVal] = useState("");

  let sections = STEP_RULES[step];
  if (!sections) return null;

  if (!hasCompanion) sections = sections.filter(s => s !== "companion");
  if (!rules.customNotes?.trim()) sections = sections.filter(s => s !== "customNotes");
  if (sections.length === 0) return null;

  const getRuleContent = (key) => {
    if (key === "bannedWords") return (rules.bannedWords || []).join(", ");
    return rules[key] || "";
  };

  const startEdit = (key) => {
    setEditing(key);
    setEditVal(getRuleContent(key));
  };

  const saveEdit = () => {
    if (!editing || !onRulesChange) return;
    if (editing === "bannedWords") {
      onRulesChange({ ...rules, bannedWords: editVal.split(",").map(w => w.trim()).filter(Boolean) });
    } else {
      onRulesChange({ ...rules, [editing]: editVal });
    }
    setEditing(null);
  };

  const cancelEdit = () => { setEditing(null); };

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => { setOpen(!open); if (open) { setExpandedKey(null); setEditing(null); } }} style={{
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
              <button key={key} onClick={() => { setExpandedKey(expandedKey === key ? null : key); setEditing(null); }} style={{
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
              padding: 14, maxHeight: 240, overflowY: "auto",
            }}>
              {editing === expandedKey ? (
                <div>
                  <textarea
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    style={{
                      width: "100%", minHeight: 100, fontSize: 12, color: T.text,
                      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                      padding: 10, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={saveEdit} style={{
                      background: T.accent, border: "none", borderRadius: 6,
                      padding: "4px 14px", fontSize: 11, fontWeight: 600, color: "#fff",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>Save</button>
                    <button onClick={cancelEdit} style={{
                      background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6,
                      padding: "4px 14px", fontSize: 11, color: T.textDim,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <pre style={{
                    fontSize: 12, color: T.textSoft,
                    whiteSpace: "pre-wrap", margin: 0,
                    fontFamily: "inherit", lineHeight: 1.5,
                  }}>
                    {getRuleContent(expandedKey)}
                  </pre>
                  {onRulesChange && (
                    <button onClick={() => startEdit(expandedKey)} style={{
                      background: "none", border: "none", fontSize: 11, color: T.textDim,
                      cursor: "pointer", fontFamily: "inherit", padding: "6px 0 0",
                    }}
                      onMouseEnter={e => e.target.style.color = T.accent}
                      onMouseLeave={e => e.target.style.color = T.textDim}
                    >Edit rule</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
