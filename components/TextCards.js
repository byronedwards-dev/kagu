"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/constants";
import { countSyllables, findNameRhymes } from "@/lib/rules";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import Pill from "./ui/Pill";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import StaleWarning from "./ui/StaleWarning";

function TCard({ page, op, idx, lidx, onAI, onSave, charNames }) {
  const [ed, setEd] = useState(false);
  const [lc, setLc] = useState(page.text || "");
  const [exp, setExp] = useState(false);
  useEffect(() => { setLc(page.text || ""); }, [page.text]);

  const desc = op?.description || "";
  const long = desc.length > 100;

  // Validation
  const lines = (page.text || "").split("\n").filter(l => l.trim());
  const lineCount = lines.length;
  const nameRhymes = findNameRhymes(page.text || "", charNames);
  const syllableCounts = lines.map(l => countSyllables(l));

  return <div style={{ background: T.card, border: `1px solid ${lidx === idx ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
    <PageHdr idx={idx} titleShort={op?.title_short} />
    {page.image_only && <div style={{ marginBottom: 6 }}><Pill color={T.amber}>Image Only</Pill></div>}
    {lidx === idx ? <Loader text="Updating" /> : <div style={{ display: "grid", gridTemplateColumns: desc ? "1fr 1fr" : "1fr", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Story Text</div>
        {ed ? <div>
          <Txt value={lc} onChange={setLc} rows={3} style={{ fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}><Btn small onClick={() => { onSave(idx, lc); setEd(false); }}>Save</Btn><Btn ghost small onClick={() => { setEd(false); setLc(page.text || ""); }}>Cancel</Btn></div>
        </div> : <p style={{ fontSize: 14, color: page.image_only ? T.textDim : T.text, lineHeight: 1.7, margin: 0, cursor: "pointer", fontStyle: page.image_only ? "italic" : "normal", whiteSpace: "pre-wrap" }} onClick={() => setEd(true)}>{page.text || "(image only)"}</p>}
        {/* Validation indicators */}
        {!page.image_only && page.text && <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: lineCount > 4 ? T.red : T.textDim }}>{lineCount} line{lineCount !== 1 ? "s" : ""}</span>
          {syllableCounts.map((sc, li) => <span key={li} style={{ fontSize: 11, color: (sc < 6 || sc > 12) ? T.amber : T.textDim }}>L{li + 1}: {sc} syl</span>)}
          {nameRhymes.length > 0 && <span style={{ fontSize: 11, color: T.red }}>⚠ Name rhyme: {nameRhymes.join(", ")}</span>}
        </div>}
      </div>
      {desc && <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Scene</div>
        <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.55, margin: 0 }}>{exp || !long ? desc : desc.slice(0, 100) + "..."}</p>
        {long && <button onClick={() => setExp(!exp)} style={{ background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}>{exp ? "Less" : "More"}</button>}
      </div>}
    </div>}
    {!ed && <AIBar onSubmit={i => onAI(idx, i)} />}
  </div>;
}

export default function TextCards({ text, outline, loading, lidx, onAI, onSave, textStale, prompts, onGenPrompts, onViewPrompts, onRegenText, charNames }) {
  // Total word count
  const totalWords = text.reduce((sum, p) => sum + (p.text || "").split(/\s+/).filter(Boolean).length, 0);

  if (loading && !text.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Story Text</h2><Loader text="Writing story" /></>;
  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Story Text</h2>
    <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>{totalWords} words total · Click to edit · Scene on right</p>
    {textStale && <StaleWarning msg="Outline has changed since this text was generated. Consider regenerating." />}
    <div style={{ display: "grid", gap: 6 }}>
      {text.map((p, i) => <TCard key={i} page={p} op={outline?.[i]} idx={i} lidx={lidx} onAI={onAI} onSave={onSave} charNames={charNames} />)}
    </div>
    {loading && <Loader text="Generating next batch" />}
    {!loading && text.length > 0 && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {prompts.length > 0
        ? <><Btn onClick={onViewPrompts}>View Image Prompts →</Btn><Btn ghost onClick={onGenPrompts}>↻ Regenerate Prompts</Btn></>
        : <Btn onClick={onGenPrompts}>Generate Image Prompts →</Btn>
      }
      {textStale && <Btn ghost danger onClick={onRegenText}>↻ Regenerate Text (outline changed)</Btn>}
    </div>}
  </div>;
}
