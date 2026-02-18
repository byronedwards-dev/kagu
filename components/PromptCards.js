"use client";
import { useState, useEffect } from "react";
import { T, imgFmt, ILLUSTRATION_STYLES } from "@/lib/constants";
import { findBannedWords } from "@/lib/rules";
import InlinePillEditor from "./ui/InlinePillEditor";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import StaleWarning from "./ui/StaleWarning";
import QualityCheck from "./ui/QualityCheck";
import ConsistencyPass from "./ui/ConsistencyPass";

// Check if prompt contains any indication of the expected aspect ratio
function hasAspectHint(prompt, idx, pageFormats) {
  const fmt = imgFmt(idx, pageFormats);
  const p = (prompt || "").toLowerCase();
  if (fmt === "spread") {
    return p.includes("1:2") || p.includes("2:1") || p.includes("panoramic") || p.includes("2048x1024") || p.includes("1024x2048") || p.includes("wide") || p.includes("spread");
  }
  return p.includes("1:1") || p.includes("square") || p.includes("1024x1024");
}

// Format a raw prompt with line breaks for readability.
// Breaks at character description blocks and camera/framing sections.
// This is display-only — the raw prompt is what gets sent to the API.
function formatPrompt(raw) {
  if (!raw) return "—";
  let f = raw;
  // Break before bold character markers: **Name ...**
  f = f.replace(/\s+(\*\*[A-Z])/g, "\n\n$1");
  // Break before character name introductions without bold (e.g., "Max is a small", "Buddy is a tiny")
  // Match: sentence-ending punctuation + space + Capitalized Name + " is a "
  f = f.replace(/([.!])\s+([A-Z][a-z]+ (?:is a|wears|has|stands|sits))/g, "$1\n\n$2");
  // Break before CAMERA/FRAMING or CAMERA: sections
  f = f.replace(/\s+(CAMERA[/:])/g, "\n\n$1");
  // Break before action descriptions that start a new visual beat
  f = f.replace(/([.!])\s+((?:The scene|The background|The setting|The lighting|Gentle|Soft|Warm|Golden|Dramatic) )/g, "$1\n\n$2");
  return f.trim();
}

function PCard({ prompt, idx, lidx, onAI, onRegenOne, onSave, bannedWords, chars, pageFormats }) {
  const [ed, setEd] = useState(false);
  const [lc, setLc] = useState(prompt.prompt || "");
  useEffect(() => { setLc(prompt.prompt || ""); }, [prompt.prompt]);

  const found = findBannedWords(prompt.prompt || "", bannedWords);
  const hasChars = chars && (prompt.prompt || "").length > 200;
  const aspectOk = hasAspectHint(prompt.prompt, idx, pageFormats);
  const expectedFmt = imgFmt(idx, pageFormats) === "spread" ? "panoramic/1:2" : "square/1:1";
  const charCount = (prompt.prompt || "").length;

  return <div style={{ background: T.card, border: `1px solid ${lidx === idx ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PageHdr idx={idx} pageFormats={pageFormats} />
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

export default function PromptCards({ prompts, loading, lidx, onAI, onRegenOne, onSave, promptsStale, onGenPrompts, onGoImages, bannedWords, chars, qualityChecklist, briefStr, pageFormats, brief, setBrief, activeRules, consistencyResult, consistencyLoading, onRunConsistency, onApplyConsistency, onDiscardConsistency }) {
  if (loading && !prompts.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Image Prompts</h2><Loader text="Generating prompts" /></>;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Prompts</h2>
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 6px" }}>Click prompt to edit · AI bar for instructions · ↻ regenerates from text</p>
        {brief && setBrief && <InlinePillEditor label="Style" value={brief.illustration_style} onChange={v => setBrief(p => ({ ...p, illustration_style: v }))} options={ILLUSTRATION_STYLES} />}
      </div>
      {prompts.length > 0 && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Btn small onClick={onGoImages} disabled={loading}>Go to Images →</Btn>
        <Btn small ghost onClick={onGenPrompts} disabled={loading}>↻ Regen Prompts</Btn>
      </div>}
    </div>
    {activeRules}
    {!loading && prompts.length > 0 && qualityChecklist?.length > 0 && <QualityCheck
      checklistItems={qualityChecklist}
      buildContext={() => {
        const promptsText = prompts.map((p, i) => `Page ${i + 1}:\n${p.prompt}`).join("\n\n");
        return `BRIEF:\n${briefStr}\n\nCHARACTER DESCRIPTIONS:\n${chars}\n\nIMAGE PROMPTS:\n${promptsText}`;
      }}
    />}
    {!loading && prompts.length > 0 && <ConsistencyPass
      result={consistencyResult} loading={consistencyLoading}
      onRun={onRunConsistency} onApply={onApplyConsistency} onDiscard={onDiscardConsistency}
    />}
    {promptsStale && <StaleWarning msg="Text has changed since these prompts were generated. Consider regenerating." />}
    <div style={{ display: "grid", gap: 6 }}>
      {prompts.map((p, i) => <PCard key={i} prompt={p} idx={i} lidx={lidx} onAI={onAI} onRegenOne={onRegenOne}
        onSave={onSave} bannedWords={bannedWords} chars={chars} pageFormats={pageFormats} />)}
    </div>
    {loading && <Loader text="Generating next batch" />}
  </div>;
}
