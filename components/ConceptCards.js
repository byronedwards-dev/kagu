"use client";
import { useState } from "react";
import { T } from "@/lib/constants";
import Btn from "./ui/Btn";
import Pill from "./ui/Pill";
import Field from "./ui/Field";
import Inp from "./ui/Inp";
import Txt from "./ui/Txt";
import Sel from "./ui/Sel";
import Loader from "./ui/Loader";

export default function ConceptCards({ concepts, loading, onSelect, onRegen, characterSetup }) {
  const [sel, setSel] = useState(null);
  const [ed, setEd] = useState(null);
  const hasCompanion = characterSetup?.includes("companion");
  const hasSecondChar = characterSetup?.includes("Two") || characterSetup?.includes("adult") || hasCompanion;

  if (loading) return <Loader text="Brainstorming 4 concepts" />;

  if (sel !== null) {
    const u = (k, v) => setEd(p => ({ ...p, [k]: v }));
    const roleKey = hasCompanion ? "companion_role" : "second_character_role";
    const roleLabel = hasCompanion ? "Companion Role" : "Second Character Role";
    return <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 16px" }}>Refine Concept</h2>
      <div style={{ background: T.card, border: `1px solid ${T.accent}`, borderRadius: 12, padding: 20, display: "grid", gap: 14 }}>
        <Field label="Title"><Inp value={ed.title} onChange={v => u("title", v)} /></Field>
        <Field label="Premise"><Txt value={ed.premise} onChange={v => u("premise", v)} rows={3} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: hasSecondChar ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Field label="Structure"><Sel value={ed.structure} onChange={v => u("structure", v)} options={["arc", "pattern", "hybrid"]} /></Field>
          {hasSecondChar && <Field label={roleLabel}><Inp value={ed[roleKey]} onChange={v => u(roleKey, v)} /></Field>}
        </div>
        <Field label="Key Visuals"><Txt value={ed.key_moments} onChange={v => u("key_moments", v)} rows={2} /></Field>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Btn onClick={() => onSelect(ed)}>Continue to Characters →</Btn>
        <Btn ghost onClick={() => { setSel(null); setEd(null); }}>← Back</Btn>
      </div>
    </div>;
  }

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 20px" }}>Story Concepts</h2>
    <div style={{ display: "grid", gap: 10 }}>
      {concepts.map((c, i) => <div key={i} onClick={() => { setSel(i); setEd({ ...c }); }}
        style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.cardHover; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>{c.title}</h3>
        <div style={{ marginBottom: 8 }}><Pill>{(c.structure || "").slice(0, 30)}</Pill></div>
        <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>{c.premise}</p>
      </div>)}
    </div>
    <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
      <button onClick={() => onRegen("")} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Regenerate</button>
    </div>
  </div>;
}
