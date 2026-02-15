"use client";
import { useState, useRef } from "react";
import { T, imgFmt } from "@/lib/constants";
import { generateImage, IMAGE_MODELS } from "@/lib/api";
import Btn from "./ui/Btn";
import Pill from "./ui/Pill";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import ErrBox from "./ui/ErrBox";
import Inp from "./ui/Inp";

export default function ImagesStep({ prompts, images, setImages, outline, dirtyPages, settings, onSaveState, onLoadState, onForkState, states }) {
  const [selectedModel, setSelectedModel] = useState(settings?.defaultModel || "flux-2-pro");
  const [genIdx, setGenIdx] = useState(null);
  const [genErr, setGenErr] = useState(null);
  const [copied, setCopied] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null); // { current, total }
  const [stateLabel, setStateLabel] = useState("");
  const abortRef = useRef(null);

  const copyPrompt = (idx) => {
    navigator.clipboard.writeText(prompts[idx]?.prompt || "");
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const genOne = async (idx) => {
    setGenErr(null);
    setGenIdx(idx);
    const p = prompts[idx];
    if (!p?.prompt) { setGenIdx(null); return; }

    try {
      const ac = new AbortController();
      abortRef.current = ac;

      // Try n8n first if webhook is configured, otherwise use direct API
      if (settings?.n8nWebhookUrl) {
        const res = await fetch("/api/n8n-send", {
          method: "POST",
          signal: ac.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "single",
            book: { image_model: selectedModel },
            pages: [{
              page_index: idx,
              page_name: outline?.[idx]?.title_short || `Page ${idx + 1}`,
              format: imgFmt(idx),
              aspect_ratio: imgFmt(idx) === "spread" ? "1:2" : "1:1",
              image_prompt: p.prompt,
            }],
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.results?.[idx]?.variants) {
          setImages(prev => {
            const next = { ...prev };
            if (!next[idx]) next[idx] = [];
            for (const v of data.results[idx].variants) {
              next[idx] = [...next[idx], { url: v.url, model: v.model || selectedModel, ts: Date.now(), selected: false }];
            }
            return next;
          });
        }
      } else {
        // Direct API fallback
        const result = await generateImage({
          model: selectedModel,
          prompt: p.prompt,
          aspectRatio: imgFmt(idx) === "square" ? "1:1" : "1:2",
          signal: ac.signal,
        });
        const url = result.image_url || result.image_data_url;
        if (url) {
          setImages(prev => {
            const next = { ...prev };
            if (!next[idx]) next[idx] = [];
            next[idx] = [...next[idx], { url, model: selectedModel, ts: Date.now(), selected: false }];
            return next;
          });
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") setGenErr(`Page ${idx + 1}: ${e.message}`);
    }
    setGenIdx(null);
  };

  const genBatch = async (pageIndices) => {
    const total = pageIndices.length;
    setBatchProgress({ current: 0, total });
    for (let i = 0; i < total; i++) {
      if (abortRef.current?.signal?.aborted) break;
      setBatchProgress({ current: i + 1, total });
      await genOne(pageIndices[i]);
    }
    setBatchProgress(null);
  };

  const genAll = () => genBatch(Array.from({ length: prompts.length }, (_, i) => i));
  const genDirty = () => genBatch(dirtyPages || []);

  const stopGen = () => { abortRef.current?.abort(); setGenIdx(null); setBatchProgress(null); };

  const removeImage = (pageIdx, imgIdx) => {
    setImages(prev => {
      const next = { ...prev };
      next[pageIdx] = next[pageIdx].filter((_, j) => j !== imgIdx);
      if (next[pageIdx].length === 0) delete next[pageIdx];
      return next;
    });
  };

  const selectImage = (pageIdx, imgIdx) => {
    setImages(prev => {
      const next = { ...prev };
      next[pageIdx] = next[pageIdx].map((img, j) => ({ ...img, selected: j === imgIdx }));
      return next;
    });
  };

  const totalImages = Object.values(images).reduce((s, a) => s + a.length, 0);
  const isGenerating = genIdx !== null || batchProgress !== null;

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Generation</h2>
    <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>
      {totalImages} image{totalImages !== 1 ? "s" : ""} generated
      {dirtyPages?.length > 0 && ` · ${dirtyPages.length} page${dirtyPages.length !== 1 ? "s" : ""} need re-generation`}
    </p>

    {/* Model selector */}
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Model</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {IMAGE_MODELS.map(m => (
          <button key={m.id} onClick={() => setSelectedModel(m.id)} style={{
            background: selectedModel === m.id ? T.accentBg : "transparent",
            border: `1px solid ${selectedModel === m.id ? T.accent : T.border}`,
            borderRadius: 10, padding: "10px 12px", textAlign: "left", cursor: "pointer", transition: "all .15s",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: selectedModel === m.id ? T.accent : T.text }}>{m.name}</div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{m.provider} · {m.cost}</div>
            <div style={{ fontSize: 11, color: T.textSoft, marginTop: 2 }}>{m.best_for}</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={genAll} disabled={isGenerating} small>
          ⚡ Generate All Pages
        </Btn>
        {dirtyPages?.length > 0 && (
          <Btn onClick={genDirty} disabled={isGenerating} small ghost>
            ⚡ Generate Dirty Pages Only ({dirtyPages.length})
          </Btn>
        )}
        {isGenerating && <Btn ghost small danger onClick={stopGen}>■ Stop</Btn>}
      </div>
      {/* Progress bar */}
      {batchProgress && <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSoft, marginBottom: 4 }}>
          <span>Generating page {batchProgress.current} of {batchProgress.total}...</span>
          <span>{Math.round(batchProgress.current / batchProgress.total * 100)}%</span>
        </div>
        <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
          <div style={{ height: 4, background: T.accent, borderRadius: 2, width: `${batchProgress.current / batchProgress.total * 100}%`, transition: "width .3s" }} />
        </div>
      </div>}
    </div>

    {genErr && <ErrBox msg={genErr} onDismiss={() => setGenErr(null)} />}

    {/* State management */}
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>State Management</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Inp value={stateLabel} onChange={setStateLabel} placeholder="Label this state..." style={{ flex: 1, minWidth: 200 }} />
        <Btn small onClick={() => { if (stateLabel.trim()) { onSaveState(stateLabel); setStateLabel(""); } }} disabled={!stateLabel.trim()}>💾 Save State</Btn>
      </div>
      {states?.length > 0 && <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Saved states:</div>
        <div style={{ display: "grid", gap: 4 }}>
          {states.slice(0, 5).map(s => (
            <div key={s.state_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12 }}>
              <div>
                <span style={{ color: T.text, fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: T.textDim, marginLeft: 8 }}>{new Date(s.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <Btn small ghost onClick={() => onLoadState(s.state_id)}>Load</Btn>
                <Btn small ghost onClick={() => onForkState(s.state_id)}>Fork</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </div>

    {/* Per-page cards */}
    <div style={{ display: "grid", gap: 8 }}>
      {prompts.map((p, i) => {
        const pageImages = images[i] || [];
        const isPageGenerating = genIdx === i;
        const isDirty = dirtyPages?.includes(i);

        return <div key={i} style={{
          background: T.card, border: `1px solid ${isPageGenerating ? T.accent : isDirty ? T.amber : T.border}`,
          borderRadius: 10, padding: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <PageHdr idx={i} titleShort={outline?.[i]?.title_short} />
              {isDirty && <Pill color={T.amber}>Dirty</Pill>}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => copyPrompt(i)} style={{
                background: copied === i ? T.accentBg : "transparent", border: `1px solid ${T.border}`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                color: copied === i ? T.accent : T.textDim, cursor: "pointer", fontFamily: "inherit",
              }}>{copied === i ? "✓ Copied" : "📋 Copy"}</button>
              <button onClick={() => genOne(i)} disabled={isGenerating} style={{
                background: T.accentBg, border: `1px solid rgba(139,124,247,0.3)`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                color: T.accent, cursor: isGenerating ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: isGenerating ? 0.5 : 1,
              }}>⚡ Generate</button>
            </div>
          </div>

          {/* Prompt preview */}
          <details style={{ marginBottom: pageImages.length ? 10 : 0 }}>
            <summary style={{ fontSize: 12, color: T.textDim, cursor: "pointer", userSelect: "none" }}>
              View prompt ({(p.prompt || "").length} chars)
            </summary>
            <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{p.prompt || "—"}</p>
          </details>

          {isPageGenerating && <Loader text={`Generating with ${selectedModel}`} />}

          {/* Image gallery */}
          {pageImages.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 4 }}>
              {pageImages.map((img, j) => (
                <div key={j} style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={img.url}
                    alt={`Page ${i + 1} variant ${j + 1}`}
                    style={{
                      width: imgFmt(i) === "spread" ? 280 : 160,
                      height: 160,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: img.selected ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                    }}
                  />
                  <div style={{
                    position: "absolute", bottom: 4, left: 4,
                    background: "rgba(0,0,0,.7)", borderRadius: 4, padding: "2px 6px",
                    fontSize: 10, color: T.textSoft,
                  }}>{img.model}</div>
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 2 }}>
                    <button onClick={() => selectImage(i, j)} style={{
                      background: img.selected ? T.accent : "rgba(0,0,0,.7)", border: "none", borderRadius: 4,
                      padding: "2px 6px", fontSize: 10, color: img.selected ? "#fff" : T.textDim, cursor: "pointer",
                    }}>{img.selected ? "★" : "☆"}</button>
                    <button onClick={() => removeImage(i, j)} style={{
                      background: "rgba(0,0,0,.7)", border: "none", borderRadius: 4,
                      padding: "2px 6px", fontSize: 12, color: T.textDim, cursor: "pointer",
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>;
      })}
    </div>
  </div>;
}
