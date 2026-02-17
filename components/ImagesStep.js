"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T, imgFmt } from "@/lib/constants";
import { IMAGE_MODELS } from "@/lib/api";
import Btn from "./ui/Btn";
import Pill from "./ui/Pill";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import ErrBox from "./ui/ErrBox";

export default function ImagesStep({ prompts, images, setImages, outline, dirtyPages, settings }) {
  const [selectedModel, setSelectedModel] = useState(settings?.defaultModel || "flux-2-pro");
  const [genErr, setGenErr] = useState(null);
  const [copied, setCopied] = useState(null);
  const [pending, setPending] = useState(false);
  const [pendingPages, setPendingPages] = useState(null);
  const [progress, setProgress] = useState(null); // { completed, total }
  const [jobId, setJobId] = useState(null);
  const pollRef = useRef(null);

  const copyPrompt = (idx) => {
    navigator.clipboard.writeText(prompts[idx]?.prompt || "");
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  // Build pages payload for n8n
  const buildPagesPayload = (pageIndices) => {
    return pageIndices.map(idx => ({
      page_index: idx,
      page_name: outline?.[idx]?.title_short || `Page ${idx + 1}`,
      format: imgFmt(idx),
      aspect_ratio: imgFmt(idx) === "spread" ? "1:2" : "1:1",
      image_prompt: prompts[idx]?.prompt || "",
    })).filter(p => p.image_prompt);
  };

  // Poll for results from n8n-results endpoint
  const startPolling = useCallback((jid, pageIndices) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/n8n-results?job_id=${jid}`);
        const data = await res.json();

        if (data.error && res.status === 404) {
          // Job not found — might have been cleaned up
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPending(false);
          setPendingPages(null);
          setProgress(null);
          setJobId(null);
          setGenErr("Job not found — it may have expired. Try generating again.");
          return;
        }

        // Update progress
        setProgress({ completed: data.completedPages || 0, total: data.totalPages || pageIndices.length });

        // Apply any completed images incrementally
        if (data.results && Object.keys(data.results).length > 0) {
          setImages(prev => {
            const next = { ...prev };
            for (const [idxStr, result] of Object.entries(data.results)) {
              const idx = parseInt(idxStr, 10);
              const existingUrls = (next[idx] || []).map(img => img.url);
              for (const v of (result.variants || [])) {
                if (!existingUrls.includes(v.url)) {
                  if (!next[idx]) next[idx] = [];
                  next[idx] = [...next[idx], { url: v.url, model: v.model || selectedModel, ts: Date.now(), selected: false }];
                }
              }
            }
            return next;
          });
        }

        // Check if done or errored
        if (data.status === "done") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPending(false);
          setPendingPages(null);
          setProgress(null);
          setJobId(null);
        } else if (data.status === "error") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPending(false);
          setPendingPages(null);
          setProgress(null);
          setJobId(null);
          setGenErr(data.error || "n8n job failed");
        }
      } catch (e) {
        // Network error — keep polling, don't give up
        console.warn("Poll error:", e.message);
      }
    }, 3000); // Poll every 3 seconds
  }, [selectedModel, setImages]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Send pages to n8n — fire and forget, then poll for results
  const generate = async (pageIndices) => {
    if (!settings?.n8nWebhookUrl) {
      setGenErr("n8n webhook URL not configured. Go to Settings → Connections to set it up.");
      return;
    }

    setGenErr(null);
    setPending(true);
    setPendingPages(pageIndices);
    setProgress({ completed: 0, total: pageIndices.length });

    try {
      const res = await fetch("/api/n8n-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: pageIndices.length === 1 ? "single" : "batch",
          webhook_url: settings.n8nWebhookUrl,
          book: { image_model: selectedModel },
          pages: buildPagesPayload(pageIndices),
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Got job_id — start polling
      setJobId(data.job_id);
      startPolling(data.job_id, pageIndices);
    } catch (e) {
      setGenErr(e.message);
      setPending(false);
      setPendingPages(null);
      setProgress(null);
    }
  };

  const genAll = () => generate(Array.from({ length: prompts.length }, (_, i) => i));
  const genDirty = () => generate(dirtyPages || []);
  const genSingle = (idx) => generate([idx]);

  const stopGen = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPending(false);
    setPendingPages(null);
    setProgress(null);
    setJobId(null);
  };

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
  const hasN8n = !!settings?.n8nWebhookUrl;
  const pct = progress ? Math.round(progress.completed / progress.total * 100) : 0;

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Generation</h2>
    <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>
      {totalImages} image{totalImages !== 1 ? "s" : ""} generated
      {dirtyPages?.length > 0 && ` · ${dirtyPages.length} page${dirtyPages.length !== 1 ? "s" : ""} need re-generation`}
      {hasN8n ? " · n8n connected" : " · n8n not configured"}
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
        <Btn onClick={genAll} disabled={pending || !hasN8n} small>
          ⚡ Generate All Pages
        </Btn>
        {dirtyPages?.length > 0 && (
          <Btn onClick={genDirty} disabled={pending || !hasN8n} small ghost>
            ⚡ Dirty Only ({dirtyPages.length})
          </Btn>
        )}
        {pending && <Btn ghost small danger onClick={stopGen}>■ Stop</Btn>}
      </div>
      {!hasN8n && <div style={{ marginTop: 8, fontSize: 12, color: T.amber, fontWeight: 600 }}>
        Set your n8n webhook URL in Settings → Connections to enable image generation.
      </div>}
      {/* Progress bar */}
      {pending && progress && <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSoft, marginBottom: 4 }}>
          <span>
            {progress.completed === 0
              ? `Sending ${progress.total} page${progress.total !== 1 ? "s" : ""} to n8n...`
              : `${progress.completed} of ${progress.total} pages complete`}
          </span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
          <div style={{
            height: 4, borderRadius: 2,
            background: progress.completed === 0 ? T.amber : T.accent,
            width: progress.completed === 0 ? "100%" : `${pct}%`,
            transition: "width .3s",
            animation: progress.completed === 0 ? "sp .7s linear infinite" : "none",
          }} />
        </div>
      </div>}
    </div>

    {genErr && <ErrBox msg={genErr} onDismiss={() => setGenErr(null)} />}

    {/* Per-page cards */}
    <div style={{ display: "grid", gap: 8 }}>
      {prompts.map((p, i) => {
        const pageImages = images[i] || [];
        const isPagePending = pending && pendingPages?.includes(i);
        const isPageDone = pending && progress && progress.completed > 0 && !!images[i]?.length;
        const isDirty = dirtyPages?.includes(i);

        return <div key={i} style={{
          background: T.card, border: `1px solid ${isPagePending && !isPageDone ? T.accent : isDirty ? T.amber : T.border}`,
          borderRadius: 10, padding: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <PageHdr idx={i} titleShort={outline?.[i]?.title_short} />
              {isDirty && <Pill color={T.amber}>Dirty</Pill>}
              {isPagePending && isPageDone && <Pill color={T.accent}>✓</Pill>}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => copyPrompt(i)} style={{
                background: copied === i ? T.accentBg : "transparent", border: `1px solid ${T.border}`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                color: copied === i ? T.accent : T.textDim, cursor: "pointer", fontFamily: "inherit",
              }}>{copied === i ? "✓ Copied" : "📋 Copy"}</button>
              <button onClick={() => genSingle(i)} disabled={pending || !hasN8n} style={{
                background: T.accentBg, border: `1px solid rgba(139,124,247,0.3)`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                color: T.accent, cursor: pending || !hasN8n ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: pending || !hasN8n ? 0.5 : 1,
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

          {isPagePending && !isPageDone && <Loader text={`Generating via n8n (${selectedModel})`} />}

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
