"use client";
import { useState, useRef, useEffect } from "react";
import { T } from "@/lib/constants";

export default function InlinePillEditor({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const display = value || `Set ${label}...`;

  return <div ref={ref} style={{ display: "inline-block", position: "relative" }}>
    <button onClick={() => setOpen(!open)} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: value ? T.accentBg : "rgba(138,132,152,0.08)",
      border: `1px solid ${value ? "rgba(139,124,247,0.3)" : T.border}`,
      borderRadius: 100, padding: "4px 12px 4px 10px",
      fontSize: 12, fontWeight: 600, color: value ? T.accent : T.textDim,
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .5, opacity: .7 }}>{label}:</span>
      <span>{display}</span>
      <span style={{ fontSize: 9, opacity: .6 }}>▼</span>
    </button>
    {open && <div style={{
      position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 220, maxHeight: 260, overflowY: "auto",
    }}>
      {options.map(opt => <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
        display: "block", width: "100%", textAlign: "left",
        background: opt === value ? T.accentBg : "transparent",
        border: "none", padding: "8px 14px", fontSize: 13,
        color: opt === value ? T.accent : T.text,
        cursor: "pointer", fontFamily: "inherit",
      }}
        onMouseEnter={e => { if (opt !== value) e.target.style.background = T.cardHover; }}
        onMouseLeave={e => { if (opt !== value) e.target.style.background = "transparent"; }}
      >{opt}</button>)}
    </div>}
  </div>;
}
