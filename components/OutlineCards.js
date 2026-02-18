"use client";
import { useState, useEffect } from "react";
import { T, TEXT_DENSITIES, imgName } from "@/lib/constants";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import Pill from "./ui/Pill";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import QualityCheck from "./ui/QualityCheck";
import InlinePillEditor from "./ui/InlinePillEditor";

function OCard({ page, idx, lidx, onAI, onSave, pageFormats, onDelete, canDelete }) {
  const [ed, setEd] = useState(false);
  const [lc, setLc] = useState(page.description || "");
  useEffect(() => { setLc(page.description || ""); }, [page.description]);

  return <div style={{
    background: T.card,
    border: `1px solid ${lidx === idx ? T.accent : T.border}`,
    borderRadius: 10, padding: 14,
  }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <PageHdr idx={idx} titleShort={page.title_short} pageFormats={pageFormats} />
          {canDelete && <button onClick={() => onDelete(idx)}
            style={{ background: "none", border: "none", color: T.textDim, fontSize: 14, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}
            onMouseEnter={e => e.target.style.color = T.red}
            onMouseLeave={e => e.target.style.color = T.textDim}
            title="Delete page">×</button>}
        </div>
        {page.image_only && <div style={{ marginBottom: 6 }}><Pill color={T.amber}>Image Only</Pill></div>}
        {lidx === idx ? <Loader text="Updating" /> : ed ? <div>
          <Txt value={lc} onChange={setLc} rows={3} style={{ fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}><Btn small onClick={() => { onSave(idx, lc); setEd(false); }}>Save</Btn><Btn ghost small onClick={() => { setEd(false); setLc(page.description || ""); }}>Cancel</Btn></div>
        </div> : <p style={{ fontSize: 14, color: T.text, lineHeight: 1.65, margin: 0, cursor: "pointer", whiteSpace: "pre-wrap" }} onClick={() => setEd(true)} title="Click to edit">{page.description || "—"}</p>}
        {page.setting && <p style={{ fontSize: 12, color: T.textSoft, margin: "8px 0 0" }}>📍 {page.setting}</p>}
        {!ed && <AIBar onSubmit={i => onAI(idx, i)} />}
      </div>
    </div>
  </div>;
}

export default function OutlineCards({ outline, loading, lidx, onAI, onSave, onRegenOutline, text, onGenText, onViewText, onDelete, onAddPage, qualityChecklist, briefStr, pageFormats, brief, setBrief, activeRules }) {
  // Which pages are fixed (cannot be deleted)
  const fixedNames = new Set(["Cover", "Inside Left", "Inside Right", "Closing", "Back Cover"]);

  if (loading && !outline.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Page Outline</h2><Loader text="Building outline..." /></>;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Page Outline</h2>
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 6px" }}>{outline.length || "—"} images · Click text to edit</p>
        {brief && setBrief && <InlinePillEditor label="Text Density" value={brief.text_density} onChange={v => setBrief(p => ({ ...p, text_density: v }))} options={TEXT_DENSITIES} />}
      </div>
      {outline.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {text.length > 0
          ? <Btn small onClick={onViewText}>View Text →</Btn>
          : <Btn small onClick={onGenText} disabled={loading}>Generate Text →</Btn>
        }
        <Btn small ghost onClick={onRegenOutline} disabled={loading}>↻ Regen Outline</Btn>
      </div>}
    </div>
    {activeRules}
    {!loading && outline.length > 0 && qualityChecklist?.length > 0 && <QualityCheck
      checklistItems={qualityChecklist}
      buildContext={() => `BRIEF:\n${briefStr}\n\nOUTLINE:\n${outline.map((p, i) => `${i + 1}. [${p.format}] ${p.title_short} — ${p.description}${p.image_only ? " (IMAGE ONLY)" : ""}`).join("\n")}`}
    />}
    <div style={{ display: "grid", gap: 6 }}>
      {outline.map((p, i) => {
        const pageName = pageFormats ? (pageFormats[i]?.name || "") : imgName(i);
        const canDelete = !fixedNames.has(pageName);
        return <OCard key={i} page={p} idx={i} lidx={lidx} onAI={onAI} onSave={onSave} pageFormats={pageFormats}
          onDelete={onDelete} canDelete={canDelete}
        />;
      })}
    </div>
    {!loading && outline.length > 0 && onAddPage && <button onClick={onAddPage}
      style={{ display: "block", width: "100%", marginTop: 8, padding: "10px 0", background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 10, color: T.textDim, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
      onMouseEnter={e => { e.target.style.borderColor = T.accent; e.target.style.color = T.accent; }}
      onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textDim; }}
    >+ Add Page</button>}
    {loading && <Loader text="Generating..." />}
  </div>;
}
