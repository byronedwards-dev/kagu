"use client";
import { useState } from "react";
import { T } from "@/lib/constants";
import { callClaude } from "@/lib/api";
import Btn from "./Btn";

export default function QualityCheck({ checklistItems, buildContext }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!checklistItems?.length) return null;

  const run = async () => {
    setLoading(true);
    setResults(null);
    try {
      const context = buildContext();
      const numbered = checklistItems.map((item, i) => `${i + 1}. ${item}`).join("\n");

      const prompt = `You are a children's book quality reviewer. Evaluate EACH checklist item against the book data provided. Be strict — only pass items that clearly meet the criteria.

BOOK DATA:
${context}

QUALITY CHECKLIST:
${numbered}

For each item, determine PASS or FAIL. Be specific — cite page numbers, counts, or exact issues.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "items": [
    { "pass": true, "note": "Brief explanation" },
    { "pass": false, "note": "What's wrong" }
  ]
}

Exactly ${checklistItems.length} entries, one per checklist item in order.`;

      const raw = await callClaude([{ role: "user", content: prompt }], "You are a precise quality reviewer. Respond only with JSON.");
      let cleaned = raw.trim();
      if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      setResults(JSON.parse(cleaned));
    } catch (err) {
      console.error("Quality check failed:", err);
      setResults({ items: [], error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const passCount = results?.items?.filter(r => r.pass).length || 0;
  const total = results?.items?.length || 0;

  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: results ? 10 : 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Quality Check</span>
      <Btn small ghost onClick={run} disabled={loading}>
        {loading ? "Checking..." : results ? "Re-run" : "Run Check"}
      </Btn>
    </div>

    {loading && <div style={{ fontSize: 13, color: T.textDim, padding: "8px 0" }}>
      Evaluating {checklistItems.length} items...
    </div>}

    {results?.error && <div style={{ fontSize: 13, color: T.red, padding: "8px 0" }}>
      Error: {results.error}
    </div>}

    {results?.items?.length > 0 && <>
      <div style={{ display: "grid", gap: 5 }}>
        {checklistItems.map((item, i) => {
          const r = results.items[i];
          if (!r) return null;
          return <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13 }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>{r.pass ? "\u2705" : "\u274C"}</span>
            <div>
              <span style={{ color: r.pass ? T.green : T.red }}>{item}</span>
              {r.note && <div style={{ fontSize: 12, color: T.textDim, marginTop: 1 }}>{r.note}</div>}
            </div>
          </div>;
        })}
      </div>
      <div style={{ marginTop: 10, padding: "8px 10px", background: passCount === total ? "rgba(74,222,128,.1)" : "rgba(248,113,113,.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: passCount === total ? T.green : T.red }}>
        {passCount}/{total} passed
      </div>
    </>}
  </div>;
}
