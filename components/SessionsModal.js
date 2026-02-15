"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/constants";
import { storage } from "@/lib/storage";
import Btn from "./ui/Btn";
import Inp from "./ui/Inp";
import Loader from "./ui/Loader";

export default function SessionsModal({ open, onClose, getState, loadState }) {
  const [saves, setSaves] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    (async () => {
      try {
        const r = await storage.list("session:");
        const items = [];
        for (const k of (r?.keys || [])) {
          try { const v = await storage.get(k); if (v) items.push({ key: k, ...JSON.parse(v.value) }); } catch {}
        }
        items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        setSaves(items);
      } catch { setSaves([]); }
      setBusy(false);
    })();
  }, [open]);

  const save = async () => {
    if (!name.trim()) return;
    const key = "session:" + name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60);
    const payload = { name: name.trim(), ts: Date.now(), state: getState() };
    try {
      await storage.set(key, JSON.stringify(payload));
      setSaves(p => [{ key, ...payload }, ...p.filter(s => s.key !== key)]);
      setName("");
    } catch (e) { alert("Save failed: " + e.message); }
  };

  const del = async (key) => {
    try { await storage.delete(key); setSaves(p => p.filter(s => s.key !== key)); } catch {}
  };

  if (!open) return null;
  return <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)" }} />
    <div style={{ position: "relative", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, width: "90%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>📚 Sessions</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Inp value={name} onChange={setName} placeholder="Name this session..." onKeyDown={e => e.key === "Enter" && save()} style={{ flex: 1 }} />
        <Btn onClick={save} disabled={!name.trim()} small>Save Current</Btn>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {busy ? <Loader text="Loading" /> : saves.length === 0
          ? <p style={{ fontSize: 13, color: T.textDim, textAlign: "center", padding: 20 }}>No saved sessions</p>
          : saves.map(s => <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 6, background: T.card }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{s.name}</div>
              <div style={{ fontSize: 11, color: T.textDim }}>{s.ts ? new Date(s.ts).toLocaleString() : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn small onClick={() => { loadState(s.state); onClose(); }}>Load</Btn>
              <button onClick={() => del(s.key)} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 14 }}>🗑</button>
            </div>
          </div>)
        }
      </div>
      <p style={{ fontSize: 11, color: T.textDim, margin: "12px 0 0" }}>Sessions auto-save every few seconds. Use "Full JSON" in Export as a portable backup.</p>
    </div>
  </div>;
}
