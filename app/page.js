"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { callClaude, generateImage, IMAGE_MODELS, storage } from "@/lib/api";

/* ═══════════════════════════════════════
   COMPREHENSIVE SYSTEM PROMPT (matches MD v2)
   ═══════════════════════════════════════ */
const DEFAULT_SYSTEM_PROMPT = `You are a children's picture book author and art director for personalized illustrated storybooks.

═══ BOOK STRUCTURE — 22 Images ═══
1. Cover (square 1:1, 4K, 300dpi)
2. Inside left page (square 1:1, 4K, 300dpi)
3. Inside right page (square 1:1, 4K, 300dpi)
4–20. Spreads 1–17 (landscape 1:2, 8K, 300dpi)
21. Closing page (square 1:1, 4K, 300dpi) — this IS part of the story (emotional resolution)
22. Back cover (square 1:1, 4K, 300dpi) — warm closing image, typically no text

Total: 5 square + 17 spread. At least 5 image-only pages for pacing.
Each page = ONE drawable scene (not multiple sequential actions).
Nothing important in the center of spread pages (that's the fold line).

═══ CHARACTER DESCRIPTION RULES ═══
Child character:
- ALWAYS describe age 1-2 years YOUNGER than actual — image gen models make kids look older. If child is 4, say "2-3 year old toddler." This is critical.
- Face: describe explicitly (eye shape, expression, nose, cheeks, lips, dimples/freckles)
- Clothing: very basic, simple colors, no logos, no complex patterns, no accessories
- Normal human-proportioned faces for better AI face recognition
- Specify: hair length/style/color, skin tone, body build

Companion/sidekick:
- Exact breed + age + weight (e.g., "5-month-old Golden Retriever puppy, ~12 lbs")
- Max 2 accessories — define exact body placement and colors
- Size relative to child, fur/skin coloring, distinguishing marks
- Keep color descriptions concise (image prompt budget is ~2,000 words)

═══ WRITING RULES ═══
Word count by age:
- Toddlers (2-4): ~150–250 words total
- Preschool (3-7): ~250–350 words total
- Early readers (5-9): ~300–400 words total

Hard rules:
- NEVER rhyme with character names (names are personalized per child — rhyming breaks when swapped)
- Max 4 lines of text per page
- 8-10 syllables per line (for rhythm consistency)
- Language matches the youngest reader in the target range
- No slang, sarcasm, or complex metaphors
- Vocabulary: concrete and visual
- Emotional beats clear even without reading the text

Pattern-specific rules (if structural pattern):
- Vary delivery: explicit early, then implied as familiarity grows
- Rhythm: 2-3 content pages → 1 break page (humor/reaction/quiet moment)
- Pattern should feel present but not monotonous
- Break pages interrupt pattern for surprise and breathing room

Companion character rules (if applicable):
- At least 3 distinct personality moments across the book
- At least 1 failed mimicry or funny misunderstanding
- Companion reactions can carry image-only pages
- Companion should have a mini-arc or running gag
- Companion appears on EVERY page

═══ IMAGE PROMPT RULES ═══
Every prompt must follow this structure:
[PAGE #]. [ART STYLE KEYWORDS], [ASPECT RATIO].
[SCENE — one continuous moment, characters small within expansive environment]
[FULL CHARACTER DESCRIPTIONS — repeated from scratch every time]
[FACIAL EXPRESSION & EMOTION — explicit]
[CAMERA/FRAMING: wide shot, characters integrated into environment]

Art style keywords (pick one, reuse exactly):
- Standard: "Photorealistic, cinematic, wide angle shot"
- Premium: "IMAX, ultra hyper film still, cinematic"
- Custom: define once and reuse

Character rules for prompts:
- ALWAYS redescribe ALL characters from scratch in EVERY prompt — copy the full block
- NEVER reference previous pages or images — each prompt is fully self-contained
- When using a name, ALWAYS follow with full description (the image model has no memory)

Face & body rules (for personalization tech):
- Prefer 3/4 views and full-face shots; limit pure profiles
- Maximum profile: 90% — beyond that, face-swap technology fails
- Faces must be unobstructed (no hands covering, hair blocking, extreme shadows)
- Body proportions consistent across ALL pages — height relationships CANNOT be fixed in post
- Describe facial expression explicitly in every prompt
- Avoid extreme foreshortening on faces
- Keep lighting consistent within scenes

Character framing & scene composition:
- Characters SMALL within wider scenes — NOT close-up, NOT zoomed in, NOT portrait-style
- Make character part of the scene, not front-and-center
- Think "wide shot showing the world with the character in it"
- Environment should feel expansive; character exists WITHIN it

Spread page composition:
- Describe as "one panoramic image"
- Say: "One continuous scene across the full frame. The middle area is a continuation of the surrounding environment with no key elements."
- Nothing important in the center (fold line)

═══ BANNED WORDS/PHRASES IN IMAGE PROMPTS ═══
NEVER use these — they cause specific model failures:
- "seam" → causes model to cut image in half. Use "continuous scene"
- "left side" / "right side" / "center" → breaks into quadrants. Use "one panoramic image"
- "like the previous page" → model has no memory. Use full description from scratch
- Character name alone (e.g., just "Max") → not enough info. Use full character block
- "close-up" / "zoomed in" / "portrait" → characters too large, need repositioning. Use "wide shot" / "characters small within the scene"

Content safety: Nothing violent, scary, or intense. All imagery warm, positive, age-appropriate.

═══ JSON OUTPUT ═══
When asked for JSON, respond with ONLY raw JSON. No markdown code fences, no backticks, no preamble, no explanation.`;

/* ─── JSON parser ─── */
function parseJSON(text) {
  let c = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(c); } catch {}
  for (const [o, cl] of [["[", "]"], ["{", "}"]]) {
    const s = c.indexOf(o); if (s < 0) continue;
    let d = 0;
    for (let i = s; i < c.length; i++) {
      if (c[i] === o) d++; if (c[i] === cl) d--;
      if (d === 0) { try { return JSON.parse(c.slice(s, i + 1)); } catch { break; } }
    }
  }
  throw new Error("JSON parse failed");
}

