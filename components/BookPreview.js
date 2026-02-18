"use client";
import { T, imgName, imgFmt, pageNum } from "@/lib/constants";

export default function BookPreview({ outline, text, images, pageFormats }) {
  const totalPages = outline?.length || text?.length || 0;

  // For each page, pick the starred image or the first available
  const getImage = (idx) => {
    const pageImgs = images?.[idx] || [];
    return pageImgs.find(img => img.selected) || pageImgs[0] || null;
  };

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Book Preview</h2>
    <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 20px" }}>
      Review your book page-by-page. Starred images shown; falls back to first variant if none starred.
    </p>

    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from({ length: totalPages }, (_, i) => {
        const img = getImage(i);
        const isSpread = imgFmt(i, pageFormats) === "spread";
        const storyContent = text?.[i]?.text || "";
        const pageName = imgName(i, pageFormats);
        const pNum = pageNum(i, pageFormats);

        return <div key={i} style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {/* Page header */}
          <div style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{pageName}</span>
            {pNum && <span style={{ fontSize: 11, color: T.textDim }}>{pNum}</span>}
            <span style={{ fontSize: 11, color: T.textDim, marginLeft: "auto" }}>
              {isSpread ? "Spread" : "Square"}
              {img ? ` · ${img.model}` : " · no image"}
            </span>
          </div>

          {/* Content area */}
          <div style={{
            display: "flex",
            flexDirection: isSpread ? "column" : "row",
            gap: 0,
          }}>
            {/* Image */}
            <div style={{
              flex: isSpread ? "none" : "0 0 50%",
              background: T.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: isSpread ? 200 : 240,
            }}>
              {img ? (
                <img
                  src={img.url}
                  alt={pageName}
                  style={{
                    width: "100%",
                    maxHeight: isSpread ? 320 : 300,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{
                  padding: 24,
                  fontSize: 12, color: T.textDim, textAlign: "center",
                }}>
                  No image generated
                </div>
              )}
            </div>

            {/* Story text */}
            <div style={{
              flex: 1,
              padding: 16,
              display: "flex", flexDirection: "column", justifyContent: "center",
              minHeight: isSpread ? "auto" : 240,
            }}>
              {storyContent ? (
                <p style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: T.text,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}>{storyContent}</p>
              ) : (
                <p style={{ fontSize: 12, color: T.textDim, margin: 0, fontStyle: "italic" }}>
                  (image only — no text)
                </p>
              )}
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
