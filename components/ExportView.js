"use client";
import { useState } from "react";
import { T, imgName, imgFmt } from "@/lib/constants";
import Btn from "./ui/Btn";

export default function ExportView({ data }) {
  const [copied, setCopied] = useState(null);
  const copy = (k, t) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 2000); };

  const storyText = data.storyText?.map((p, i) => `--- ${i + 1}. ${imgName(i)} ---\n${p.text || "(image only)"}`).join("\n\n") || "";
  const promptsText = data.imagePrompts?.map((p, i) => `--- ${i + 1}. ${imgName(i)} ---\n${p.prompt}`).join("\n\n") || "";
  const outlineText = data.outline?.map((p, i) => `${i + 1}. ${imgName(i)} [${imgFmt(i)}] — ${p.description}`).join("\n") || "";

  const secs = [
    { k: "chars", l: "Character Descriptions", d: data.characters },
    { k: "outline", l: "Outline", d: outlineText },
    { k: "text", l: "Story Text", d: storyText },
    { k: "prompts", l: "Image Prompts", d: promptsText },
    { k: "json", l: "Full JSON (portable backup)", d: JSON.stringify(data, null, 2) },
  ];

  // Export everything as a single downloadable file
  const exportAll = () => {
    const title = data.selectedConcept?.title || data.brief?.theme || "Untitled Book";
    const divider = "\u2550".repeat(60);

    const content = [
      `${title}`,
      `Exported: ${new Date().toLocaleString()}`,
      "",
      divider,
      "CHARACTER DESCRIPTIONS",
      divider,
      data.characters || "(none)",
      "",
      divider,
      "OUTLINE",
      divider,
      outlineText || "(none)",
      "",
      divider,
      "STORY TEXT",
      divider,
      storyText || "(none)",
      "",
      divider,
      "IMAGE PROMPTS",
      divider,
      promptsText || "(none)",
      "",
      divider,
      "BRIEF",
      divider,
      Object.entries(data.brief || {}).filter(([k, v]) => v?.trim?.()).map(([k, v]) => `${k}: ${v}`).join("\n"),
      "",
      divider,
      "FULL JSON",
      divider,
      JSON.stringify(data, null, 2),
    ].join("\n");

    const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-export.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Export</h2>
      <Btn small onClick={exportAll}>Export All</Btn>
    </div>

    <div style={{ display: "grid", gap: 10 }}>
      {secs.map(s => <div key={s.k} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{s.l}</span>
          <Btn ghost small onClick={() => copy(s.k, s.d)} style={copied === s.k ? { background: T.accentBg } : {}}>{copied === s.k ? "Copied" : "Copy"}</Btn>
        </div>
        <pre style={{ fontSize: 12, color: T.textDim, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>{(s.d || "").slice(0, 500)}{(s.d || "").length > 500 ? "\n\u2026" : ""}</pre>
      </div>)}
    </div>
  </div>;
}
