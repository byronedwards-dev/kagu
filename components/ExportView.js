"use client";
import { useState } from "react";
import { T, imgName, imgFmt } from "@/lib/constants";
import Btn from "./ui/Btn";

export default function ExportView({ data, qualityChecklist }) {
  const [copied, setCopied] = useState(null);
  const [checks, setChecks] = useState({});
  const copy = (k, t) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 2000); };

  const secs = [
    { k: "chars", l: "Character Descriptions", d: data.characters },
    { k: "outline", l: "Outline", d: data.outline?.map((p, i) => `${i + 1}. ${imgName(i)} [${imgFmt(i)}] — ${p.description}`).join("\n") },
    { k: "text", l: "Story Text", d: data.storyText?.map((p, i) => `--- ${i + 1}. ${imgName(i)} ---\n${p.text || "(image only)"}`).join("\n\n") },
    { k: "prompts", l: "Image Prompts", d: data.imagePrompts?.map((p, i) => `--- ${i + 1}. ${imgName(i)} ---\n${p.prompt}`).join("\n\n") },
    { k: "json", l: "Full JSON (portable backup)", d: JSON.stringify(data, null, 2) },
  ];

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 20px" }}>Export</h2>

    {/* Quality Checklist */}
    {qualityChecklist?.length > 0 && <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>Quality Checklist</div>
      <div style={{ display: "grid", gap: 6 }}>
        {qualityChecklist.map((item, i) => (
          <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: checks[i] ? T.green : T.textSoft, cursor: "pointer" }}>
            <input type="checkbox" checked={!!checks[i]} onChange={() => setChecks(p => ({ ...p, [i]: !p[i] }))}
              style={{ marginTop: 2, accentColor: T.accent }} />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: T.textDim }}>
        {Object.values(checks).filter(Boolean).length}/{qualityChecklist.length} checked
      </div>
    </div>}

    <div style={{ display: "grid", gap: 10 }}>
      {secs.map(s => <div key={s.k} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{s.l}</span>
          <Btn ghost small onClick={() => copy(s.k, s.d)} style={copied === s.k ? { background: T.accentBg } : {}}>{copied === s.k ? "✓ Copied" : "Copy"}</Btn>
        </div>
        <pre style={{ fontSize: 12, color: T.textDim, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>{(s.d || "").slice(0, 500)}{(s.d || "").length > 500 ? "\n…" : ""}</pre>
      </div>)}
    </div>
  </div>;
}
