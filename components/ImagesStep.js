"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T, imgFmt } from "@/lib/constants";
import { IMAGE_MODELS, MODEL_TIERS } from "@/lib/api";
import Btn from "./ui/Btn";
import Pill from "./ui/Pill";
import Loader from "./ui/Loader";
import PageHdr from "./ui/PageHdr";
import ErrBox from "./ui/ErrBox";

export default function ImagesStep({ prompts, images, setImages, outline, dirtyPages, settings }) {
  const [selectedModels, setSelectedModels] = useState(new Set([settings?.defaultModel || "flux-2-pro"]));
  const [genErr, setGenErr] = useState(null);
  const [copied, setCopied] = useState(null);
  const [pending, setPending] = useState(false);
  const [pendingPages, setPendingPages] = useState(null);
  const [progress, setProgress] = useState(null); // { completed, total }
  const [jobId, setJobId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { url, pageIdx, imgIdx }
  const pollRef = useRef(null);

  const toggleModel = (id) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one selected
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyPrompt = (idx) => {
    navigator.clipboard.writeText(prompts[idx]?.prompt || "");
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  // Build pages payload for n8n — one entry per page per model
  const buildPagesPayload = (pageIndices) => {
    const base = pageIndices.map(idx => ({
      page_index: idx,
      page_name: outline?.[idx]?.title_short || `Page ${idx + 1}`,
      format: imgFmt(idx),
      aspect_ratio: imgFmt(idx) === "spread" ? "1:2" : "1:1",
      image_prompt: prompts[idx]?.prompt || "",
    })).filter(p => p.image_prompt);

    // Duplicate each page for each selected model
    const models = [...selectedModels];
    if (models.length <= 1) {
      // Single model — add image_model to each page
      return base.map(p => ({ ...p, image_model: models[0] }));
    }
    // Multi-model — duplicate pages
    const pages = [];
    for (const page of base) {
      for (const model of models) {
        pages.push({ ...page, image_model: model });
      }
    }
    return pages;
  };

  // Poll for results from n8n-results endpoint
  const startPolling = useCallback((jid, expectedTotal) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const pollStartTime = Date.now();
    const POLL_TIMEOUT = 10 * 60 * 1000; // 10 minute timeout for multi-model

    const stopPoll = (errMsg) => {
      clearInterval(pollRef.current);
      pollRef.current = null;
      setPending(false);
      setPendingPages(null);
      setProgress(null);
      setJobId(null);
      if (errMsg) setGenErr(errMsg);
    };

    pollRef.current = setInterval(async () => {
      // Timeout check
      if (Date.now() - pollStartTime > POLL_TIMEOUT) {
        stopPoll("Generation timed out after 10 minutes. Check your n8n workflow for errors.");
        return;
      }

      try {
        const res = await fetch(`/api/n8n-results?job_id=${jid}`);
        const data = await res.json();
        console.log(`[poll] job=${jid} status=${data.status} completed=${data.completedPages} total=${data.totalPages} resultKeys=${Object.keys(data.results || {})} error=${data.error || "none"}`);

        if (data.error && res.status === 404) {
          stopPoll("Job not found — it may have expired. Try generating again.");
          return;
        }

        // Update progress
        setProgress({ completed: data.completedPages || 0, total: data.totalPages || expectedTotal });

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
                  next[idx] = [...next[idx], { url: v.url, model: v.model || "unknown", ts: Date.now(), selected: false }];
                }
              }
            }
            return next;
          });
        }

        // Check if done or errored
        if (data.status === "done") {
          stopPoll(null);
        } else if (data.status === "error") {
          stopPoll(data.error || "n8n job failed");
        }
      } catch (e) {
        // Network error — keep polling, don't give up
        console.warn("Poll error:", e.message);
      }
    }, 3000); // Poll every 3 seconds
  }, [setImages]);

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
    if (selectedModels.size === 0) {
      setGenErr("Select at least one model.");
      return;
    }

    const pages = buildPagesPayload(pageIndices);
    const totalExpected = pages.length; // pages × models

    setGenErr(null);
    setPending(true);
    setPendingPages(pageIndices);
    setProgress({ completed: 0, total: totalExpected });

    try {
      const res = await fetch("/api/n8n-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: pages.length === 1 ? "single" : "batch",
          webhook_url: settings.n8nWebhookUrl,
          book: { image_models: [...selectedModels] },
          pages,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Got job_id — start polling
      console.log(`[generate] Got job_id=${data.job_id}, ${totalExpected} items (${pageIndices.length} pages × ${selectedModels.size} models)`);
      setJobId(data.job_id);
      startPolling(data.job_id, totalExpected);
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

  const downloadImage = (url, pageIdx, model) => {
    const a = document.createElement("a");
    a.href = url;
    const pageName = outline?.[pageIdx]?.title_short || `page-${pageIdx + 1}`;
    const slug = pageName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `${slug}-${model || "image"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalImages = Object.values(images).reduce((s, a) => s + a.length, 0);
  const hasN8n = !!settings?.n8nWebhookUrl;
  const pct = progress ? Math.round(progress.completed / progress.total * 100) : 0;
  const modelCount = selectedModels.size;
  const modelLabel = modelCount === 1 ? [...selectedModels][0] : `${modelCount} models`;

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Generation</h2>
        <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>
          {totalImages} image{totalImages !== 1 ? "s" : ""} generated
          {dirtyPages?.length > 0 && ` · ${dirtyPages.length} page${dirtyPages.length !== 1 ? "s" : ""} need re-generation`}
          {hasN8n ? " · n8n connected" : " · n8n not configured"}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
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
    </div>

    {!hasN8n && <div style={{ marginBottom: 12, fontSize: 12, color: T.amber, fontWeight: 600 }}>
      Set your n8n webhook URL in Settings → Connections to enable image generation.
    </div>}

    {/* Progress bar */}
    {pending && progress && <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSoft, marginBottom: 4 }}>
        <span>
          {progress.completed === 0
            ? `Sending ${progress.total} item${progress.total !== 1 ? "s" : ""} to n8n (${modelLabel})...`
            : `${progress.completed} of ${progress.total} complete (${modelLabel})`}
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

    {/* Model selector — multi-select */}
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: .5 }}>Models</div>
        <span style={{ fontSize: 11, color: T.textDim }}>{modelCount} selected · click to toggle</span>
      </div>
      {MODEL_TIERS.map(tier => {
        const models = IMAGE_MODELS.filter(m => m.tier === tier.id);
        if (!models.length) return null;
        return <div key={tier.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{tier.label}</span>
            <span style={{ fontSize: 11, color: T.textDim }}>{tier.description}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {models.map(m => {
              const active = selectedModels.has(m.id);
              return <button key={m.id} onClick={() => toggleModel(m.id)} style={{
                background: active ? T.accentBg : "transparent",
                border: `1px solid ${active ? T.accent : T.border}`,
                borderRadius: 10, padding: "10px 12px", textAlign: "left", cursor: "pointer", transition: "all .15s",
                position: "relative",
              }}>
                {active && <div style={{
                  position: "absolute", top: 6, right: 8, fontSize: 10, color: T.accent, fontWeight: 700,
                }}>✓</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? T.accent : T.text }}>{m.name}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{m.provider} · {m.cost}</div>
                <div style={{ fontSize: 11, color: T.textSoft, marginTop: 2 }}>{m.best_for}</div>
              </button>;
            })}
          </div>
        </div>;
      })}
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
          borderRadius: 10, padding: 14, overflow: "hidden",
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

          {isPagePending && !isPageDone && <Loader text={`Generating via n8n (${modelLabel})`} />}

          {/* Image gallery */}
          {pageImages.length > 0 && (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingTop: 4, paddingBottom: 4, marginLeft: -14, marginRight: -14, paddingLeft: 14, paddingRight: 14 }}>
              {pageImages.map((img, j) => (
                <div key={j} style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={img.url}
                    alt={`Page ${i + 1} variant ${j + 1}`}
                    onClick={() => setLightbox({ url: img.url, pageIdx: i, imgIdx: j })}
                    style={{
                      width: imgFmt(i) === "spread" ? 480 : 280,
                      height: 280,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: img.selected ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                      cursor: "pointer",
                    }}
                  />
                  <div style={{
                    position: "absolute", bottom: 6, left: 6,
                    background: "rgba(0,0,0,.7)", borderRadius: 4, padding: "2px 8px",
                    fontSize: 11, color: T.textSoft,
                  }}>{img.model}</div>
                  <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
                    <button onClick={() => downloadImage(img.url, i, img.model)} style={{
                      background: "rgba(0,0,0,.7)", border: "none", borderRadius: 4,
                      padding: "3px 8px", fontSize: 11, color: T.textDim, cursor: "pointer",
                    }} title="Download">⬇</button>
                    <button onClick={() => selectImage(i, j)} style={{
                      background: img.selected ? T.accent : "rgba(0,0,0,.7)", border: "none", borderRadius: 4,
                      padding: "3px 8px", fontSize: 11, color: img.selected ? "#fff" : T.textDim, cursor: "pointer",
                    }}>{img.selected ? "★" : "☆"}</button>
                    <button onClick={() => removeImage(i, j)} style={{
                      background: "rgba(0,0,0,.7)", border: "none", borderRadius: 4,
                      padding: "3px 8px", fontSize: 13, color: T.textDim, cursor: "pointer",
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>;
      })}
    </div>

    {/* Lightbox modal */}
    {lightbox && (
      <div
        onClick={() => setLightbox(null)}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "zoom-out",
        }}
      >
        <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
          <img
            src={lightbox.url}
            alt="Full size preview"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              objectFit: "contain", borderRadius: 12,
              boxShadow: "0 8px 40px rgba(0,0,0,.5)",
            }}
          />
          <div style={{ position: "absolute", top: -12, right: -12, display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                const img = images[lightbox.pageIdx]?.[lightbox.imgIdx];
                if (img) downloadImage(img.url, lightbox.pageIdx, img.model);
              }}
              style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: "50%",
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: T.text, cursor: "pointer", fontFamily: "inherit",
              }}
              title="Download"
            >⬇</button>
            <button
              onClick={() => setLightbox(null)}
              style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: "50%",
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: T.text, cursor: "pointer", fontFamily: "inherit",
              }}
            >✕</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
