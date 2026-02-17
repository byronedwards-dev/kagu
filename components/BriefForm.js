"use client";
import { T, MORALS, THEMES, NAMES_BOY, NAMES_GIRL, NAMES_UNISEX, SIDEKICKS, AGE_RANGES, READER_IDENTITIES, CHARACTER_SETUPS, COMPANION_ROLES, STRUCTURES, DIRECTIONS, TONES, LANGUAGE_STYLES, ILLUSTRATION_STYLES, TEXT_DENSITIES, pick } from "@/lib/constants";
import Btn from "./ui/Btn";
import Field from "./ui/Field";
import Sel from "./ui/Sel";
import Inp from "./ui/Inp";

export default function BriefForm({ brief, set, onSubmit, loading }) {
  const s = (k, v) => set(p => ({ ...p, [k]: v }));
  const hp = brief.character_setup === "Child + companion (pet, creature)";
  const filled = ["age_range", "theme", "character_setup", "character_names", "character_age", "structure", "direction", "moral", "tone", "language_style", "illustration_style", "text_density"].filter(k => brief[k]?.trim()).length;

  const randomize = () => {
    const id = pick(READER_IDENTITIES);
    const nm = id === "Boy" ? NAMES_BOY : id === "Girl" ? NAMES_GIRL : NAMES_UNISEX;
    const su = pick(["One main character", "Child + companion (pet, creature)"]);
    set({
      age_range: pick(AGE_RANGES.slice(0, 3)),
      reader_identity: id,
      theme: pick(THEMES),
      character_setup: su,
      character_names: pick(nm),
      character_age: `${pick(["3", "4", "5"])} years old`,
      character_trait: pick(["curious", "playful", "shy but brave", "energetic", "imaginative"]),
      structure: pick(STRUCTURES),
      direction: pick(DIRECTIONS.filter(d => d !== "Other")),
      moral: pick(MORALS.filter(m => m !== "Other")),
      tone: pick(TONES),
      language_style: pick(LANGUAGE_STYLES.slice(0, 3)),
      illustration_style: pick(ILLUSTRATION_STYLES.slice(0, 3)),
      text_density: pick(TEXT_DENSITIES.slice(0, 2)),
      companion_role: su.includes("companion") ? pick(COMPANION_ROLES.slice(0, 3)) : "",
      sidekick_details: su.includes("companion") ? pick(SIDEKICKS) : "",
    });
  };

  return <div>
    <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Creative Brief</h2><p style={{ fontSize: 14, color: T.textSoft, margin: "6px 0 0" }}>Everything flows from these answers.</p></div>
      <button onClick={randomize} style={{ background: T.accentBg, border: `1px solid rgba(139,124,247,0.25)`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: "inherit" }}>🎲 Random Fill</button>
    </div>
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Age Range"><Sel value={brief.age_range} onChange={v => s("age_range", v)} options={AGE_RANGES} /></Field>
        <Field label="Reader Identity"><Sel value={brief.reader_identity} onChange={v => s("reader_identity", v)} options={READER_IDENTITIES} /></Field>
      </div>
      <Field label="Core Subject / Theme"><Inp value={brief.theme} onChange={v => s("theme", v)} placeholder="e.g., basketball, dinosaurs, space" /></Field>
      <Field label="Character Setup"><Sel value={brief.character_setup} onChange={v => s("character_setup", v)} options={CHARACTER_SETUPS} /></Field>
      {hp && <div style={{ background: T.accentBg, border: `1px solid rgba(139,124,247,0.2)`, borderRadius: 10, padding: 16, display: "grid", gap: 12 }}>
        <Field label="Companion Role"><Sel value={brief.companion_role} onChange={v => s("companion_role", v)} options={COMPANION_ROLES} /></Field>
        <Field label="Sidekick Details" note="Breed, age, max 2 accessories"><Inp value={brief.sidekick_details} onChange={v => s("sidekick_details", v)} placeholder="e.g., 5-month Golden Retriever, red bandana" /></Field>
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Placeholder Name" note="Reader personalizes later"><Inp value={brief.character_names} onChange={v => s("character_names", v)} placeholder="Max" /></Field>
        <Field label="Age"><Inp value={brief.character_age} onChange={v => s("character_age", v)} placeholder="4 years old" /></Field>
        <Field label="Trait"><Inp value={brief.character_trait} onChange={v => s("character_trait", v)} placeholder="playful" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Structure"><Sel value={brief.structure} onChange={v => s("structure", v)} options={STRUCTURES} /></Field>
        <Field label="Direction"><Sel value={brief.direction} onChange={v => s("direction", v)} options={DIRECTIONS} /></Field>
      </div>
      {brief.direction === "Other" && <Field label="Describe direction"><Inp value={brief.direction_other} onChange={v => s("direction_other", v)} /></Field>}
      <Field label="Moral / Takeaway"><Sel value={brief.moral} onChange={v => s("moral", v)} options={MORALS} /></Field>
      {brief.moral === "Other" && <Field label="Describe moral"><Inp value={brief.moral_other} onChange={v => s("moral_other", v)} /></Field>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tone"><Sel value={brief.tone} onChange={v => s("tone", v)} options={TONES} /></Field>
        <Field label="Language"><Sel value={brief.language_style} onChange={v => s("language_style", v)} options={LANGUAGE_STYLES} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Illustration Style"><Sel value={brief.illustration_style} onChange={v => s("illustration_style", v)} options={ILLUSTRATION_STYLES} /></Field>
        <Field label="Text Density"><Sel value={brief.text_density} onChange={v => s("text_density", v)} options={TEXT_DENSITIES} /></Field>
      </div>
    </div>
    <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
      <Btn onClick={onSubmit} disabled={filled < 8 || loading}>{loading ? "Generating..." : "Generate 4 Story Concepts →"}</Btn>
      <span style={{ fontSize: 12, color: T.textDim }}>{filled}/12</span>
    </div>
  </div>;
}
