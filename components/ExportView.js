"use client";
import { useState } from "react";
import { T, imgName, imgFmt } from "@/lib/constants";
import Btn from "./ui/Btn";

export default function ExportView({ data, pageFormats }) {
  const [copied, setCopied] = useState(null);
  const copy = (k, t) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 2000); };

  const storyText = data.storyText?.map((p, i) => `--- ${i + 1}. ${imgName(i, pageFormats)} ---\n${p.text || "(image only)"}`).join("\n\n") || "";
  const promptsText = data.imagePrompts?.map((p, i) => `--- ${i + 1}. ${imgName(i, pageFormats)} ---\n${p.prompt}`).join("\n\n") || "";
  const outlineText = data.outline?.map((p, i) => `${i + 1}. ${imgName(i, pageFormats)} [${imgFmt(i, pageFormats)}] — ${p.description}`).join("\n") || "";

  // Build list of starred (selected) images — one per page
  const images = data.images || {};
  const starredImages = [];
  const totalPages = data.imagePrompts?.length || data.outline?.length || 0;
  for (let i = 0; i < totalPages; i++) {
    const pageImgs = images[i] || [];
    const starred = pageImgs.find(img => img.selected);
    starredImages.push({ pageIdx: i, image: starred || null });
  }
  const starredCount = starredImages.filter(s => s.image).length;

  const downloadImage = (url, pageIdx, model) => {
    const a = document.createElement("a");
    a.href = url;
    const pageName = data.outline?.[pageIdx]?.title_short || `page-${pageIdx + 1}`;
    const slug = pageName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `${slug}-${model || "image"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllStarred = () => {
    starredImages.forEach(({ pageIdx, image }) => {
      if (image) downloadImage(image.url, pageIdx, image.model);
    });
  };

  const secs = [
    { k: "chars", l: "Character Descriptions", d: data.characters },
    { k: "outline", l: "Outline", d: outlineText },
    { k: "text", l: "Story Text", d: storyText },
    { k: "prompts", l: "Image Prompts", d: promptsText },
    { k: "json", l: "Full JSON (portable backup)", d: JSON.stringify(data, null, 2) },
  ];

  // Export everything as a single downloadable file
  const exportAll = () => {
    const title = data.selectedConcept?.title || data.brief?.theme || "Untitled Book";
    const divider = "\u2550".repeat(60);

    const content = [
      `${title}`,
      `Exported: ${new Date().toLocaleString()}`,
      "",
      divider,
      "CHARACTER DESCRIPTIONS",
      divider,
      data.characters || "(none)",
      "",
      divider,
      "OUTLINE",
      divider,
      outlineText || "(none)",
      "",
      divider,
      "STORY TEXT",
      divider,
      storyText || "(none)",
      "",
      divider,
      "IMAGE PROMPTS",
      divider,
      promptsText || "(none)",
      "",
      divider,
      "BRIEF",
      divider,
      Object.entries(data.brief || {}).filter(([k, v]) => v?.trim?.()).map(([k, v]) => `${k}: ${v}`).join("\n"),
      "",
      divider,
      "FULL JSON",
      divider,
      JSON.stringify(data, null, 2),
    ].join("\n");

    const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-export.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Export</h2>
      <Btn small onClick={exportAll}>Export All</Btn>
    </div>

    {/* Selected images */}
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
          Selected Images ({starredCount}/{totalPages} pages)
        </span>
        {starredCount > 0 && <Btn ghost small onClick={downloadAllStarred}>Download All</Btn>}
      </div>
      {starredCount === 0 ? (
        <p style={{ fontSize: 12, color: T.textDim, margin: 0 }}>
          No images starred yet. Go to Images and click the star on your preferred image for each page.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {starredImages.map(({ pageIdx, image }) => (
            <div key={pageIdx} style={{
              border: `1px solid ${image ? T.accent : T.border}`,
              borderRadius: 8, overflow: "hidden",
              opacity: image ? 1 : 0.4,
            }}>
              {image ? (
                <img
                  src={image.url}
                  alt={imgName(pageIdx, pageFormats)}
                  onClick={() => downloadImage(image.url, pageIdx, image.model)}
                  style={{ width: "100%", aspectRatio: imgFmt(pageIdx, pageFormats) === "spread" ? "2/1" : "1/1", objectFit: "cover", cursor: "pointer", display: "block" }}
                />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textDim }}>
                  No star
                </div>
              )}
              <div style={{ padding: "4px 6px", fontSize: 11, color: T.textDim, textAlign: "center" }}>
                {imgName(pageIdx, pageFormats)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div style={{ display: "grid", gap: 10 }}>
      {secs.map(s => <div key={s.k} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{s.l}</span>
          <Btn ghost small onClick={() => copy(s.k, s.d)} style={copied === s.k ? { background: T.accentBg } : {}}>{copied === s.k ? "Copied" : "Copy"}</Btn>
        </div>
        <pre style={{ fontSize: 12, color: T.textDim, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>{(s.d || "").slice(0, 500)}{(s.d || "").length > 500 ? "\n\u2026" : ""}</pre>
      </div>)}
    </div>
  </div>;
}
