"use client";
import { useState } from "react";
import { T } from "@/lib/constants";
import Btn from "./Btn";
import Inp from "./Inp";

export default function AIBar({ onSubmit, placeholder = "Describe what to change..." }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}
    onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>✎ Edit with AI</button>;
  const go = () => { if (v.trim()) { onSubmit(v); setV(""); setOpen(false); } };
  return <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
    <Inp value={v} onChange={setV} placeholder={placeholder} autoFocus onKeyDown={e => e.key === "Enter" && go()} style={{ flex: 1 }} />
    <Btn onClick={go} disabled={!v.trim()} small>Apply</Btn>
    <Btn ghost small onClick={() => { setOpen(false); setV(""); }}>✕</Btn>
  </div>;
}
