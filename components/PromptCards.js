"use client";
import { T, imgFmt } from "@/lib/constants";
import { findBannedWords } from "@/lib/rules";
import Btn from "./ui/Btn";
import AIBar from "./ui/AIBar";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import StaleWarning from "./ui/StaleWarning";

export default function PromptCards({ prompts, loading, lidx, onAI, onRegenOne, promptsStale, onGenPrompts, onGoImages, bannedWords, chars }) {
  if (loading && !prompts.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Image Prompts</h2><Loader text="Generating prompts" /></>;
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Prompts</h2>
        <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>Review and edit prompts · ↻ regenerates from text + characters</p>
      </div>
      {!loading && prompts.length > 0 && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Btn small onClick={onGenPrompts}>↻ Regen All</Btn>
      </div>}
    </div>
    {promptsStale && <StaleWarning msg="Text has changed since these prompts were generated. Consider regenerating." />}
    <div style={{ display: "grid", gap: 6 }}>
      {prompts.map((p, i) => {
        const found = findBannedWords(p.prompt || "", bannedWords);
        const hasChars = chars && (p.prompt || "").length > 200;
        const expectedAspect = imgFmt(i) === "spread" ? "1:2" : "1:1";
        const hasAspect = (p.prompt || "").includes(expectedAspect);

        return <div key={i} style={{ background: T.card, border: `1px solid ${lidx === i ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <PageHdr idx={i} />
            {lidx !== i && <button onClick={() => onRegenOne(i)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "2px 6px" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>↻ Regen</button>}
          </div>
          {/* Validation warnings */}
          {found.length > 0 && <div style={{ fontSize: 12, color: T.red, marginBottom: 6 }}>⚠ Banned words: {found.join(", ")}</div>}
          {!hasChars && <div style={{ fontSize: 12, color: T.amber, marginBottom: 6 }}>⚠ Prompt may be missing full character descriptions</div>}
          {!hasAspect && <div style={{ fontSize: 12, color: T.amber, marginBottom: 6 }}>⚠ Expected aspect ratio {expectedAspect} not found</div>}
          {lidx === i ? <Loader text="Regenerating" /> : <p style={{ fontSize: 14, color: T.text, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{p.prompt || "—"}</p>}
          <AIBar onSubmit={inst => onAI(i, inst)} />
        </div>;
      })}
    </div>
    {loading && <Loader text="Generating next batch" />}
    {!loading && prompts.length > 0 && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Btn onClick={onGoImages}>Generate Images →</Btn>
    </div>}
  </div>;
}