/* ─── Page helpers ─── */
function imgName(i) {
  if (i === 0) return "Cover";
  if (i === 1) return "Inside Left";
  if (i === 2) return "Inside Right";
  if (i >= 3 && i <= 19) return `Spread ${i - 2}`;
  if (i === 20) return "Closing";
  if (i === 21) return "Back Cover";
  return `Image ${i + 1}`;
}
function pageNum(i) {
  if (i === 0 || i === 21) return null;
  if (i === 1) return "p. 1";
  if (i === 2) return "p. 2";
  if (i >= 3 && i <= 19) { const s = (i - 3) * 2 + 3; return `p. ${s}–${s + 1}`; }
  if (i === 20) return "p. 37";
  return null;
}
function imgFmt(i) { return (i <= 2 || i >= 20) ? "square" : "spread"; }

/* ─── Theme ─── */
const T = {
  bg: "#111114", card: "#1A1A1F", cardHover: "#1F1F26",
  border: "#2D2D35", borderFocus: "#8B7CF7",
  text: "#F0EEF2", textSoft: "#CCC7D5", textDim: "#8A8498",
  accent: "#8B7CF7", accentBg: "rgba(139,124,247,0.12)",
  green: "#4ADE80", amber: "#FBBF24", red: "#F87171",
};

function KaguLogo({ size = 42 }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <ellipse cx="48" cy="60" rx="20" ry="16" fill={T.accent} opacity=".85" />
    <circle cx="54" cy="36" r="11" fill={T.accent} />
    <circle cx="58" cy="34" r="3.5" fill="#1A1A1F" /><circle cx="59" cy="33.2" r="1.2" fill="#fff" />
    <path d="M65 35L82 31L65 38Z" fill="#FBBF24" />
    <path d="M47 27Q40 6 46 2" stroke="#9D90FF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M50 26Q48 4 56 0" stroke={T.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M53 27Q56 8 64 6" stroke="#7C6DF7" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M55 29Q62 14 68 14" stroke="#B8ADFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M28 56Q14 46 10 34" stroke="#9D90FF" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M28 60Q12 52 6 42" stroke={T.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="40" y1="74" x2="36" y2="90" stroke={T.textSoft} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="54" y1="74" x2="58" y2="90" stroke={T.textSoft} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M30 90L36 90L40 87" stroke={T.textSoft} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M54 87L58 90L64 90" stroke={T.textSoft} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>;
}

/* ─── Atoms ─── */
function Loader({ text = "Generating" }) {
  const [d, setD] = useState("");
  useEffect(() => { const i = setInterval(() => setD(p => p.length >= 3 ? "" : p + "."), 350); return () => clearInterval(i); }, []);
  return <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: T.accent }}>
    <div style={{ width: 16, height: 16, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "sp .7s linear infinite" }} />
    <span style={{ fontSize: 13, fontFamily: "monospace" }}>{text}{d}</span>
    <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
  </div>;
}
function Pill({ children, color }) {
  return <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", color: color || T.textDim, background: T.bg, padding: "2px 8px", borderRadius: 100, border: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{children}</span>;
}
function Btn({ children, onClick, disabled, ghost, small, danger, style: s }) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding: small ? "6px 14px" : "11px 22px", borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600,
    border: ghost ? `1px solid ${danger ? "rgba(248,113,113,.4)" : T.border}` : "none",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s",
    background: danger ? "rgba(248,113,113,.12)" : ghost ? "transparent" : T.accent,
    color: danger ? T.red : ghost ? T.accent : "#fff",
    opacity: disabled ? .4 : 1, fontFamily: "inherit", ...s,
  }}>{children}</button>;
}
function Field({ label, children, note }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, letterSpacing: .3 }}>{label}</label>
    {children}{note && <span style={{ fontSize: 11, color: T.textDim, fontStyle: "italic" }}>{note}</span>}
  </div>;
}
function Sel({ value, onChange, options, placeholder = "Choose..." }) {
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: value ? T.text : T.textDim, width: "100%", outline: "none", fontFamily: "inherit", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238A8498' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
  }}><option value="">{placeholder}</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}
function Inp({ value, onChange, placeholder, onKeyDown, autoFocus, style: s }) {
  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.text, width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box", ...s }}
    onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border} />;
}
function Txt({ value, onChange, rows = 4, placeholder, style: s }) {
  return <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: T.text, width: "100%", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.65, boxSizing: "border-box", ...s }}
    onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border} />;
}
function AIBar({ onSubmit, placeholder = "Describe what to change..." }) {
  const [open, setOpen] = useState(false); const [v, setV] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}
    onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.textDim}>✎ Edit with AI</button>;
  const go = () => { if (v.trim()) { onSubmit(v); setV(""); setOpen(false); } };
  return <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
    <Inp value={v} onChange={setV} placeholder={placeholder} autoFocus onKeyDown={e => e.key === "Enter" && go()} style={{ flex: 1 }} />
    <Btn onClick={go} disabled={!v.trim()} small>Apply</Btn>
    <Btn ghost small onClick={() => { setOpen(false); setV(""); }}>✕</Btn>
  </div>;
}
function ErrBox({ msg, onDismiss }) {
  return <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: 14, margin: "0 0 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
    <span style={{ fontSize: 13, color: T.red, lineHeight: 1.5, wordBreak: "break-word" }}>⚠ {msg}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>
  </div>;
}
function StaleWarning({ msg }) {
  return <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", margin: "0 0 16px", fontSize: 13, color: T.amber }}>⚠ {msg}</div>;
}
function PageHdr({ idx, titleShort }) {
  const pn = pageNum(idx);
  return <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
    <span style={{ fontSize: 14, fontWeight: 700, color: T.text, marginRight: 2 }}>{idx + 1}. {titleShort || imgName(idx)}</span>
    <Pill>{imgFmt(idx)}</Pill>
    {pn && <Pill color={T.accent}>{pn}</Pill>}
  </div>;
}
function NavSteps({ steps, current, done, onNav }) {
  return <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto", paddingBottom: 2 }}>
    {steps.map(s => {
      const cur = s.id === current, ok = done.has(s.id);
      return <button key={s.id} onClick={() => (cur || ok) && onNav(s.id)} style={{
        padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
        border: cur ? `1.5px solid ${T.accent}` : `1px solid ${ok ? "rgba(139,124,247,0.2)" : "transparent"}`,
        cursor: cur || ok ? "pointer" : "default", background: cur ? T.accentBg : "transparent",
        color: cur ? T.accent : ok ? T.textSoft : T.textDim, fontFamily: "inherit", whiteSpace: "nowrap",
      }}>{ok && !cur ? "✓ " : ""}{s.label}</button>;
    })}
  </div>;
}

