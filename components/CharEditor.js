"use client";
import { T } from "@/lib/constants";
import Btn from "./ui/Btn";
import Txt from "./ui/Txt";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";

// Split character descriptions into blocks by detecting character headings
function splitCharBlocks(text) {
  if (!text) return [];
  // Split on lines that look like character headings (e.g., "Max:", "Companion:", "Buddy (Golden Retriever):", etc.)
  // Also split on double newlines that precede a name-like pattern
  const lines = text.split("\n");
  const blocks = [];
  let current = { label: "", lines: [] };

  for (const line of lines) {
    // Detect a character heading: starts with a word/name followed by colon or parenthetical, or common labels
    const headingMatch = line.match(/^([A-Z][a-zA-Z\s]+?)(?:\s*[\(:])/);
    if (headingMatch && current.lines.length > 0) {
      // Save previous block and start new one
      blocks.push({ label: current.label, text: current.lines.join("\n").trim() });
      current = { label: headingMatch[1].trim(), lines: [line] };
    } else if (line.trim() === "" && current.lines.length > 0) {
      // Blank line — could be separator between characters
      // Peek ahead logic isn't easy here, so just keep it in current
      current.lines.push(line);
    } else {
      if (!current.label && current.lines.length === 0) {
        // Try to extract label from first line
        const m = line.match(/^([A-Z][a-zA-Z\s]+?)(?:\s*[\(:])/);
        if (m) current.label = m[1].trim();
      }
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) {
    blocks.push({ label: current.label, text: current.lines.join("\n").trim() });
  }

  // If we only got 1 block, try splitting on double newlines
  if (blocks.length <= 1 && text.includes("\n\n")) {
    const parts = text.split(/\n\n+/).filter(p => p.trim());
    if (parts.length > 1) {
      return parts.map(p => {
        const m = p.match(/^([A-Z][a-zA-Z\s]+?)(?:\s*[\(:])/);
        return { label: m ? m[1].trim() : "", text: p.trim() };
      });
    }
  }

  return blocks;
}

function joinCharBlocks(blocks) {
  return blocks.map(b => b.text).join("\n\n");
}

export default function CharEditor({ content, loading, onManual, onAI, onGenOutline, onViewOutline, brief, activeRules }) {
  const blocks = splitCharBlocks(content);
  const multiBlock = blocks.length > 1;

  // Validation warnings
  const warnings = [];
  if (content) {
    if (!/\b(eye|eyes|skin)\b/i.test(content)) {
      warnings.push("Missing basic identifiers — add eye color and skin tone for face recognition");
    }
    const accessoryMatches = content.match(/\b(bandana|bow|scarf|hat|cap|backpack|collar|ribbon|necklace|bracelet|headband)\b/gi);
    if (accessoryMatches && accessoryMatches.length > 4) {
      warnings.push(`${accessoryMatches.length} accessories detected — keep to max 2 per character`);
    }
  }

  if (loading) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Characters</h2><Loader /></>;

  const updateBlock = (idx, newText) => {
    const updated = blocks.map((b, i) => i === idx ? { ...b, text: newText } : b);
    onManual(joinCharBlocks(updated));
  };

  const showAgeWarning = brief?.age_range?.includes("2–3") || brief?.character_age?.match(/\b3\b/);

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Character Descriptions</h2>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {onGenOutline && <Btn small onClick={onGenOutline}>Generate Outline →</Btn>}
        {onViewOutline && <Btn small ghost onClick={onViewOutline}>View Outline →</Btn>}
      </div>
    </div>
    {showAgeWarning && <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", margin: "0 0 10px", fontSize: 13, color: T.amber }}>Characters will be drawn 1-2 years younger than the selected age to compensate for AI making children look older.</div>}
    {warnings.map((w, i) => <div key={i} style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", margin: "0 0 10px", fontSize: 13, color: T.amber }}>⚠ {w}</div>)}
    {activeRules}

    {multiBlock ? (
      <div style={{ display: "grid", gap: 12 }}>
        {blocks.map((block, i) => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
            {block.label && <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>{block.label}</div>}
            <Txt
              value={block.text}
              onChange={v => updateBlock(i, v)}
              rows={Math.max(8, block.text.split("\n").length + 2)}
              style={{ fontSize: 14, lineHeight: 1.7 }}
            />
          </div>
        ))}
      </div>
    ) : (
      <Txt value={content} onChange={onManual} rows={18} style={{ fontSize: 14, lineHeight: 1.7, minHeight: 300 }} />
    )}

    <AIBar onSubmit={onAI} placeholder="e.g., Add freckles, make puppy fluffier..." />
  </div>;
}
