"use client";
import { useState } from "react";
import { T } from "@/lib/constants";
import { DEFAULT_RULES, assembleSystemPrompt } from "@/lib/rules";
import { IMAGE_MODELS } from "@/lib/api";
import Btn from "./ui/Btn";
import Inp from "./ui/Inp";
import Txt from "./ui/Txt";
import Sel from "./ui/Sel";

const RULE_SECTIONS = [
  { key: "writing", label: "Writing Rules", type: "textarea", usedIn: "Text" },
  { key: "rhyme", label: "Rhyme Rules", type: "textarea", usedIn: "Text" },
  { key: "character", label: "Character Rules", type: "textarea", usedIn: "Characters, Prompts" },
  { key: "imagePrompt", label: "Image Prompt Rules", type: "textarea", usedIn: "Prompts" },
  { key: "bannedWords", label: "Banned Words", type: "list", usedIn: "Prompts" },
  { key: "companion", label: "Companion Rules", type: "textarea", usedIn: "Text, Outline" },
  { key: "storyStructure", label: "Story Structure", type: "textarea", usedIn: "Brief, Outline" },
  { key: "qualityChecklist", label: "Quality Checklist", type: "checklist", usedIn: "Export" },
  { key: "customNotes", label: "Custom Notes", type: "textarea", usedIn: "All steps" },
];

function RuleSection({ section, value, onChange, onReset }) {
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");

  return <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
    <button onClick={() => setOpen(!open)} style={{
      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px", background: open ? T.cardHover : T.card, border: "none",
      cursor: "pointer", color: T.text, fontFamily: "inherit",
    }}>
      <div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{section.label}</span>
        <span style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>Used in: {section.usedIn}</span>
      </div>
      <span style={{ fontSize: 12, color: T.textDim }}>{open ? "▼" : "►"}</span>
    </button>
    {open && <div style={{ padding: 16, background: T.card }}>
      {section.type === "textarea" && (
        <Txt value={value || ""} onChange={v => onChange(section.key, v)} rows={8} style={{ fontSize: 13, lineHeight: 1.6 }} />
      )}
      {section.type === "list" && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {(value || []).map((item, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: T.text }}>
                {item}
                <button onClick={() => onChange(section.key, value.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Inp value={newItem} onChange={setNewItem} placeholder="Add word/phrase..." onKeyDown={e => {
              if (e.key === "Enter" && newItem.trim()) { onChange(section.key, [...(value || []), newItem.trim()]); setNewItem(""); }
            }} style={{ flex: 1 }} />
            <Btn small onClick={() => { if (newItem.trim()) { onChange(section.key, [...(value || []), newItem.trim()]); setNewItem(""); } }}>Add</Btn>
          </div>
        </div>
      )}
      {section.type === "checklist" && (
        <div>
          <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
            {(value || []).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textSoft }}>
                <span style={{ flex: 1 }}>{item}</span>
                <button onClick={() => onChange(section.key, value.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Inp value={newItem} onChange={setNewItem} placeholder="Add checklist item..." onKeyDown={e => {
              if (e.key === "Enter" && newItem.trim()) { onChange(section.key, [...(value || []), newItem.trim()]); setNewItem(""); }
            }} style={{ flex: 1 }} />
            <Btn small onClick={() => { if (newItem.trim()) { onChange(section.key, [...(value || []), newItem.trim()]); setNewItem(""); } }}>Add</Btn>
          </div>
        </div>
      )}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <Btn ghost small onClick={() => onReset(section.key)}>Reset to Default</Btn>
      </div>
    </div>}
  </div>;
}

export default function SettingsModal({ open, onClose, rules, onRulesChange, settings, onSettingsChange }) {
  const [tab, setTab] = useState("connections");
  const [showPreview, setShowPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState("text");

  if (!open) return null;

  const updateRule = (key, value) => {
    onRulesChange({ ...rules, [key]: value });
  };
  const resetRule = (key) => {
    onRulesChange({ ...rules, [key]: DEFAULT_RULES[key] });
  };

  return <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)" }} />
    <div style={{ position: "relative", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, width: "90%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>⚙ Settings</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[{ id: "connections", label: "Connections" }, { id: "rules", label: "Rules" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            border: tab === t.id ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
            background: tab === t.id ? T.accentBg : "transparent",
            color: tab === t.id ? T.accent : T.textDim, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "connections" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, marginBottom: 5, display: "block" }}>n8n Webhook URL</label>
              <Inp value={settings.n8nWebhookUrl || ""} onChange={v => onSettingsChange({ ...settings, n8nWebhookUrl: v })} placeholder="https://your-n8n.com/webhook/kagu-generate" />
              <span style={{ fontSize: 11, color: T.textDim, marginTop: 4, display: "block" }}>Used for batch image generation via n8n workflow</span>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, marginBottom: 5, display: "block" }}>Default Image Model</label>
              <Sel value={settings.defaultModel || ""} onChange={v => onSettingsChange({ ...settings, defaultModel: v })}
                options={IMAGE_MODELS.map(m => m.id)} placeholder="Select model..." />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, marginBottom: 5, display: "block" }}>Supabase URL</label>
              <Inp value={settings.supabaseUrl || ""} onChange={v => onSettingsChange({ ...settings, supabaseUrl: v })} placeholder="https://xxx.supabase.co" />
              <span style={{ fontSize: 11, color: T.textDim, marginTop: 4, display: "block" }}>Optional — state storage. Falls back to localStorage.</span>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, marginBottom: 5, display: "block" }}>Supabase Anon Key</label>
              <Inp value={settings.supabaseKey || ""} onChange={v => onSettingsChange({ ...settings, supabaseKey: v })} placeholder="eyJ..." />
            </div>
          </div>
        )}

        {tab === "rules" && (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 8px" }}>These rules are sent to Claude on every API call. Edit them here — changes take effect immediately.</p>
            {RULE_SECTIONS.map(section => (
              <RuleSection key={section.key} section={section} value={rules[section.key]} onChange={updateRule} onReset={resetRule} />
            ))}
            <div style={{ marginTop: 8 }}>
              <Btn ghost small onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? "Hide" : "Preview"} System Prompt
              </Btn>
              {showPreview && <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {["brief", "characters", "outline", "text", "prompts"].map(s => (
                    <button key={s} onClick={() => setPreviewStep(s)} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: previewStep === s ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                      background: previewStep === s ? T.accentBg : "transparent",
                      color: previewStep === s ? T.accent : T.textDim, cursor: "pointer", fontFamily: "inherit",
                    }}>{s}</button>
                  ))}
                </div>
                <pre style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14, fontSize: 12, color: T.textSoft, maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace", lineHeight: 1.5 }}>
                  {assembleSystemPrompt(rules, previewStep)}
                </pre>
              </div>}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn onClick={onClose}>Done</Btn>
      </div>
    </div>
  </div>;
}
