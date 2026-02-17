"use client";
import { useState, useEffect } from "react";
import { T, imgFmt } from "@/lib/constants";
import { findBannedWords } from "@/lib/rules";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import StaleWarning from "./ui/StaleWarning";

// Check if prompt contains any indication of the expected aspect ratio
function hasAspectHint(prompt, idx) {
  const fmt = imgFmt(idx);
  const p = (prompt || "").toLowerCase();
  if (fmt === "spread") {
    return p.includes("1:2") || p.includes("2:1") || p.includes("panoramic") || p.includes("2048x1024") || p.includes("1024x2048") || p.includes("wide") || p.includes("spread");
  }
  return p.includes("1:1") || p.includes("square") || p.includes("1024x1024");
}

// Format a raw prompt with line breaks for readability.
// Inserts breaks before common section markers (style, lighting, mood, camera, etc.)
// This is display-only — the raw prompt is what gets sent to the API.
function formatPrompt(raw) {
  if (!raw) return "—";
  // Split on period-space or comma-space before known section keywords
  const sectionKeywords = [
    "style:", "lighting:", "mood:", "camera:", "composition:",
    "aspect ratio:", "resolution:", "format:", "render",
    "the scene", "the background", "the setting", "in the foreground",
    "in the background", "the character", "shot type:",
    "color palette:", "atmosphere:", "technical:",
  ];
  let formatted = raw;
  for (const kw of sectionKeywords) {
    // Insert a newline before the keyword if preceded by ". " or ", "
    const regex = new RegExp(`([.,])\\s+(?=${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    formatted = formatted.replace(regex, "$1\n\n");
  }
  // Also break on ". " followed by a capital letter after a long run (100+ chars without break)
  const lines = formatted.split("\n");
  const result = [];
  for (const line of lines) {
    if (line.length > 200) {
      // Split long lines at sentence boundaries
      const sentences = line.split(/(?<=\.)\s+(?=[A-Z])/);
      if (sentences.length > 1) {
        // Group sentences into chunks of ~2-3 for readability
        let chunk = "";
        for (const s of sentences) {
          if (chunk.length > 0 && chunk.length + s.length > 180) {
            result.push(chunk.trim());
            chunk = s;
          } else {
            chunk += (chunk ? " " : "") + s;
          }
        }
        if (chunk) result.push(chunk.trim());
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  return result.join("\n\n");
}

function PCard({ prompt, idx, lidx, onAI, onRegenOne, onSave, bannedWords, chars }) {
  const [ed, setEd] = useState(false);
  const [lc, setLc] = useState(prompt.prompt || "");
  useEffect(() => { setLc(prompt.prompt || ""); }, [prompt.prompt]);

  const found = findBannedWords(prompt.prompt || "", bannedWords);
  const hasChars = chars && (prompt.prompt || "").length > 200;
  const aspectOk = hasAspectHint(prompt.prompt, idx);
  const expectedFmt = imgFmt(idx) === "spread" ? "panoramic/1:2" : "square/1:1";
  const charCount = (prompt.prompt || "").length;

  return <div style={{ background: T.card, border: `1px solid ${lidx === idx ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PageHdr idx={idx} />
        <span style={{ fontSize: 11, color: T.textDim }}>{charCount} chars</span>
      </div>
      {lidx !== idx && <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => { navigator.clipboard.writeText(prompt.prompt || ""); }} style={{ background: "none", border: "none", color: T.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "2px 6px" }}
          onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>📋 Copy</button>
        <button onClick={() => onRegenOne(idx)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "2px 6px" }}
          onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>↻ Regen</button>
      </div>}
    </div>
    {/* Validation warnings */}
    {found.length > 0 && <div style={{ fontSize: 12, color: T.red, marginBottom: 6 }}>⚠ Banned words: {found.join(", ")}</div>}
    {!hasChars && <div style={{ fontSize: 12, color: T.amber, marginBottom: 6 }}>⚠ Prompt may be missing full character descriptions</div>}
    {!aspectOk && <div style={{ fontSize: 12, color: T.amber, marginBottom: 6 }}>⚠ Expected {expectedFmt} not found</div>}
    {lidx === idx ? <Loader text="Regenerating" /> : ed ? <div>
      <Txt value={lc} onChange={setLc} rows={8} style={{ fontSize: 13 }} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <Btn small onClick={() => { onSave(idx, lc); setEd(false); }}>Save</Btn>
        <Btn ghost small onClick={() => { setEd(false); setLc(prompt.prompt || ""); }}>Cancel</Btn>
      </div>
    </div> : <p style={{ fontSize: 13, color: T.text, lineHeight: 1.65, margin: 0, cursor: "pointer", whiteSpace: "pre-wrap" }}
      onClick={() => setEd(true)} title="Click to edit">{formatPrompt(prompt.prompt)}</p>}
    {!ed && <AIBar onSubmit={inst => onAI(idx, inst)} />}
  </div>;
}

export default function PromptCards({ prompts, loading, lidx, onAI, onRegenOne, onSave, promptsStale, onGenPrompts, onGoImages, bannedWords, chars }) {
  if (loading && !prompts.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Image Prompts</h2><Loader text="Generating prompts" /></>;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Prompts</h2>
        <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>Click prompt to edit · AI bar for instructions · ↻ regenerates from text</p>
      </div>
      {!loading && prompts.length > 0 && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Btn small onClick={onGoImages}>Generate Images →</Btn>
        <Btn small ghost onClick={onGenPrompts}>↻ Regen All</Btn>
      </div>}
    </div>
    {promptsStale && <StaleWarning msg="Text has changed since these prompts were generated. Consider regenerating." />}
    <div style={{ display: "grid", gap: 6 }}>
      {prompts.map((p, i) => <PCard key={i} prompt={p} idx={i} lidx={lidx} onAI={onAI} onRegenOne={onRegenOne}
        onSave={onSave} bannedWords={bannedWords} chars={chars} />)}
    </div>
    {loading && <Loader text="Generating next batch" />}
  </div>;
}
