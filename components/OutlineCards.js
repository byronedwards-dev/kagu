"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/constants";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import Pill from "./ui/Pill";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";

function OCard({ page, idx, lidx, onAI, onSave }) {
  const [ed, setEd] = useState(false);
  const [lc, setLc] = useState(page.description || "");
  useEffect(() => { setLc(page.description || ""); }, [page.description]);

  return <div style={{ background: T.card, border: `1px solid ${lidx === idx ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
    <PageHdr idx={idx} titleShort={page.title_short} />
    {page.image_only && <div style={{ marginBottom: 6 }}><Pill color={T.amber}>Image Only</Pill></div>}
    {lidx === idx ? <Loader text="Updating" /> : ed ? <div>
      <Txt value={lc} onChange={setLc} rows={3} style={{ fontSize: 13 }} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}><Btn small onClick={() => { onSave(idx, lc); setEd(false); }}>Save</Btn><Btn ghost small onClick={() => { setEd(false); setLc(page.description || ""); }}>Cancel</Btn></div>
    </div> : <p style={{ fontSize: 14, color: T.text, lineHeight: 1.65, margin: 0, cursor: "pointer", whiteSpace: "pre-wrap" }} onClick={() => setEd(true)} title="Click to edit">{page.description || "—"}</p>}
    {page.setting && <p style={{ fontSize: 12, color: T.textSoft, margin: "8px 0 0" }}>📍 {page.setting}{page.next_setting ? ` → ${page.next_setting}` : ""}</p>}
    {!ed && <AIBar onSubmit={i => onAI(idx, i)} />}
  </div>;
}

export default function OutlineCards({ outline, loading, lidx, onAI, onSave, text, onGenText, onViewText }) {
  if (loading && !outline.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Page Outline</h2><Loader text="Building outline (batch 1/2)" /></>;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Page Outline</h2>
        <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>22 images · Click text to edit · AI edit below each card</p>
      </div>
      {!loading && outline.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {text.length > 0
          ? <><Btn small onClick={onViewText}>View Text →</Btn><Btn small ghost onClick={onGenText}>↻ Regen Text</Btn></>
          : <Btn small onClick={onGenText}>Generate Text →</Btn>
        }
      </div>}
    </div>
    <div style={{ display: "grid", gap: 6 }}>
      {outline.map((p, i) => <OCard key={i} page={p} idx={i} lidx={lidx} onAI={onAI} onSave={onSave} />)}
    </div>
    {loading && <Loader text="Generating batch 2/2" />}
  </div>;
}
