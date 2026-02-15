"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/constants";

export default function Loader({ text = "Generating" }) {
  const [d, setD] = useState("");
  useEffect(() => { const i = setInterval(() => setD(p => p.length >= 3 ? "" : p + "."), 350); return () => clearInterval(i); }, []);
  return <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: T.accent }}>
    <div style={{ width: 16, height: 16, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "sp .7s linear infinite" }} />
    <span style={{ fontSize: 13, fontFamily: "monospace" }}>{text}{d}</span>
  </div>;
}
