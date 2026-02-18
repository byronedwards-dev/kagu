"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import "./globals.css";
import { callClaude, CLAUDE_MODELS } from "@/lib/api";
import { storage } from "@/lib/storage";
import { T, STEPS, parseJSON, generatePageFormats, getThemeMode, setThemeMode, onThemeChange, initTheme } from "@/lib/constants";
import { loadRules, saveRules, assembleSystemPrompt, getChecklistForStep } from "@/lib/rules";
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
import BookPreview from "@/components/BookPreview";
import ExportView from "@/components/ExportView";
import SettingsModal from "@/components/SettingsModal";
import SessionsModal from "@/components/SessionsModal";
import ActiveRules from "@/components/ui/ActiveRules";

export default function App() {
  // ─── Theme ───
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    initTheme();
    setTheme(getThemeMode());
    return onThemeChange(m => setTheme(m));
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeMode(next);
    localStorage.setItem("kagu-theme", next);
  };

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

  // ─── Staleness ───
  const [outlineHash, setOutlineHash] = useState("");
  const [textOutlineHash, setTextOutlineHash] = useState("");
  const [textStale, setTextStale] = useState(false);
  const [promptsStale, setPromptsStale] = useState(false);

  // ─── Character consistency pass ───
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);

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

  const hasCompanion = brief.character_setup?.includes("companion") || false;
  const pageCount = parseInt(brief.page_count) || 22;
  const pageFormats = generatePageFormats(pageCount);

  const claudeModel = settings.claudeModel || "";

  const api = useCallback((msgs, stepName) => {
    const c = new AbortController();
    // Track all active controllers for parallel abort
    if (!abortRef.current || abortRef.current.signal?.aborted) abortRef.current = new Set();
    if (abortRef.current instanceof Set) abortRef.current.add(c);
    else abortRef.current = new Set([c]);
    const sysPrompt = assembleSystemPrompt(rules, stepName || step, { hasCompanion });
    return callClaude(msgs, sysPrompt, c.signal, claudeModel || undefined).finally(() => {
      if (abortRef.current instanceof Set) abortRef.current.delete(c);
    });
  }, [rules, step, hasCompanion, claudeModel]);

  const stopGen = () => {
    cancelledRef.current = true;
    if (abortRef.current instanceof Set) abortRef.current.forEach(c => c.abort());
    else if (abortRef.current) abortRef.current.abort();
    abortRef.current = new Set();
    setLoading(false);
  };

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
    brief, concepts, selConcept, chars, outline, text, prompts, images, step, done: [...done], dirtyPages, rules,
    outlineHash, textOutlineHash, consistencyResult,
  }), [brief, concepts, selConcept, chars, outline, text, prompts, images, step, done, dirtyPages, rules, outlineHash, textOutlineHash, consistencyResult]);

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
    if (s.rules) setRules(s.rules);
    if (s.outlineHash) setOutlineHash(s.outlineHash);
    if (s.textOutlineHash) setTextOutlineHash(s.textOutlineHash);
    if (s.consistencyResult !== undefined) setConsistencyResult(s.consistencyResult);
    setTextStale(false); setPromptsStale(false);
  };

  const charNames = brief.character_names ? brief.character_names.split(/[,\s]+/).filter(Boolean) : [];

  // ─── New Book (auto-save current, then clear) ───
  const newBook = async () => {
    // Only auto-save if there's meaningful content (at least a concept or outline)
    const hasContent = selConcept || outline.length > 0 || text.length > 0;
    if (hasContent) {
      const label = selConcept?.title || brief.theme || "Untitled";
      const ts = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      const key = "session:" + `${label} (${ts})`.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60);
      try { await storage.set(key, JSON.stringify({ name: `${label} (${ts})`, ts: Date.now(), state: getState() })); } catch {}
    }
    // Clear all book data
    setBrief({}); setConcepts([]); setSelConcept(null); setChars("");
    setOutline([]); setText([]); setPrompts([]); setImages({}); setDirtyPages([]);
    setDone(new Set()); setStep("brief"); setConsistencyResult(null);
    setTextStale(false); setPromptsStale(false);
    setOutlineHash(""); setTextOutlineHash("");
    setErr(null); setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Duplicate Book (for variants) ───
  const duplicateBook = async () => {
    const hasContent = selConcept || outline.length > 0 || text.length > 0;
    if (!hasContent) return;
    // Save original
    const label = selConcept?.title || brief.theme || "Untitled";
    const ts = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const key = "session:" + `${label} (${ts})`.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60);
    try { await storage.set(key, JSON.stringify({ name: `${label} (${ts})`, ts: Date.now(), state: getState() })); } catch {}
    // Mark as variant — clear images so user regenerates after editing
    setImages({});
    setDirtyPages([]);
    setConsistencyResult(null);
    if (selConcept) setSelConcept(prev => ({ ...prev, title: (prev?.title || "") + " (Variant)" }));
    setStep("characters");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ═══════════════════════════════════════
     GENERATION FUNCTIONS
     ═══════════════════════════════════════ */

  const genConcepts = async (fb = "") => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("concepts");
    const hasCompanion = brief.character_setup?.includes("companion");
    const hasSecondChar = brief.character_setup?.includes("Two") || brief.character_setup?.includes("adult") || hasCompanion;
    const jsonKeys = hasCompanion
      ? `"title", "premise", "structure" (ONLY "arc"/"pattern"/"hybrid"), "companion_role", "key_moments"`
      : hasSecondChar
        ? `"title", "premise", "structure" (ONLY "arc"/"pattern"/"hybrid"), "second_character_role", "key_moments"`
        : `"title", "premise", "structure" (ONLY "arc"/"pattern"/"hybrid"), "key_moments"`;
    const charNote = !hasSecondChar ? `\nIMPORTANT: The story has ONE main character only — no companion, no sidekick, no friend. The child is the sole character.` : "";
    try {
      const r = await api([{ role: "user", content: `Creative brief:\n${briefStr()}${fb ? `\n\nFEEDBACK:\n${fb}` : ""}${charNote}\n\nGenerate exactly 4 storyline concepts.\nONLY raw JSON array of 4 objects. Keys: ${jsonKeys}.\nFor "key_moments": use bullet-point format with "- " prefix per line (e.g., "- Big splash in the puddle\\n- Discovers a frog").` }], "concepts");
      setConcepts(parseJSON(r)); mark("brief");
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const pickConcept = async (concept) => {
    // Strip companion/role keys if setup doesn't need them
    const cleanConcept = { ...concept };
    const setup = brief.character_setup || "";
    const hasCompanion = setup.includes("companion");
    const hasTwoChildren = setup.includes("Two");
    const hasAdult = setup.includes("adult");
    if (!hasCompanion && !hasTwoChildren && !hasAdult) {
      delete cleanConcept.companion_role;
      delete cleanConcept.second_character_role;
    }
    setSelConcept(cleanConcept); setErr(null); setLoading(true); cancelledRef.current = false; go("characters"); mark("concepts");

    const trait = brief.character_trait ? ` Personality trait: ${brief.character_trait} — this should come through in body language and emotional baseline.` : "";
    let charInstructions = `Child: describe 1-2 yrs YOUNGER than actual. Basic clothes. Include: height/build, skin tone, hair, eye color, simple proportional face (eye color + expression only — faces are swapped in post, don't over-detail), exact clothing with specific colors, body language, emotional baseline.${trait}`;

    if (hasCompanion) {
      const details = brief.sidekick_details ? ` Use these specifics: ${brief.sidekick_details}.` : "";
      charInstructions += `\n\nCompanion: exact breed+age+weight, fur details, max 2 accessories with exact placement, size relative to child.${details}`;
    } else if (hasTwoChildren) {
      charInstructions += `\n\nSecond child: same level of detail as the first — height/build, skin tone, hair, eye color, simple proportional face (eye color + expression only), clothing, body language, emotional baseline. Describe 1-2 yrs YOUNGER than actual.`;
    } else if (hasAdult) {
      charInstructions += `\n\nAdult (coach/parent/mentor): height/build, skin tone, hair, face details, clothing with specific colors, body language, relationship to child.`;
    }
    // "One main character" — no additional character instructions

    const soloNote = !hasCompanion && !hasTwoChildren && !hasAdult
      ? `\nIMPORTANT: This story has ONE main character only. Do NOT create any companion, sidekick, friend, or secondary character. The child is the sole character.\n`
      : "";

    try {
      const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCONCEPT:\n${JSON.stringify(cleanConcept)}\n${soloNote}\nCreate HIGHLY detailed character descriptions (pasted verbatim into every image prompt).\n\n${charInstructions}\n\nParagraph form, one block per character.` }], "characters");
      setChars(r);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const aiEditChars = async (inst) => {
    setErr(null); setLoading(true);
    try {
      const r = await api([{ role: "user", content: `Current:\n\n${chars}\n\nAdjust: ${inst}\n\nReturn full updated block.` }], "characters");
      setChars(r); setDirtyPages(Array.from({ length: pageCount }, (_, i) => i));
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  // Re-inject updated character descriptions into existing prompts (lightweight AI swap)
  const reinjectChars = async () => {
    if (!prompts.length || !chars.trim()) return;
    setErr(null); setLoading(true); cancelledRef.current = false;
    const BATCH = 6;
    const batches = [];
    for (let b = 0; b < prompts.length; b += BATCH) batches.push({ start: b, end: Math.min(b + BATCH, prompts.length) });
    try {
      const results = await Promise.all(batches.map(({ start, end }) => {
        const batch = prompts.slice(start, end);
        const batchText = batch.map((p, i) => `[Page ${start + i + 1}]\n${p.prompt}`).join("\n\n---\n\n");
        return api([{ role: "user", content: `NEW CHARACTER DESCRIPTIONS:\n${chars}\n\nEXISTING PROMPTS:\n${batchText}\n\nReplace ALL character description sections in each prompt with the NEW descriptions above. Keep everything else IDENTICAL — same scene, composition, camera angle, lighting, format, aspect ratio. Only swap the character appearance details.\n\nReturn ONLY raw JSON array of ${batch.length} objects: [{"page_number": N, "format": "...", "prompt": "..."}]` }], "prompts");
      }));
      if (!cancelledRef.current) {
        setPrompts(results.flatMap(r => parseJSON(r)));
        setDirtyPages(Array.from({ length: prompts.length }, (_, i) => i));
      }
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const genOutline = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("outline"); mark("characters");
    setOutline([]);
    const all = [];
    const density = brief.text_density || "";
    const densityNote = density ? `\nText density: ${density}. Adjust number of image-only pages accordingly.` : "";
    const fmts = generatePageFormats(pageCount);

    // Build page list string from dynamic formats
    const buildPageList = (slice) => slice.map(f => {
      let label = `- ${f.index + 1}: ${f.name} (${f.format})`;
      if (f.index === 0) label += " — cover scene only, NO story text, image_only: true";
      if (f.name === "Closing") label += " — this IS part of the story, emotional resolution";
      if (f.name === "Back Cover") label += " — warm closing image";
      return label;
    }).join("\n");

    // Split into 1 or 2 batches
    const mid = pageCount <= 14 ? pageCount : Math.ceil(pageCount / 2);
    const batch1Fmts = fmts.slice(0, mid);
    const batch2Fmts = fmts.slice(mid);

    try {
      const r1 = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCONCEPT:\n${JSON.stringify(selConcept)}\nCHARACTERS:\n${chars}\n\nOutline for images 1-${mid} of ${pageCount}:\n${buildPageList(batch1Fmts)}\n\nPACING: Pages 1-2 are setup/intro only. Main action MUST begin by page 3-4. Story climax should resolve at least 2 pages before the end. Keep resolution brief (1-2 pages max, no extended endings).\n\nSTORY DIRECTION: Each page description MUST state its narrative purpose (setup, escalation, complication, climax, resolution). The direction of the story should be clear from reading the outline alone.\n\nEach = ONE drawable scene. Include setting transitions. Mark image-only pages based on density.${densityNote}\nONLY raw JSON array of ${mid} objects: "page_number","format","title_short","setting","description","next_setting","image_only".` }], "outline");
      if (cancelledRef.current) return; all.push(...parseJSON(r1)); setOutline([...all]);

      if (batch2Fmts.length > 0) {
        const r2 = await api([{ role: "user", content: `First ${mid}:\n${JSON.stringify(all)}\n\nNow images ${mid + 1}-${pageCount}:\n${buildPageList(batch2Fmts)}\n\nPACING: Story climax should resolve by page ${pageCount - 2} at latest. Pages ${pageCount - 1}-${pageCount} are resolution/closing ONLY — keep it brief (1-2 pages). No extended endings, no "what I learned" monologues, no dream sequences.\n\nMore image-only pages as needed for the text density setting.${densityNote}\nONLY raw JSON array of ${batch2Fmts.length} objects. Same keys.` }], "outline");
        if (cancelledRef.current) return; all.push(...parseJSON(r2)); setOutline([...all]);
      }
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

  const deleteOutlinePage = (idx) => {
    const fmts = generatePageFormats(outline.length);
    const fixedNames = ["Cover", "Inside Left", "Inside Right", "Closing", "Back Cover"];
    if (fixedNames.includes(fmts[idx]?.name)) return;
    setOutline(prev => {
      const arr = prev.filter((_, i) => i !== idx);
      const newFmts = generatePageFormats(arr.length);
      setBrief(b => ({ ...b, page_count: String(arr.length) }));
      return arr.map((p, i) => ({ ...p, page_number: i + 1, format: newFmts[i]?.format || p.format }));
    });
    setText(prev => prev.length > 0 ? prev.filter((_, i) => i !== idx) : prev);
    setPrompts(prev => prev.length > 0 ? prev.filter((_, i) => i !== idx) : prev);
    setImages(prev => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const shifted = {};
      for (const [k, v] of Object.entries(prev)) {
        const i = Number(k);
        if (i < idx) shifted[i] = v;
        else if (i > idx) shifted[i - 1] = v;
        // i === idx is dropped
      }
      return shifted;
    });
    setTextStale(true); setPromptsStale(true);
  };

  const addOutlinePage = () => {
    let insertIdx;
    setOutline(prev => {
      const arr = [...prev];
      insertIdx = arr.length - 2; // before Closing
      arr.splice(insertIdx, 0, {
        page_number: insertIdx + 1,
        format: "spread",
        title_short: "New Page",
        setting: "",
        description: "",
        next_setting: "",
        image_only: false,
      });
      const newFmts = generatePageFormats(arr.length);
      setBrief(b => ({ ...b, page_count: String(arr.length) }));
      return arr.map((p, i) => ({ ...p, page_number: i + 1, format: newFmts[i]?.format || p.format }));
    });
    // Insert blank entries at the same position in downstream arrays
    setText(prev => {
      if (prev.length === 0) return prev;
      const arr = [...prev];
      arr.splice(insertIdx, 0, { page_number: insertIdx + 1, text: "", scene_description: "", image_only: false });
      return arr;
    });
    setPrompts(prev => {
      if (prev.length === 0) return prev;
      const arr = [...prev];
      arr.splice(insertIdx, 0, { page_number: insertIdx + 1, image_prompt: "" });
      return arr;
    });
    setImages(prev => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      // Shift all images at insertIdx+ up by one
      const shifted = {};
      for (const [k, v] of Object.entries(prev)) {
        const idx = Number(k);
        shifted[idx >= insertIdx ? idx + 1 : idx] = v;
      }
      return shifted;
    });
    setTextStale(true); setPromptsStale(true);
  };

  const genText = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("text"); mark("outline");
    setText([]);
    const all = [];
    const h = outline.map(p => p.description || "").join("|");
    try {
      for (let b = 0; b < outline.length; b += 3) {
        if (cancelledRef.current) break;
        const batch = outline.slice(b, b + 3);
        const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCHARACTERS:\n${chars}\nOUTLINE:\n${JSON.stringify(outline)}\n${all.length ? `TEXT SO FAR:\n${JSON.stringify(all)}\n` : ""}\nWrite text for ONLY images ${b + 1}-${Math.min(b + 3, outline.length)}:\n${JSON.stringify(batch)}\n\nIMPORTANT: Page 1 (Cover) is title only — no story text, return as image_only: true. Story text begins on page 2.\n\nMax 4 lines/page, 8-10 syl/line, ${brief.language_style || "rhyming"}, never rhyme with names.\nONLY raw JSON array of ${batch.length}: "page_number","text","image_only".` }], "text");
        if (cancelledRef.current) break; all.push(...parseJSON(r)); setText([...all]);
      }
      if (!cancelledRef.current) { setTextOutlineHash(h); setTextStale(false); setPromptsStale(false); }
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

  const manualPrompt = (i, text) => {
    setPrompts(p => p.map((x, j) => j === i ? { ...x, prompt: text } : x));
    setDirtyPages(p => p.includes(i) ? p : [...p, i]);
  };

  const genPrompts = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("prompts"); mark("text");
    setPrompts([]); setConsistencyResult(null);
    const BATCH = 6; // pages per batch
    const style = brief.illustration_style || "IMAX, ultra hyper film still, cinematic";
    const stylePrefix = `Children's book illustration, ${style}. `;
    const batches = [];
    for (let b = 0; b < outline.length; b += BATCH) {
      batches.push({ start: b, end: Math.min(b + BATCH, outline.length) });
    }
    try {
      // Fire all batches in parallel
      const results = await Promise.all(batches.map(({ start, end }) => {
        const bo = outline.slice(start, end), bt = text.slice(start, end);
        const combined = bo.map((p, i) => ({ ...p, story_text: bt[i]?.text }));
        return api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCHARACTERS (verbatim every prompt):\n${chars}\nSTYLE: ${style}\n\nPrompts for:\n${JSON.stringify(combined)}\n\nDo NOT include art style keywords at the start of prompts — a style prefix will be added automatically.\nEach: page#/ratio, ONE scene, full chars redescribed, spreads="one panoramic image" (NEVER left/right/center/seam), chars SMALL in wide scene, facial expressions, nothing in center.\nONLY raw JSON array of ${bo.length}: "page_number","format","prompt".` }], "prompts");
      }));
      if (!cancelledRef.current) {
        // Prepend identical style prefix to every prompt
        const all = results.flatMap(r => parseJSON(r)).map(p => ({
          ...p, prompt: p.prompt?.startsWith(stylePrefix) ? p.prompt : stylePrefix + p.prompt,
        }));
        setPrompts(all);
        setPromptsStale(false); setDirtyPages([]);
      }
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLoading(false);
  };

  const editPrompt = async (i, inst) => {
    setErr(null); setLidx(i);
    const style = brief.illustration_style || "IMAX, ultra hyper film still, cinematic";
    const stylePrefix = `Children's book illustration, ${style}. `;
    try {
      const combined = { ...outline[i], story_text: text[i]?.text };
      const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCHARACTERS (verbatim every prompt):\n${chars}\nSTYLE: ${style}\nSCENE+TEXT:\n${JSON.stringify(combined)}\n\nCurrent prompt:\n${JSON.stringify(prompts[i])}\n\nChange: "${inst}"\nDo NOT include art style keywords at the start — a style prefix is added automatically.\nEach: page#/ratio, ONE scene, full chars redescribed, spreads="one panoramic image" (NEVER left/right/center/seam), chars SMALL in wide scene, facial expressions, nothing in center.\nONLY raw JSON: page_number,format,prompt.` }], "prompts");
      const parsed = parseJSON(r);
      const fixed = { ...parsed, prompt: parsed.prompt?.startsWith(stylePrefix) ? parsed.prompt : stylePrefix + parsed.prompt };
      setPrompts(p => p.map((x, j) => j === i ? fixed : x));
      setDirtyPages(p => p.includes(i) ? p : [...p, i]);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLidx(null);
  };

  const regenOnePrompt = async (i) => {
    setErr(null); setLidx(i);
    const style = brief.illustration_style || "IMAX, ultra hyper film still, cinematic";
    const stylePrefix = `Children's book illustration, ${style}. `;
    try {
      const combined = { ...outline[i], story_text: text[i]?.text };
      const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCHARACTERS (verbatim every prompt):\n${chars}\nSTYLE: ${style}\n\nGenerate prompt for:\n${JSON.stringify(combined)}\n\nDo NOT include art style keywords at the start — a style prefix is added automatically.\nEach: page#/ratio, ONE scene, full chars redescribed, spreads="one panoramic image" (NEVER left/right/center/seam), chars SMALL in wide scene, facial expressions, nothing in center.\nONLY raw JSON: page_number,format,prompt.` }], "prompts");
      const parsed = parseJSON(r);
      const fixed = { ...parsed, prompt: parsed.prompt?.startsWith(stylePrefix) ? parsed.prompt : stylePrefix + parsed.prompt };
      setPrompts(p => p.map((x, j) => j === i ? fixed : x));
      setDirtyPages(p => p.includes(i) ? p : [...p, i]);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setLidx(null);
  };

  /* ═══════════════════════════════════════
     CHARACTER CONSISTENCY PASS
     ═══════════════════════════════════════ */

  const runConsistencyPass = async () => {
    setConsistencyLoading(true); setErr(null);
    try {
      const promptsText = prompts.map((p, i) => `Page ${i + 1}:\n${p.prompt}`).join("\n\n");
      const r = await api([{ role: "user", content: `MAIN CHARACTERS:\n${chars}\n\nIMAGE PROMPTS:\n${promptsText}\n\nAnalyze these image prompts for SECONDARY characters (not the main characters described above) that appear on 2+ pages. For each recurring secondary character:\n1. Pick the RICHEST description as canonical\n2. Show every page where they appear and what changed\n3. Return corrected prompts with harmonized descriptions\n\nONLY raw JSON:\n{\n  "characters": [\n    { "name": "string", "pages": [1,3,5], "canonical": "the richest description chosen", "changes": ["Page 3: was X, now Y"] }\n  ],\n  "corrected_prompts": [ { "page_number": 1, "prompt": "..." }, ... ]\n}` }], "prompts");
      const parsed = parseJSON(r);
      if (parsed.characters && parsed.characters.length > 0) {
        setConsistencyResult({ characters: parsed.characters, pendingPrompts: parsed.corrected_prompts, appliedAt: null });
      } else {
        setConsistencyResult({ characters: [], pendingPrompts: null, appliedAt: null });
      }
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); }
    setConsistencyLoading(false);
  };

  const applyConsistencyPass = () => {
    if (!consistencyResult?.pendingPrompts) return;
    setPrompts(consistencyResult.pendingPrompts.map(p => ({ page_number: p.page_number, prompt: p.prompt })));
    setConsistencyResult(prev => ({ ...prev, appliedAt: Date.now(), pendingPrompts: null }));
    setDirtyPages(Array.from({ length: pageCount }, (_, i) => i));
  };

  const discardConsistencyPass = () => { setConsistencyResult(null); };

  /* ═══════════════════════════════════════
     VIEW ROUTER
     ═══════════════════════════════════════ */
  const activeRulesEl = <ActiveRules step={step} rules={rules} hasCompanion={hasCompanion} onRulesChange={setRules} />;

  const view = () => {
    switch (step) {
      case "brief":
        return <BriefForm brief={brief} set={setBrief} onSubmit={() => genConcepts("")} loading={loading} />;
      case "concepts":
        return <ConceptCards concepts={concepts} loading={loading} onSelect={pickConcept} onRegen={genConcepts} characterSetup={brief.character_setup} />;
      case "characters":
        return <CharEditor content={chars} loading={loading} onManual={setChars} onAI={aiEditChars}
          onGenOutline={genOutline} onViewOutline={outline.length ? () => go("outline") : null}
          onReinject={prompts.length > 0 ? reinjectChars : null} brief={brief} activeRules={activeRulesEl} />;
      case "outline":
        return <OutlineCards outline={outline} loading={loading} lidx={lidx} onAI={aiEditOutline} onSave={manualOutline}
          onRegenOutline={genOutline} text={text} onGenText={genText} onViewText={() => go("text")}
          onDelete={deleteOutlinePage} onAddPage={addOutlinePage}
          qualityChecklist={getChecklistForStep("outline", rules.qualityChecklist, hasCompanion)} briefStr={briefStr()} pageFormats={pageFormats} brief={brief} setBrief={setBrief} activeRules={activeRulesEl} />;
      case "text":
        return <TextCards text={text} outline={outline} loading={loading} lidx={lidx} onAI={aiEditText} onSave={manualText}
          onSaveScene={manualOutline} onRegenOutline={genOutline} textStale={textStale} prompts={prompts} onGenPrompts={genPrompts} onViewPrompts={() => go("prompts")}
          onRegenText={genText} charNames={charNames}
          qualityChecklist={getChecklistForStep("text", rules.qualityChecklist, hasCompanion)} briefStr={briefStr()} pageFormats={pageFormats} brief={brief} setBrief={setBrief} activeRules={activeRulesEl} />;
      case "prompts":
        return <PromptCards prompts={prompts} loading={loading} lidx={lidx} onAI={editPrompt} onRegenOne={regenOnePrompt}
          onSave={manualPrompt} promptsStale={promptsStale} onGenPrompts={genPrompts}
          onGoImages={() => { mark("prompts"); go("images"); }}
          bannedWords={rules.bannedWords} chars={chars}
          qualityChecklist={getChecklistForStep("prompts", rules.qualityChecklist, hasCompanion)} briefStr={briefStr()} pageFormats={pageFormats} brief={brief} setBrief={setBrief} activeRules={activeRulesEl}
          consistencyResult={consistencyResult} consistencyLoading={consistencyLoading}
          onRunConsistency={runConsistencyPass} onApplyConsistency={applyConsistencyPass} onDiscardConsistency={discardConsistencyPass} />;
      case "images":
        return <div>
          <ImagesStep prompts={prompts} images={images} setImages={setImages} outline={outline}
            dirtyPages={dirtyPages} settings={settings} pageFormats={pageFormats} />
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn onClick={() => { mark("images"); go("preview"); }}>Preview Book →</Btn>
            <Btn ghost onClick={() => go("prompts")}>← Back to Prompts</Btn>
          </div>
        </div>;
      case "preview":
        return <div>
          <BookPreview outline={outline} text={text} images={images} pageFormats={pageFormats} />
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn onClick={() => { mark("preview"); go("export"); }}>Go to Export →</Btn>
            <Btn ghost onClick={() => go("images")}>← Back to Images</Btn>
          </div>
        </div>;
      case "export":
        return <ExportView pageFormats={pageFormats}
          data={{ brief, characters: chars, selectedConcept: selConcept, outline, storyText: text, imagePrompts: prompts, images }} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        rules={rules} onRulesChange={setRules} settings={settings} onSettingsChange={setSettings} />
      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} getState={getState} loadState={loadStateData} />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 80px" }}>
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KaguLogo size={72} />
            <p style={{ fontSize: 13, color: T.textDim, margin: 0, letterSpacing: .5 }}>Book Builder</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={newBook} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: T.textDim, fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>+ New Book</button>
            {(selConcept || outline.length > 0) && <button onClick={duplicateBook} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: T.textDim, fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>⎘ Duplicate</button>}
            <button onClick={() => setSessionsOpen(true)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: T.textDim, fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>📚 Templates</button>
            <button onClick={() => setSettingsOpen(true)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: T.textDim, fontFamily: "inherit" }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>⚙ Settings</button>
            <button onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 15, cursor: "pointer", color: T.textDim, fontFamily: "inherit", lineHeight: 1 }}
              onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>{theme === "dark" ? "☀" : "🌙"}</button>
          </div>
        </div>

        <NavSteps steps={STEPS} current={step} done={done} onNav={go} />
        {!["images", "preview", "export"].includes(step) && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: loading || err ? 0 : 16, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>AI Model:</span>
            {CLAUDE_MODELS.map(m => (
              <button key={m.id} onClick={() => setSettings(s => ({ ...s, claudeModel: m.id }))}
                style={{
                  background: (claudeModel || CLAUDE_MODELS[0].id) === m.id ? T.accent + "22" : "transparent",
                  border: `1px solid ${(claudeModel || CLAUDE_MODELS[0].id) === m.id ? T.accent : T.border}`,
                  borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer",
                  color: (claudeModel || CLAUDE_MODELS[0].id) === m.id ? T.accent : T.textDim,
                  fontFamily: "inherit", fontWeight: (claudeModel || CLAUDE_MODELS[0].id) === m.id ? 600 : 400,
                }}
                title={m.description}
              >{m.label}</button>
            ))}
          </div>
          {loading && <Btn danger ghost small onClick={stopGen}>■ Stop</Btn>}
        </div>}
        {err && <ErrBox msg={err} onDismiss={() => setErr(null)} />}
        {view()}
      </div>
    </div>
  );
}
