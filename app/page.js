"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import "./globals.css";
import { callClaude } from "@/lib/api";
import { storage, saveState as saveStateSnapshot, listStates } from "@/lib/storage";
import { T, STEPS, parseJSON } from "@/lib/constants";
import { loadRules, saveRules, assembleSystemPrompt } from "@/lib/rules";
import KaguLogo from "@/components/ui/KaguLogo";
import NavSteps from "@/components/ui/NavSteps";
import Btn from "@/components/ui/Btn";
import ErrBox from "@/components/ui/ErrBox";
import BriefForm from "@/components/BriefForm";
import ConceptCards from "@/components/ConceptCards";
import CharEditor from "@/components/CharEditor";
import OutlineCards from "@/components/OutlineCards";
import TextCards from "@/components/TextCards";
import PromptCards from "@/components/PromptCards";
import ImagesStep from "@/components/ImagesStep";
import ExportView from "@/components/ExportView";
import SettingsModal from "@/components/SettingsModal";
import SessionsModal from "@/components/SessionsModal";

export default function App() {
  // ─── Core state ───
  const [step, setStep] = useState("brief");
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [lidx, setLidx] = useState(null);

  // ─── Modals ───
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  // ─── Rules (living knowledge base) ───
  const [rules, setRules] = useState(loadRules);
  useEffect(() => { saveRules(rules); }, [rules]);

  // ─── Settings (connections) ───
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("kagu-settings") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem("kagu-settings", JSON.stringify(settings)); } catch {}
  }, [settings]);

  // ─── Book data ───
  const [brief, setBrief] = useState({});
  const [concepts, setConcepts] = useState([]);
  const [selConcept, setSelConcept] = useState(null);
  const [chars, setChars] = useState("");
  const [outline, setOutline] = useState([]);
  const [text, setText] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [images, setImages] = useState({});
  const [dirtyPages, setDirtyPages] = useState([]);
  const [savedStates, setSavedStates] = useState([]);

  // ─── Staleness ───
  const [outlineHash, setOutlineHash] = useState("");
  const [textOutlineHash, setTextOutlineHash] = useState("");
  const [textStale, setTextStale] = useState(false);
  const [promptsStale, setPromptsStale] = useState(false);

  const abortRef = useRef(null);
  const cancelledRef = useRef(false);

  // ─── Helpers ───
  const mark = id => setDone(p => new Set([...p, id]));
  const go = id => { setStep(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const briefStr = () => {
    const b = { ...brief };
    if (b.direction === "Other") b.direction = b.direction_other || "Other";
    if (b.moral === "Other") b.moral = b.moral_other || "Other";
    return Object.entries(b).filter(([k, v]) => v?.trim() && !k.endsWith("_other")).map(([k, v]) => `${k}: ${v}`).join("\n");
  };

  const api = useCallback((msgs, stepName) => {
    const c = new AbortController();
    abortRef.current = c;
    const sysPrompt = assembleSystemPrompt(rules, stepName || step);
    return callClaude(msgs, sysPrompt, c.signal);
  }, [rules, step]);

  const stopGen = () => { cancelledRef.current = true; if (abortRef.current) abortRef.current.abort(); setLoading(false); };

  // ─── Outline staleness ───
  useEffect(() => {
    if (outline.length) {
      const h = outline.map(p => p.description || "").join("|");
      setOutlineHash(h);
      if (textOutlineHash && h !== textOutlineHash) setTextStale(true);
    }
  }, [outline, textOutlineHash]);

  // ─── Auto-save ───
  const getState = useCallback(() => ({
    brief, concepts, selConcept, chars, outline, text, prompts, images, step, done: [...done], dirtyPages,
  }), [brief, concepts, selConcept, chars, outline, text, prompts, images, step, done, dirtyPages]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try { await storage.set("autosave", JSON.stringify({ ts: Date.now(), state: getState() })); } catch {}
    }, 2000);
    return () => clearTimeout(t);
  }, [getState]);

  // ─── Auto-load ───
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return; mounted.current = true;
    (async () => {
      try {
        const r = await storage.get("autosave");
        if (r) { const d = JSON.parse(r.value); if (d.state) loadStateData(d.state); }
      } catch {}
      try { const states = await listStates(); setSavedStates(states); } catch {}
    })();
  }, []);

  const loadStateData = (s) => {
    if (s.brief) setBrief(s.brief);
    if (s.concepts) setConcepts(s.concepts);
    if (s.selConcept !== undefined) setSelConcept(s.selConcept);
    if (s.chars !== undefined) setChars(s.chars);
    if (s.outline) setOutline(s.outline);
    if (s.text) setText(s.text);
    if (s.prompts) setPrompts(s.prompts);
    if (s.images) setImages(s.images);
    if (s.step) setStep(s.step);
    if (s.done) setDone(new Set(s.done));
    if (s.dirtyPages) setDirtyPages(s.dirtyPages);
    setTextStale(false); setPromptsStale(false);
  };

  // ─── State management ───
  const handleSaveState = async (label) => {
    const snapshot = await saveStateSnapshot(getState(), label);
    setSavedStates(p => [{ state_id: snapshot.state_id, label: snapshot.label, created_at: snapshot.created_at }, ...p]);
  };
  const handleLoadState = async (stateId) => {
    const { loadState } = await import("@/lib/storage");
    const snapshot = await loadState(stateId);
    if (snapshot?.state) loadStateData(snapshot.state);
  };
  const handleForkState = async (stateId) => {
    const { loadState } = await import("@/lib/storage");
    const snapshot = await loadState(stateId);
    if (snapshot?.state) {
      loadStateData(snapshot.state);
      setDirtyPages(Array.from({ length: 22 }, (_, i) => i));
    }
  };

  const charNames = brief.character_names ? brief.character_names.split(/[,\s]+/).filter(Boolean) : [];

  /* ═══════════════════════════════════════
     GENERATION FUNCTIONS
     ═══════════════════════════════════════ */

  const genConcepts = async (fb = "") => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("concepts");
    try {
      const r = await api([{ role: "user", content: `Creative brief:\n${briefStr()}${fb ? `\n\nFEEDBACK:\n${fb}` : ""}\n\nGenerate exactly 4 storyline concepts.\nONLY raw JSON array of 4 objects. Keys: "title", "premise", "structure" (ONLY "arc"/"pattern"/"hybrid"), "companion_role", "key_moments".` }], "concepts");
      setConcepts(parseJSON(r)); mark("brief");
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const pickConcept = async (concept) => {
    setSelConcept(concept); setErr(null); setLoading(true); cancelledRef.current = false; go("characters"); mark("concepts");
    try {
      const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCONCEPT:\n${JSON.stringify(concept)}\n\nCreate HIGHLY detailed character descriptions (pasted verbatim into every image prompt).\n\nChild: describe 1-2 yrs YOUNGER than actual. Basic clothes. Include: height/build, skin tone, hair, eye color/shape, face details (nose, cheeks, lips, dimples/freckles), exact clothing with specific colors, body language, emotional baseline.\n\nCompanion: exact breed+age+weight, fur details, max 2 accessories with exact placement, size relative to child.\n\nParagraph form, one block per character.` }], "characters");
      setChars(r);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const aiEditChars = async (inst) => {
    setErr(null); setLoading(true);
    try {
      const r = await api([{ role: "user", content: `Current:\n\n${chars}\n\nAdjust: ${inst}\n\nReturn full updated block.` }], "characters");
      setChars(r); setDirtyPages(Array.from({ length: 22 }, (_, i) => i));
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const genOutline = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("outline"); mark("characters");
    const all = [];
    try {
      const r1 = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCONCEPT:\n${JSON.stringify(selConcept)}\nCHARACTERS:\n${chars}\n\nOutline for images 1-11 of 22:\n- 1: Cover (square)\n- 2: Inside left (square)\n- 3: Inside right (square)\n- 4-11: Spreads 1-8 (1:2)\n\nEach = ONE drawable scene. Include setting transitions. Mark 2-3 image-only.\nONLY raw JSON array of 11 objects: "page_number","format","title_short","setting","description","next_setting","image_only".` }], "outline");
      if (cancelledRef.current) return; all.push(...parseJSON(r1)); setOutline([...all]);
      const r2 = await api([{ role: "user", content: `First 11:\n${JSON.stringify(all)}\n\nNow images 12-22:\n- 12-20: Spreads 9-17 (1:2)\n- 21: Closing page (square) — this IS part of the story, emotional resolution\n- 22: Back cover (square) — warm closing image\n\n2-3 more image-only. Story resolves by 20-21.\nONLY raw JSON array of 11 objects. Same keys.` }], "outline");
      if (cancelledRef.current) return; all.push(...parseJSON(r2)); setOutline([...all]);
      setTextStale(false); setPromptsStale(false);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const aiEditOutline = async (i, inst) => {
    setErr(null); setLidx(i);
    try {
      const r = await api([{ role: "user", content: `Page:\n${JSON.stringify(outline[i])}\nPrev: ${i > 0 ? JSON.stringify(outline[i - 1]) : "none"}\nNext: ${i < outline.length - 1 ? JSON.stringify(outline[i + 1]) : "none"}\n\nChange: "${inst}"\nONLY raw JSON: page_number,format,title_short,setting,description,next_setting,image_only.` }], "outline");
      setOutline(p => p.map((x, j) => j === i ? parseJSON(r) : x));
      setDirtyPages(p => p.includes(i) ? p : [...p, i]);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLidx(null);
  };

  const manualOutline = (i, d) => {
    setOutline(p => p.map((x, j) => j === i ? { ...x, description: d } : x));
    setDirtyPages(p => p.includes(i) ? p : [...p, i]);
  };

  const genText = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("text"); mark("outline");
    const all = [];
    const h = outline.map(p => p.description || "").join("|");
    try {
      for (let b = 0; b < outline.length; b += 3) {
        if (cancelledRef.current) break;
        const batch = outline.slice(b, b + 3);
        const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCHARACTERS:\n${chars}\nOUTLINE:\n${JSON.stringify(outline)}\n${all.length ? `TEXT SO FAR:\n${JSON.stringify(all)}\n` : ""}\nWrite text for ONLY images ${b + 1}-${Math.min(b + 3, outline.length)}:\n${JSON.stringify(batch)}\n\nMax 4 lines/page, 8-10 syl/line, ${brief.language_style || "rhyming"}, never rhyme with names.\nONLY raw JSON array of ${batch.length}: "page_number","text","image_only".` }], "text");
        if (cancelledRef.current) break; all.push(...parseJSON(r)); setText([...all]);
      }
      setTextOutlineHash(h); setTextStale(false); setPromptsStale(false);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const aiEditText = async (i, inst) => {
    setErr(null); setLidx(i);
    try {
      const r = await api([{ role: "user", content: `Page:\n${JSON.stringify(text[i])}\nBefore: ${i > 0 ? text[i - 1]?.text : "none"}\nAfter: ${i < text.length - 1 ? text[i + 1]?.text : "none"}\n\nChange: "${inst}"\nMax 4 lines, 8-10 syl, ${brief.language_style || "rhyming"}, no name rhymes.\nONLY raw JSON: page_number,text,image_only.` }], "text");
      setText(p => p.map((x, j) => j === i ? parseJSON(r) : x)); setPromptsStale(true);
      setDirtyPages(p => p.includes(i) ? p : [...p, i]);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLidx(null);
  };

  const manualText = (i, t) => {
    setText(p => p.map((x, j) => j === i ? { ...x, text: t } : x)); setPromptsStale(true);
    setDirtyPages(p => p.includes(i) ? p : [...p, i]);
  };

  const genPrompts = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("prompts"); mark("text");
    const all = [];
    try {
      for (let b = 0; b < outline.length; b += 3) {
        if (cancelledRef.current) break;
        const bo = outline.slice(b, b + 3), bt = text.slice(b, b + 3);
        const combined = bo.map((p, i) => ({ ...p, story_text: bt[i]?.text }));
        const r = await api([{ role: "user", content: `CHARACTERS (verbatim every prompt):\n${chars}\nSTYLE: ${brief.illustration_style || "IMAX, ultra hyper film still, cinematic"}\n\nPrompts for:\n${JSON.stringify(combined)}\n\nEach: page#/style/ratio, ONE scene, full chars redescribed, spreads="one panoramic image" (NEVER left/right/center/seam), chars SMALL in wide scene, facial expressions, nothing in center.\nONLY raw JSON array of ${bo.length}: "page_number","format","prompt".` }], "prompts");
        if (cancelledRef.current) break; all.push(...parseJSON(r)); setPrompts([...all]);
      }
      setPromptsStale(false); setDirtyPages([]);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const editPrompt = async (i, inst) => {
    setErr(null); setLidx(i);
    try {
      const r = await api([{ role: "user", content: `CHARACTERS:\n${chars}\n\nCurrent:\n${JSON.stringify(prompts[i])}\n\nChange: "${inst}"\nKeep all rules. ONLY raw JSON: page_number,format,prompt.` }], "prompts");
      setPrompts(p => p.map((x, j) => j === i ? parseJSON(r) : x));
      setDirtyPages(p => p.includes(i) ? p : [...p, i]);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLidx(null);
  };

  /* ═══════════════════════════════════════
     VIEW ROUTER
     ═══════════════════════════════════════ */
  const view = () => {
    switch (step) {
      case "brief":
        return <BriefForm brief={brief} set={setBrief} onSubmit={() => genConcepts("")} loading={loading} />;
      case "concepts":
        return <ConceptCards concepts={concepts} loading={loading} onSelect={pickConcept} onRegen={genConcepts} />;
      case "characters":
        return <CharEditor content={chars} loading={loading} onManual={setChars} onAI={aiEditChars}
          onNext={outline.length ? () => go("outline") : genOutline} nextLabel={outline.length ? "View Outline →" : "Generate Outline →"} />;
      case "outline":
        return <OutlineCards outline={outline} loading={loading} lidx={lidx} onAI={aiEditOutline} onSave={manualOutline}
          text={text} onGenText={genText} onViewText={() => go("text")} />;
      case "text":
        return <TextCards text={text} outline={outline} loading={loading} lidx={lidx} onAI={aiEditText} onSave={manualText}
          textStale={textStale} prompts={prompts} onGenPrompts={genPrompts} onViewPrompts={() => go("prompts")}
          onRegenText={genText} charNames={charNames} />;
      case "prompts":
        return <PromptCards prompts={prompts} loading={loading} lidx={lidx} onAI={editPrompt}
          promptsStale={promptsStale} onGenPrompts={genPrompts}
          onGoImages={() => { mark("prompts"); go("images"); }}
          bannedWords={rules.bannedWords} chars={chars} />;
      case "images":
        return <div>
          <ImagesStep prompts={prompts} images={images} setImages={setImages} outline={outline}
            dirtyPages={dirtyPages} settings={settings}
            onSaveState={handleSaveState} onLoadState={handleLoadState} onForkState={handleForkState}
            states={savedStates} />
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn onClick={() => { mark("images"); go("export"); }}>Go to Export →</Btn>
            <Btn ghost onClick={() => go("prompts")}>← Back to Prompts</Btn>
          </div>
        </div>;
      case "export":
        return <ExportView
          data={{ brief, characters: chars, selectedConcept: selConcept, outline, storyText: text, imagePrompts: prompts, images }}
          qualityChecklist={rules.qualityChecklist} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        rules={rules} onRulesChange={setRules} settings={settings} onSettingsChange={setSettings} />
      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} getState={getState} loadState={loadStateData} />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 80px" }}>
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <KaguLogo size={44} />
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}>Kagu Kids</h1>
              <p style={{ fontSize: 12, color: T.textDim, margin: "2px 0 0", letterSpacing: .5 }}>Book Builder</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setSessionsOpen(true)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: T.textDim, fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>📚 Sessions</button>
            <button onClick={() => setSettingsOpen(true)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: T.textDim, fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>⚙ Settings</button>
          </div>
        </div>

        <NavSteps steps={STEPS} current={step} done={done} onNav={go} />
        {loading && <div style={{ marginBottom: 16 }}><Btn danger ghost small onClick={stopGen}>■ Stop Generation</Btn></div>}
        {err && <ErrBox msg={err} onDismiss={() => setErr(null)} />}
        {view()}
      </div>
    </div>
  );
}