/* ─── Settings modal ─── */
function SettingsModal({ prompt, onChange, open, onClose }) {
  if (!open) return null;
  return <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)" }} />
    <div style={{ position: "relative", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, width: "90%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>⚙ System Prompt</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 12px" }}>Sent on every AI call. Edit rules here to keep everything in sync.</p>
      <textarea value={prompt} onChange={e => onChange(e.target.value)} style={{
        flex: 1, minHeight: 300, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: 14, fontSize: 13, color: T.text, fontFamily: "monospace", lineHeight: 1.6,
        outline: "none", resize: "none", width: "100%", boxSizing: "border-box",
      }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Btn onClick={onClose}>Done</Btn>
        <Btn ghost onClick={() => onChange(DEFAULT_SYSTEM_PROMPT)}>Reset to Default</Btn>
      </div>
    </div>
  </div>;
}

/* ─── Sessions modal ─── */
function SessionsModal({ open, onClose, getState, loadState }) {
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

/* ═══════════════════════════════════════
   BRIEF
   ═══════════════════════════════════════ */
const MORALS = ["Perseverance", "Teamwork", "Confidence", "Curiosity", "Kindness", "Joy of play", "Bravery", "Gratitude", "Empathy", "Self-expression", "Patience", "Sharing", "Resilience", "Creativity", "Respect for nature", "Believing in yourself", "Trying new things", "Other"];
const THEMES = ["dinosaur adventure", "trip to the moon", "learning to ride a bike", "first day of school", "underwater ocean quest", "building a treehouse", "cooking with grandma", "superhero training", "jungle safari", "pirate treasure hunt", "visiting a farm", "snow day adventure", "learning to swim", "magical garden", "robot best friend", "camping in the woods", "puppy's first day home", "dance recital", "race car dreams", "exploring a cave", "soccer championship", "painting a masterpiece", "finding a lost star"];
const NB = ["Max", "Leo", "Milo", "Kai", "Ezra", "Noah", "Jax", "Finn"], NG = ["Luna", "Zoe", "Mia", "Ava", "Ivy", "Ruby", "Ella", "Nova"], NU = ["Alex", "Riley", "Charlie", "Quinn", "Sam", "Sky", "Remi"];
const SK = ["5-month-old Golden Retriever puppy, red bandana on neck", "tiny orange tabby kitten, blue bow on collar", "baby panda, green backpack on back", "baby penguin, yellow scarf around neck"];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

function BriefForm({ brief, set, onSubmit, loading }) {
  const s = (k, v) => set(p => ({ ...p, [k]: v }));
  const hp = brief.character_setup === "Child + companion (pet, creature)";
  const filled = ["age_range", "theme", "character_setup", "character_names", "character_age", "structure", "direction", "moral", "tone", "language_style", "illustration_style", "text_density"].filter(k => brief[k]?.trim()).length;
  const randomize = () => {
    const id = pick(["Boy", "Girl", "Unisex"]), nm = id === "Boy" ? NB : id === "Girl" ? NG : NU, su = pick(["One main character", "Child + companion (pet, creature)"]);
    set({ age_range: pick(["2–3 years", "4–6 years", "5–7 years"]), reader_identity: id, theme: pick(THEMES), character_setup: su, character_names: pick(nm), character_age: `${pick(["3", "4", "5"])} years old`, character_trait: pick(["curious", "playful", "shy but brave", "energetic", "imaginative"]), structure: pick(["Story with arc", "Structural pattern", "Hybrid"]), direction: pick(["Learning something new", "Overcoming a challenge", "Exploration / discovery", "Emotional growth"]), moral: pick(MORALS.filter(m => m !== "Other")), tone: pick(["Energetic and playful", "Warm and encouraging", "Funny / slightly silly", "Adventurous"]), language_style: pick(["Rhyming — AABB", "Rhyming — ABAB", "Rhyming — ABCB"]), illustration_style: pick(["IMAX Ultra Hyper Film Still (recommended)", "Photorealistic / Cinematic", "3D rendered / Pixar-style"]), text_density: pick(["Very light (8+ image-only)", "Standard (5-7 image-only)"]), companion_role: su.includes("companion") ? pick(["Comic relief", "Supportive sidekick", "Learning alongside"]) : "", sidekick_details: su.includes("companion") ? pick(SK) : "" });
  };
  return <div>
    <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Creative Brief</h2><p style={{ fontSize: 14, color: T.textSoft, margin: "6px 0 0" }}>Everything flows from these answers.</p></div>
      <button onClick={randomize} style={{ background: T.accentBg, border: `1px solid rgba(139,124,247,0.25)`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: "inherit" }}>🎲 Random Fill</button>
    </div>
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Age Range"><Sel value={brief.age_range} onChange={v => s("age_range", v)} options={["2–3 years", "4–6 years", "5–7 years", "7–9 years"]} /></Field>
        <Field label="Reader Identity"><Sel value={brief.reader_identity} onChange={v => s("reader_identity", v)} options={["Boy", "Girl", "Unisex"]} /></Field>
      </div>
      <Field label="Core Subject / Theme"><Inp value={brief.theme} onChange={v => s("theme", v)} placeholder="e.g., basketball, dinosaurs, space" /></Field>
      <Field label="Character Setup"><Sel value={brief.character_setup} onChange={v => s("character_setup", v)} options={["One main character", "Two children", "Child + adult (coach, parent, mentor)", "Child + companion (pet, creature)"]} /></Field>
      {hp && <div style={{ background: T.accentBg, border: `1px solid rgba(139,124,247,0.2)`, borderRadius: 10, padding: 16, display: "grid", gap: 12 }}>
        <Field label="Companion Role"><Sel value={brief.companion_role} onChange={v => s("companion_role", v)} options={["Comic relief", "Supportive sidekick", "Learning alongside", "Contrast character"]} /></Field>
        <Field label="Sidekick Details" note="Breed, age, max 2 accessories"><Inp value={brief.sidekick_details} onChange={v => s("sidekick_details", v)} placeholder="e.g., 5-month Golden Retriever, red bandana" /></Field>
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Name(s)"><Inp value={brief.character_names} onChange={v => s("character_names", v)} placeholder="Max" /></Field>
        <Field label="Age"><Inp value={brief.character_age} onChange={v => s("character_age", v)} placeholder="4 years old" /></Field>
        <Field label="Trait"><Inp value={brief.character_trait} onChange={v => s("character_trait", v)} placeholder="playful" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Structure"><Sel value={brief.structure} onChange={v => s("structure", v)} options={["Story with arc", "Structural pattern", "Hybrid"]} /></Field>
        <Field label="Direction"><Sel value={brief.direction} onChange={v => s("direction", v)} options={["Learning something new", "Preparing for an event", "Overcoming a challenge", "Exploration / discovery", "Emotional growth", "Other"]} /></Field>
      </div>
      {brief.direction === "Other" && <Field label="Describe direction"><Inp value={brief.direction_other} onChange={v => s("direction_other", v)} /></Field>}
      <Field label="Moral / Takeaway"><Sel value={brief.moral} onChange={v => s("moral", v)} options={MORALS} /></Field>
      {brief.moral === "Other" && <Field label="Describe moral"><Inp value={brief.moral_other} onChange={v => s("moral_other", v)} /></Field>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tone"><Sel value={brief.tone} onChange={v => s("tone", v)} options={["Energetic and playful", "Warm and encouraging", "Calm and soothing", "Funny / slightly silly", "Adventurous"]} /></Field>
        <Field label="Language"><Sel value={brief.language_style} onChange={v => s("language_style", v)} options={["Rhyming — AABB", "Rhyming — ABAB", "Rhyming — ABCB", "Rhyming — flexible", "Non-rhyming prose"]} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Illustration Style"><Sel value={brief.illustration_style} onChange={v => s("illustration_style", v)} options={["IMAX Ultra Hyper Film Still (recommended)", "Photorealistic / Cinematic", "Soft watercolor", "Bold modern cartoon", "3D rendered / Pixar-style"]} /></Field>
        <Field label="Text Density"><Sel value={brief.text_density} onChange={v => s("text_density", v)} options={["Very light (8+ image-only)", "Standard (5-7 image-only)", "Text-heavy (3-4 image-only)"]} /></Field>
      </div>
    </div>
    <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
      <Btn onClick={onSubmit} disabled={filled < 8 || loading}>{loading ? "Generating..." : "Generate 4 Story Concepts →"}</Btn>
      <span style={{ fontSize: 12, color: T.textDim }}>{filled}/12</span>
    </div>
  </div>;
}

/* ── Concepts ── */
function ConceptCards({ concepts, loading, onSelect, onRegen }) {
  const [sel, setSel] = useState(null); const [ed, setEd] = useState(null);
  if (loading) return <Loader text="Brainstorming 4 concepts" />;
  if (sel !== null) {
    const u = (k, v) => setEd(p => ({ ...p, [k]: v }));
    return <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 16px" }}>Refine Concept</h2>
      <div style={{ background: T.card, border: `1px solid ${T.accent}`, borderRadius: 12, padding: 20, display: "grid", gap: 14 }}>
        <Field label="Title"><Inp value={ed.title} onChange={v => u("title", v)} /></Field>
        <Field label="Premise"><Txt value={ed.premise} onChange={v => u("premise", v)} rows={3} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Structure"><Sel value={ed.structure} onChange={v => u("structure", v)} options={["arc", "pattern", "hybrid"]} /></Field>
          <Field label="Companion Role"><Inp value={ed.companion_role} onChange={v => u("companion_role", v)} /></Field>
        </div>
        <Field label="Key Visuals"><Txt value={ed.key_moments} onChange={v => u("key_moments", v)} rows={2} /></Field>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Btn onClick={() => onSelect(ed)}>Continue to Characters →</Btn>
        <Btn ghost onClick={() => { setSel(null); setEd(null); }}>← Back</Btn>
      </div>
    </div>;
  }
  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 20px" }}>Story Concepts</h2>
    <div style={{ display: "grid", gap: 10 }}>
      {concepts.map((c, i) => <div key={i} onClick={() => { setSel(i); setEd({ ...c }); }}
        style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.cardHover; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>{c.title}</h3>
        <div style={{ marginBottom: 8 }}><Pill>{(c.structure || "").slice(0, 30)}</Pill></div>
        <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>{c.premise}</p>
      </div>)}
    </div>
    <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
      <button onClick={() => onRegen("")} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Regenerate</button>
    </div>
  </div>;
}

/* ── Characters ── */
function CharEditor({ content, loading, onManual, onAI, onNext, nextLabel }) {
  if (loading) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Characters</h2><Loader /></>;
  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 16px" }}>Character Descriptions</h2>
    <Txt value={content} onChange={onManual} rows={14} style={{ fontSize: 14, lineHeight: 1.7, minHeight: 220 }} />
    <AIBar onSubmit={onAI} placeholder="e.g., Add freckles, make puppy fluffier..." />
    {onNext && <div style={{ marginTop: 16 }}><Btn onClick={onNext}>{nextLabel}</Btn></div>}
  </div>;
}

/* ── Outline card ── */
function OCard({ page, idx, lidx, onAI, onSave }) {
  const [ed, setEd] = useState(false); const [lc, setLc] = useState(page.description || "");
  useEffect(() => { setLc(page.description || ""); }, [page.description]);
  return <div style={{ background: T.card, border: `1px solid ${lidx === idx ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
    <PageHdr idx={idx} titleShort={page.title_short} />
    {page.image_only && <div style={{ marginBottom: 6 }}><Pill color={T.amber}>Image Only</Pill></div>}
    {lidx === idx ? <Loader text="Updating" /> : ed ? <div>
      <Txt value={lc} onChange={setLc} rows={3} style={{ fontSize: 13 }} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}><Btn small onClick={() => { onSave(idx, lc); setEd(false); }}>Save</Btn><Btn ghost small onClick={() => { setEd(false); setLc(page.description || ""); }}>Cancel</Btn></div>
    </div> : <p style={{ fontSize: 14, color: T.text, lineHeight: 1.65, margin: 0, cursor: "pointer", whiteSpace: "pre-wrap" }} onClick={() => setEd(true)} title="Click to edit">{page.description || "—"}</p>}
    {page.setting && <p style={{ fontSize: 12, color: T.textSoft, margin: "8px 0 0" }}>📍 {page.setting}{page.next_setting ? ` → ${page.next_setting}` : ""}</p>}
    {!ed && <AIBar onSubmit={i => onAI(idx, i)} />}
  </div>;
}

/* ── Text card (side-by-side) ── */
function TCard({ page, op, idx, lidx, onAI, onSave }) {
  const [ed, setEd] = useState(false); const [lc, setLc] = useState(page.text || ""); const [exp, setExp] = useState(false);
  useEffect(() => { setLc(page.text || ""); }, [page.text]);
  const desc = op?.description || ""; const long = desc.length > 100;
  return <div style={{ background: T.card, border: `1px solid ${lidx === idx ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
    <PageHdr idx={idx} titleShort={op?.title_short} />
    {page.image_only && <div style={{ marginBottom: 6 }}><Pill color={T.amber}>Image Only</Pill></div>}
    {lidx === idx ? <Loader text="Updating" /> : <div style={{ display: "grid", gridTemplateColumns: desc ? "1fr 1fr" : "1fr", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Story Text</div>
        {ed ? <div>
          <Txt value={lc} onChange={setLc} rows={3} style={{ fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}><Btn small onClick={() => { onSave(idx, lc); setEd(false); }}>Save</Btn><Btn ghost small onClick={() => { setEd(false); setLc(page.text || ""); }}>Cancel</Btn></div>
        </div> : <p style={{ fontSize: 14, color: page.image_only ? T.textDim : T.text, lineHeight: 1.7, margin: 0, cursor: "pointer", fontStyle: page.image_only ? "italic" : "normal", whiteSpace: "pre-wrap" }} onClick={() => setEd(true)}>{page.text || "(image only)"}</p>}
      </div>
      {desc && <div style={{ borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Scene</div>
        <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.55, margin: 0 }}>{exp || !long ? desc : desc.slice(0, 100) + "..."}</p>
        {long && <button onClick={() => setExp(!exp)} style={{ background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}>{exp ? "Less" : "More"}</button>}
      </div>}
    </div>}
    {!ed && <AIBar onSubmit={i => onAI(idx, i)} />}
  </div>;
}

/* ═══════════════════════════════════════
   IMAGE GENERATION VIEW
   ═══════════════════════════════════════ */
function ImageGenView({ prompts, images, setImages, outline }) {
  const [selectedModel, setSelectedModel] = useState("flux-pro-1.1");
  const [genIdx, setGenIdx] = useState(null); // which page is currently generating
  const [genErr, setGenErr] = useState(null);
  const [copied, setCopied] = useState(null);
  const abortRef = useRef(null);

  const copyPrompt = (idx) => {
    navigator.clipboard.writeText(prompts[idx]?.prompt || "");
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const genOne = async (idx) => {
    setGenErr(null);
    setGenIdx(idx);
    const p = prompts[idx];
    if (!p?.prompt) { setGenIdx(null); return; }

    try {
      const ac = new AbortController();
      abortRef.current = ac;
      const result = await generateImage({
        model: selectedModel,
        prompt: p.prompt,
        aspectRatio: imgFmt(idx) === "square" ? "1:1" : "1:2",
        signal: ac.signal,
      });

      const url = result.image_url || result.image_data_url;
      if (url) {
        setImages(prev => {
          const next = { ...prev };
          if (!next[idx]) next[idx] = [];
          next[idx] = [...next[idx], { url, model: selectedModel, ts: Date.now() }];
          return next;
        });
      }
    } catch (e) {
      if (e.name !== "AbortError") setGenErr(`Page ${idx + 1}: ${e.message}`);
    }
    setGenIdx(null);
  };

  const genAll = async () => {
    for (let i = 0; i < prompts.length; i++) {
      if (abortRef.current?.signal?.aborted) break;
      await genOne(i);
    }
  };

  const removeImage = (pageIdx, imgIdx) => {
    setImages(prev => {
      const next = { ...prev };
      next[pageIdx] = next[pageIdx].filter((_, j) => j !== imgIdx);
      if (next[pageIdx].length === 0) delete next[pageIdx];
      return next;
    });
  };

  const totalImages = Object.values(images).reduce((s, a) => s + a.length, 0);

  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Generation</h2>
    <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>
      {totalImages} image{totalImages !== 1 ? "s" : ""} generated · Generate per-page or copy prompts to use externally
    </p>

    {/* Model selector */}
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Model</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {IMAGE_MODELS.map(m => (
          <button key={m.id} onClick={() => setSelectedModel(m.id)} style={{
            background: selectedModel === m.id ? T.accentBg : "transparent",
            border: `1px solid ${selectedModel === m.id ? T.accent : T.border}`,
            borderRadius: 10, padding: "10px 12px", textAlign: "left", cursor: "pointer",
            transition: "all .15s",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: selectedModel === m.id ? T.accent : T.text }}>{m.name}</div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{m.provider} · {m.cost}</div>
            <div style={{ fontSize: 11, color: T.textSoft, marginTop: 2 }}>{m.best_for}</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Btn onClick={genAll} disabled={genIdx !== null} small>
          {genIdx !== null ? "Generating..." : "🖼 Generate All Pages"}
        </Btn>
        {genIdx !== null && <Btn ghost small danger onClick={() => abortRef.current?.abort()}>■ Stop</Btn>}
      </div>
    </div>

    {genErr && <ErrBox msg={genErr} onDismiss={() => setGenErr(null)} />}

    {/* Per-page cards */}
    <div style={{ display: "grid", gap: 8 }}>
      {prompts.map((p, i) => {
        const pageImages = images[i] || [];
        const isGenerating = genIdx === i;

        return <div key={i} style={{
          background: T.card, border: `1px solid ${isGenerating ? T.accent : T.border}`,
          borderRadius: 10, padding: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <PageHdr idx={i} titleShort={outline?.[i]?.title_short} />
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => copyPrompt(i)} style={{
                background: copied === i ? T.accentBg : "transparent", border: `1px solid ${T.border}`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                color: copied === i ? T.accent : T.textDim, cursor: "pointer", fontFamily: "inherit",
              }}>{copied === i ? "✓ Copied" : "📋 Copy"}</button>
              <button onClick={() => genOne(i)} disabled={isGenerating} style={{
                background: T.accentBg, border: `1px solid rgba(139,124,247,0.3)`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                color: T.accent, cursor: isGenerating ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: isGenerating ? 0.5 : 1,
              }}>{isGenerating ? "..." : "🖼 Generate"}</button>
            </div>
          </div>

          {/* Prompt preview (collapsed) */}
          <details style={{ marginBottom: pageImages.length ? 10 : 0 }}>
            <summary style={{ fontSize: 12, color: T.textDim, cursor: "pointer", userSelect: "none" }}>
              View prompt ({(p.prompt || "").length} chars)
            </summary>
            <p style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{p.prompt || "—"}</p>
          </details>

          {isGenerating && <Loader text={`Generating with ${selectedModel}`} />}

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
                      border: `1px solid ${T.border}`,
                    }}
                  />
                  <div style={{
                    position: "absolute", bottom: 4, left: 4,
                    background: "rgba(0,0,0,.7)", borderRadius: 4, padding: "2px 6px",
                    fontSize: 10, color: T.textSoft,
                  }}>{img.model}</div>
                  <button onClick={() => removeImage(i, j)} style={{
                    position: "absolute", top: 4, right: 4,
                    background: "rgba(0,0,0,.7)", border: "none", borderRadius: 4,
                    padding: "2px 6px", fontSize: 12, color: T.textDim, cursor: "pointer",
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>;
      })}
    </div>
  </div>;
}

/* ── Export ── */
function ExportView({ data }) {
  const [copied, setCopied] = useState(null);
  const copy = (k, t) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 2000); };
  const secs = [
    { k: "chars", l: "Character Descriptions", d: data.characters },
    { k: "outline", l: "Outline", d: data.outline?.map((p, i) => `${i + 1}. ${imgName(i)} [${imgFmt(i)}] — ${p.description}`).join("\n") },
    { k: "text", l: "Story Text", d: data.storyText?.map((p, i) => `--- ${i + 1}. ${imgName(i)} ---\n${p.text || "(image only)"}`).join("\n\n") },
    { k: "prompts", l: "Image Prompts", d: data.imagePrompts?.map((p, i) => `--- ${i + 1}. ${imgName(i)} ---\n${p.prompt}`).join("\n\n") },
    { k: "json", l: "Full JSON (portable backup)", d: JSON.stringify(data, null, 2) },
  ];
  return <div>
    <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 20px" }}>Export</h2>
    <div style={{ display: "grid", gap: 10 }}>
      {secs.map(s => <div key={s.k} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{s.l}</span>
          <Btn ghost small onClick={() => copy(s.k, s.d)} style={copied === s.k ? { background: T.accentBg } : {}}>{copied === s.k ? "✓ Copied" : "Copy"}</Btn>
        </div>
        <pre style={{ fontSize: 12, color: T.textDim, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>{(s.d || "").slice(0, 500)}{(s.d || "").length > 500 ? "\n…" : ""}</pre>
      </div>)}
    </div>
  </div>;
}

/* ═══════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════ */
const STEPS = [
  { id: "brief", label: "Brief" },
  { id: "concepts", label: "Concepts" },
  { id: "characters", label: "Characters" },
  { id: "outline", label: "Outline" },
  { id: "text", label: "Text" },
  { id: "prompts", label: "Prompts" },
  { id: "images", label: "Images" },
  { id: "export", label: "Export" },
];

export default function App() {
  const [step, setStep] = useState("brief");
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [lidx, setLidx] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sysPrompt, setSysPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [brief, setBrief] = useState({});
  const [concepts, setConcepts] = useState([]);
  const [selConcept, setSelConcept] = useState(null);
  const [chars, setChars] = useState("");
  const [outline, setOutline] = useState([]);
  const [text, setText] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [images, setImages] = useState({}); // { pageIdx: [{ url, model, ts }] }
  const [outlineHash, setOutlineHash] = useState("");
  const [textOutlineHash, setTextOutlineHash] = useState("");
  const [textStale, setTextStale] = useState(false);
  const [promptsStale, setPromptsStale] = useState(false);

  const abortRef = useRef(null);
  const cancelledRef = useRef(false);

  const mark = id => setDone(p => new Set([...p, id]));
  const go = id => { setStep(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const briefStr = () => { const b = { ...brief }; if (b.direction === "Other") b.direction = b.direction_other || "Other"; if (b.moral === "Other") b.moral = b.moral_other || "Other"; return Object.entries(b).filter(([k, v]) => v?.trim() && !k.endsWith("_other")).map(([k, v]) => `${k}: ${v}`).join("\n"); };
  const api = useCallback((msgs) => { const c = new AbortController(); abortRef.current = c; return callClaude(msgs, sysPrompt, c.signal); }, [sysPrompt]);
  const stopGen = () => { cancelledRef.current = true; if (abortRef.current) abortRef.current.abort(); setLoading(false); };

  // Compute outline hash for staleness detection
  useEffect(() => {
    if (outline.length) {
      const h = outline.map(p => p.description || "").join("|");
      setOutlineHash(h);
      if (textOutlineHash && h !== textOutlineHash) setTextStale(true);
    }
  }, [outline]);

  // Auto-save to localStorage
  const getState = useCallback(() => ({
    brief, concepts, selConcept, chars, outline, text, prompts, images, step, done: [...done], sysPrompt
  }), [brief, concepts, selConcept, chars, outline, text, prompts, images, step, done, sysPrompt]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try { await storage.set("autosave", JSON.stringify({ ts: Date.now(), state: getState() })); } catch {}
    }, 2000);
    return () => clearTimeout(t);
  }, [getState]);

  // Auto-load on mount
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return; mounted.current = true;
    (async () => {
      try { const r = await storage.get("autosave"); if (r) { const d = JSON.parse(r.value); if (d.state) loadState(d.state); } } catch {}
    })();
  }, []);

  const loadState = (s) => {
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
    if (s.sysPrompt) setSysPrompt(s.sysPrompt);
    setTextStale(false); setPromptsStale(false);
  };

  /* ── Concepts ── */
  const genConcepts = async (fb = "") => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("concepts");
    try { const r = await api([{ role: "user", content: `Creative brief:\n${briefStr()}${fb ? `\n\nFEEDBACK:\n${fb}` : ""}\n\nGenerate exactly 4 storyline concepts.\nONLY raw JSON array of 4 objects. Keys: "title", "premise", "structure" (ONLY "arc"/"pattern"/"hybrid"), "companion_role", "key_moments".` }]);
      setConcepts(parseJSON(r)); mark("brief"); } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLoading(false);
  };

  /* ── Characters ── */
  const pickConcept = async (concept) => {
    setSelConcept(concept); setErr(null); setLoading(true); cancelledRef.current = false; go("characters"); mark("concepts");
    try { const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCONCEPT:\n${JSON.stringify(concept)}\n\nCreate HIGHLY detailed character descriptions (pasted verbatim into every image prompt).\n\nChild: describe 1-2 yrs YOUNGER than actual. Basic clothes. Include: height/build, skin tone, hair, eye color/shape, face details (nose, cheeks, lips, dimples/freckles), exact clothing with specific colors, body language, emotional baseline.\n\nCompanion: exact breed+age+weight, fur details, max 2 accessories with exact placement, size relative to child.\n\nParagraph form, one block per character.` }]);
      setChars(r); } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLoading(false);
  };
  const aiEditChars = async (inst) => { setErr(null); setLoading(true);
    try { const r = await api([{ role: "user", content: `Current:\n\n${chars}\n\nAdjust: ${inst}\n\nReturn full updated block.` }]); setChars(r); }
    catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLoading(false); };

  /* ── Outline ── */
  const genOutline = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("outline"); mark("characters"); const all = [];
    try {
      const r1 = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCONCEPT:\n${JSON.stringify(selConcept)}\nCHARACTERS:\n${chars}\n\nOutline for images 1-11 of 22:\n- 1: Cover (square)\n- 2: Inside left (square)\n- 3: Inside right (square)\n- 4-11: Spreads 1-8 (1:2)\n\nEach = ONE drawable scene. Include setting transitions. Mark 2-3 image-only.\nONLY raw JSON array of 11 objects: "page_number","format","title_short","setting","description","next_setting","image_only".` }]);
      if (cancelledRef.current) return; all.push(...parseJSON(r1)); setOutline([...all]);
      const r2 = await api([{ role: "user", content: `First 11:\n${JSON.stringify(all)}\n\nNow images 12-22:\n- 12-20: Spreads 9-17 (1:2)\n- 21: Closing page (square) — this IS part of the story, emotional resolution\n- 22: Back cover (square) — warm closing image\n\n2-3 more image-only. Story resolves by 20-21.\nONLY raw JSON array of 11 objects. Same keys.` }]);
      if (cancelledRef.current) return; all.push(...parseJSON(r2)); setOutline([...all]);
      setTextStale(false); setPromptsStale(false);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLoading(false);
  };
  const aiEditOutline = async (i, inst) => { setErr(null); setLidx(i);
    try { const r = await api([{ role: "user", content: `Page:\n${JSON.stringify(outline[i])}\nPrev: ${i > 0 ? JSON.stringify(outline[i - 1]) : "none"}\nNext: ${i < outline.length - 1 ? JSON.stringify(outline[i + 1]) : "none"}\n\nChange: "${inst}"\nONLY raw JSON: page_number,format,title_short,setting,description,next_setting,image_only.` }]);
      setOutline(p => p.map((x, j) => j === i ? parseJSON(r) : x)); } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLidx(null); };
  const manualOutline = (i, d) => { setOutline(p => p.map((x, j) => j === i ? { ...x, description: d } : x)); };

  /* ── Text ── */
  const genText = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("text"); mark("outline"); const all = [];
    const h = outline.map(p => p.description || "").join("|");
    try { for (let b = 0; b < outline.length; b += 3) {
      if (cancelledRef.current) break;
      const batch = outline.slice(b, b + 3);
      const r = await api([{ role: "user", content: `BRIEF:\n${briefStr()}\nCHARACTERS:\n${chars}\nOUTLINE:\n${JSON.stringify(outline)}\n${all.length ? `TEXT SO FAR:\n${JSON.stringify(all)}\n` : ""}\nWrite text for ONLY images ${b + 1}-${Math.min(b + 3, outline.length)}:\n${JSON.stringify(batch)}\n\nMax 4 lines/page, 8-10 syl/line, ${brief.language_style || "rhyming"}, never rhyme with names.\nONLY raw JSON array of ${batch.length}: "page_number","text","image_only".` }]);
      if (cancelledRef.current) break; all.push(...parseJSON(r)); setText([...all]);
    }
      setTextOutlineHash(h); setTextStale(false); setPromptsStale(false);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLoading(false);
  };
  const aiEditText = async (i, inst) => { setErr(null); setLidx(i);
    try { const r = await api([{ role: "user", content: `Page:\n${JSON.stringify(text[i])}\nBefore: ${i > 0 ? text[i - 1]?.text : "none"}\nAfter: ${i < text.length - 1 ? text[i + 1]?.text : "none"}\n\nChange: "${inst}"\nMax 4 lines, 8-10 syl, ${brief.language_style || "rhyming"}, no name rhymes.\nONLY raw JSON: page_number,text,image_only.` }]);
      setText(p => p.map((x, j) => j === i ? parseJSON(r) : x)); setPromptsStale(true); } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLidx(null); };
  const manualText = (i, t) => { setText(p => p.map((x, j) => j === i ? { ...x, text: t } : x)); setPromptsStale(true); };

  /* ── Prompts ── */
  const genPrompts = async () => {
    setErr(null); setLoading(true); cancelledRef.current = false; go("prompts"); mark("text"); const all = [];
    try { for (let b = 0; b < outline.length; b += 3) {
      if (cancelledRef.current) break;
      const bo = outline.slice(b, b + 3), bt = text.slice(b, b + 3);
      const combined = bo.map((p, i) => ({ ...p, story_text: bt[i]?.text }));
      const r = await api([{ role: "user", content: `CHARACTERS (verbatim every prompt):\n${chars}\nSTYLE: ${brief.illustration_style || "IMAX, ultra hyper film still, cinematic"}\n\nPrompts for:\n${JSON.stringify(combined)}\n\nEach: page#/style/ratio, ONE scene, full chars redescribed, spreads="one panoramic image" (NEVER left/right/center/seam), chars SMALL in wide scene, facial expressions, nothing in center.\nONLY raw JSON array of ${bo.length}: "page_number","format","prompt".` }]);
      if (cancelledRef.current) break; all.push(...parseJSON(r)); setPrompts([...all]);
    }
      setPromptsStale(false);
    } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLoading(false);
  };
  const editPrompt = async (i, inst) => { setErr(null); setLidx(i);
    try { const r = await api([{ role: "user", content: `CHARACTERS:\n${chars}\n\nCurrent:\n${JSON.stringify(prompts[i])}\n\nChange: "${inst}"\nKeep all rules. ONLY raw JSON: page_number,format,prompt.` }]);
      setPrompts(p => p.map((x, j) => j === i ? parseJSON(r) : x)); } catch (e) { if (e.name !== "AbortError") setErr(e.message); } setLidx(null); };

  /* ── View (navigation NEVER triggers generation) ── */
  const view = () => {
    switch (step) {
      case "brief": return <BriefForm brief={brief} set={setBrief} onSubmit={() => genConcepts("")} loading={loading} />;
      case "concepts": return <ConceptCards concepts={concepts} loading={loading} onSelect={pickConcept} onRegen={genConcepts} />;
      case "characters": return <CharEditor content={chars} loading={loading} onManual={setChars} onAI={aiEditChars}
        onNext={outline.length ? () => go("outline") : genOutline} nextLabel={outline.length ? "View Outline →" : "Generate Outline →"} />;

      case "outline":
        if (loading && !outline.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Page Outline</h2><Loader text="Building outline (batch 1/2)" /></>;
        return <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Page Outline</h2>
          <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>22 images · Click text to edit · AI edit below each card</p>
          <div style={{ display: "grid", gap: 6 }}>
            {outline.map((p, i) => <OCard key={i} page={p} idx={i} lidx={lidx} onAI={aiEditOutline} onSave={manualOutline} />)}
          </div>
          {loading && <Loader text="Generating batch 2/2" />}
          {!loading && outline.length > 0 && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {text.length > 0
              ? <><Btn onClick={() => go("text")}>View Story Text →</Btn><Btn ghost onClick={genText}>↻ Regenerate Text</Btn></>
              : <Btn onClick={genText}>Generate Story Text →</Btn>
            }
          </div>}
        </div>;

      case "text":
        if (loading && !text.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Story Text</h2><Loader text="Writing story" /></>;
        return <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Story Text</h2>
          <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>{brief.language_style || "Rhyming"} · Click to edit · Scene on right</p>
          {textStale && <StaleWarning msg="Outline has changed since this text was generated. Consider regenerating." />}
          <div style={{ display: "grid", gap: 6 }}>
            {text.map((p, i) => <TCard key={i} page={p} op={outline?.[i]} idx={i} lidx={lidx} onAI={aiEditText} onSave={manualText} />)}
          </div>
          {loading && <Loader text="Generating next batch" />}
          {!loading && text.length > 0 && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {prompts.length > 0
              ? <><Btn onClick={() => go("prompts")}>View Image Prompts →</Btn><Btn ghost onClick={genPrompts}>↻ Regenerate Prompts</Btn></>
              : <Btn onClick={genPrompts}>Generate Image Prompts →</Btn>
            }
            {textStale && <Btn ghost danger onClick={genText}>↻ Regenerate Text (outline changed)</Btn>}
          </div>}
        </div>;

      case "prompts":
        if (loading && !prompts.length) return <><h2 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Image Prompts</h2><Loader text="Generating prompts" /></>;
        return <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>Image Prompts</h2>
          <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>Review and edit prompts before generating images</p>
          {promptsStale && <StaleWarning msg="Text has changed since these prompts were generated. Consider regenerating." />}
          <div style={{ display: "grid", gap: 6 }}>
            {prompts.map((p, i) => <div key={i} style={{ background: T.card, border: `1px solid ${lidx === i ? T.accent : T.border}`, borderRadius: 10, padding: 14 }}>
              <PageHdr idx={i} />
              {lidx === i ? <Loader text="Updating" /> : <p style={{ fontSize: 14, color: T.text, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{p.prompt || "—"}</p>}
              <AIBar onSubmit={inst => editPrompt(i, inst)} />
            </div>)}
          </div>
          {loading && <Loader text="Generating next batch" />}
          {!loading && prompts.length > 0 && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={() => { mark("prompts"); go("images"); }}>Generate Images →</Btn>
            {promptsStale && <Btn ghost danger onClick={genPrompts}>↻ Regenerate (text changed)</Btn>}
          </div>}
        </div>;

      case "images":
        return <div>
          <ImageGenView prompts={prompts} images={images} setImages={setImages} outline={outline} />
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Btn onClick={() => { mark("images"); go("export"); }}>Go to Export →</Btn>
            <Btn ghost onClick={() => go("prompts")}>← Back to Prompts</Btn>
          </div>
        </div>;

      case "export": return <ExportView data={{ brief, characters: chars, selectedConcept: selConcept, outline, storyText: text, imagePrompts: prompts, images }} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}>
      <SettingsModal prompt={sysPrompt} onChange={setSysPrompt} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} getState={getState} loadState={loadState} />
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
