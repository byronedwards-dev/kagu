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

function TCard({ page, op, idx, lidx, onAI, onSave, onSaveScene, charNames }) {
  const [ed, setEd] = useState(false);
  const [lc, setLc] = useState(page.text || "");
  const [edScene, setEdScene] = useState(false);
  const [sceneVal, setSceneVal] = useState(op?.description || "");
  useEffect(() => { setLc(page.text || ""); }, [page.text]);
  useEffect(() => { setSceneVal(op?.description || ""); }, [op?.description]);

  const desc = op?.description || "";

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
        </div> : <p style={{ fontSize: 14, color: page.image_only ? T.textDim : T.text, lineHeight: 1.7, margin: 0, cursor: "pointer", fontStyle: page.image_only ? "italic" : "normal", whiteSpace: "pre-wrap" }} onClick={() => setEd(true)} title="Click to edit">{page.text || "(image only)"}</p>}
        {/* Validation indicators */}
        {!page.image_only && page.text && <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: lineCount > 4 ? T.red : T.textDim }}>{lineCount} line{lineCount !== 1 ? "s" : ""}</span>
          {syllableCounts.map((sc, li) => <span key={li} style={{ fontSize: 11, color: (sc < 6 || sc > 12) ? T.amber : T.textDim }}>L{li + 1}: {sc} syl</span>)}
          {nameRhymes.length > 0 && <span style={{ fontSize: 11, color: T.red }}>Name rhyme: {nameRhymes.join(", ")}</span>}
        </div>}
      </div>
      {desc && <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Scene</div>
        {edScene ? <div>
          <Txt value={sceneVal} onChange={setSceneVal} rows={4} style={{ fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Btn small onClick={() => { onSaveScene(idx, sceneVal); setEdScene(false); }}>Save</Btn>
            <Btn ghost small onClick={() => { setEdScene(false); setSceneVal(op?.description || ""); }}>Cancel</Btn>
          </div>
        </div> : <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.55, margin: 0, cursor: "pointer", whiteSpace: "pre-wrap" }} onClick={() => setEdScene(true)} title="Click to edit scene">{desc}</p>}
      </div>}
    </div>}
    {!ed && !edScene && <AIBar onSubmit={i => onAI(idx, i)} />}
  </div>;
}

export default function TextCards({ text, outline, loading, lidx, onAI, onSave, onSaveScene, onRegenOutline, textStale, prompts, onGenPrompts, onViewPrompts, onRegenText, charNames }) {
  // Total word count
  const totalWords = text.reduce((sum, p) => sum + (p.text || "").split(/\s+/).filter(Boolean).length, 0);

  if (loading && !text.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Story Text</h2><Loader text="Writing story" /></>;
  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Story Text</h2>
    <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>{totalWords} words total · Click to edit text or scene</p>
    {textStale && <StaleWarning msg="Outline has changed since this text was generated. Consider regenerating." />}
    <div style={{ display: "grid", gap: 6 }}>
      {text.map((p, i) => <TCard key={i} page={p} op={outline?.[i]} idx={i} lidx={lidx} onAI={onAI} onSave={onSave} onSaveScene={onSaveScene} charNames={charNames} />)}
    </div>
    {loading && <Loader text="Generating next batch" />}
    {!loading && text.length > 0 && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {prompts.length > 0
        ? <><Btn onClick={onViewPrompts}>View Image Prompts →</Btn><Btn ghost onClick={onGenPrompts}>↻ Regen Prompts</Btn></>
        : <Btn onClick={onGenPrompts}>Generate Image Prompts →</Btn>
      }
      <Btn ghost onClick={onRegenText}>↻ Regen Text</Btn>
      <Btn ghost onClick={onRegenOutline}>↻ Regen Outline</Btn>
    </div>}
  </div>;
}
