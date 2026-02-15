"use client";
import { T } from "@/lib/constants";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";

export default function CharEditor({ content, loading, onManual, onAI, onNext, nextLabel }) {
  // Validation warnings
  const warnings = [];
  if (content) {
    if (!/\b(eye|eyes|face|cheek|nose|lip|freckle|dimple)\b/i.test(content)) {
      warnings.push("Missing facial detail — add eye color, nose shape, cheeks, etc. for face recognition");
    }
    const accessoryMatches = content.match(/\b(bandana|bow|scarf|hat|cap|backpack|collar|ribbon|necklace|bracelet|headband)\b/gi);
    if (accessoryMatches && accessoryMatches.length > 4) {
      warnings.push(`${accessoryMatches.length} accessories detected — keep to max 2 per character`);
    }
  }

  if (loading) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Characters</h2><Loader /></>;
  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 16px" }}>Character Descriptions</h2>
    {warnings.map((w, i) => <div key={i} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", margin: "0 0 10px", fontSize: 13, color: T.amber }}>⚠ {w}</div>)}
    <Txt value={content} onChange={onManual} rows={14} style={{ fontSize: 14, lineHeight: 1.7, minHeight: 220 }} />
    <AIBar onSubmit={onAI} placeholder="e.g., Add freckles, make puppy fluffier..." />
    {onNext && <div style={{ marginTop: 16 }}><Btn onClick={onNext}>{nextLabel}</Btn></div>}
  </div>;
}
