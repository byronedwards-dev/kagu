// Theme colors — matches PRD section 5.5
export const T = {
  bg: "#111114",
  card: "#1A1A1F",
  cardHover: "#1F1F26",
  border: "#2D2D35",
  borderFocus: "#8B7CF7",
  text: "#F0EEF2",
  textSoft: "#CCC7D5",
  textDim: "#8A8498",
  accent: "#8B7CF7",
  accentBg: "rgba(139,124,247,0.12)",
  green: "#4ADE80",
  amber: "#FBBF24",
  red: "#F87171",
};

// Workflow steps
export const STEPS = [
  { id: "brief", label: "Brief" },
  { id: "concepts", label: "Concepts" },
  { id: "characters", label: "Characters" },
  { id: "outline", label: "Outline" },
  { id: "text", label: "Text & Scene" },
  { id: "prompts", label: "Prompts" },
  { id: "images", label: "Images" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
];

// 22-page format reference — PRD section 3.1
export const PAGE_FORMATS = [
  { index: 0, name: "Cover", format: "square", aspect: "1:1", resolution: "4K, 300dpi", print: null },
  { index: 1, name: "Inside Left", format: "square", aspect: "1:1", resolution: "4K, 300dpi", print: "p. 1" },
  { index: 2, name: "Inside Right", format: "square", aspect: "1:1", resolution: "4K, 300dpi", print: "p. 2" },
  { index: 3, name: "Spread 1", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 3–4" },
  { index: 4, name: "Spread 2", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 5–6" },
  { index: 5, name: "Spread 3", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 7–8" },
  { index: 6, name: "Spread 4", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 9–10" },
  { index: 7, name: "Spread 5", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 11–12" },
  { index: 8, name: "Spread 6", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 13–14" },
  { index: 9, name: "Spread 7", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 15–16" },
  { index: 10, name: "Spread 8", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 17–18" },
  { index: 11, name: "Spread 9", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 19–20" },
  { index: 12, name: "Spread 10", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 21–22" },
  { index: 13, name: "Spread 11", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 23–24" },
  { index: 14, name: "Spread 12", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 25–26" },
  { index: 15, name: "Spread 13", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 27–28" },
  { index: 16, name: "Spread 14", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 29–30" },
  { index: 17, name: "Spread 15", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 31–32" },
  { index: 18, name: "Spread 16", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 33–34" },
  { index: 19, name: "Spread 17", format: "spread", aspect: "1:2", resolution: "8K, 300dpi", print: "p. 35–36" },
  { index: 20, name: "Closing", format: "square", aspect: "1:1", resolution: "4K, 300dpi", print: "p. 37" },
  { index: 21, name: "Back Cover", format: "square", aspect: "1:1", resolution: "4K, 300dpi", print: null },
];

// Dynamic page format generation
export const PAGE_COUNT_PRESETS = [16, 18, 20, 22, 24];

const _cache = {};
export function generatePageFormats(pageCount = 22) {
  if (_cache[pageCount]) return _cache[pageCount];
  const formats = [];
  const n = pageCount;
  let printPage = 1; // running print page counter
  for (let i = 0; i < n; i++) {
    let name, format, aspect, print;
    if (i === 0) {
      name = "Cover"; format = "square"; aspect = "1:1"; print = null;
    } else if (i === 1) {
      name = "Inside Left"; format = "square"; aspect = "1:1"; print = `p. ${printPage}`; printPage++;
    } else if (i === 2) {
      name = "Inside Right"; format = "square"; aspect = "1:1"; print = `p. ${printPage}`; printPage++;
    } else if (i === n - 2) {
      name = "Closing"; format = "square"; aspect = "1:1"; print = `p. ${printPage}`; printPage++;
    } else if (i === n - 1) {
      name = "Back Cover"; format = "square"; aspect = "1:1"; print = null;
    } else {
      const spreadNum = i - 2;
      name = `Spread ${spreadNum}`;
      format = "spread"; aspect = "1:2";
      print = `p. ${printPage}–${printPage + 1}`; printPage += 2;
    }
    formats.push({ index: i, name, format, aspect, print });
  }
  _cache[pageCount] = formats;
  return formats;
}

// Page helper functions — accept optional pageFormats array for dynamic page counts
export function imgName(i, pageFormats) {
  const fmts = pageFormats || PAGE_FORMATS;
  return fmts[i]?.name || `Image ${i + 1}`;
}
export function pageNum(i, pageFormats) {
  const fmts = pageFormats || PAGE_FORMATS;
  return fmts[i]?.print || null;
}
export function imgFmt(i, pageFormats) {
  const fmts = pageFormats || PAGE_FORMATS;
  return fmts[i]?.format || "square";
}

// Dropdown options — PRD section 5.2
export const MORALS = [
  "Perseverance", "Teamwork", "Confidence", "Curiosity", "Kindness",
  "Joy of play", "Bravery", "Gratitude", "Empathy", "Self-expression",
  "Patience", "Sharing", "Resilience", "Creativity", "Respect for nature",
  "Believing in yourself", "Trying new things", "Other",
];

export const THEMES = [
  "dinosaur adventure", "trip to the moon", "learning to ride a bike",
  "first day of school", "underwater ocean quest", "building a treehouse",
  "cooking with grandma", "superhero training", "jungle safari",
  "pirate treasure hunt", "visiting a farm", "snow day adventure",
  "learning to swim", "magical garden", "robot best friend",
  "camping in the woods", "puppy's first day home", "dance recital",
  "race car dreams", "exploring a cave", "soccer championship",
  "painting a masterpiece", "finding a lost star",
];

export const NAMES_BOY = ["Max", "Leo", "Milo", "Kai", "Ezra", "Noah", "Jax", "Finn"];
export const NAMES_GIRL = ["Luna", "Zoe", "Mia", "Ava", "Ivy", "Ruby", "Ella", "Nova"];
export const NAMES_UNISEX = ["Alex", "Riley", "Charlie", "Quinn", "Sam", "Sky", "Remi"];

export const SIDEKICKS = [
  "5-month-old Golden Retriever puppy, red bandana on neck",
  "tiny orange tabby kitten, blue bow on collar",
  "baby panda, green backpack on back",
  "baby penguin, yellow scarf around neck",
];

export const AGE_RANGES = ["2–3 years (Tier 1 — Toddler)", "3–5 years (Tier 2 — Preschool)", "5–7 years (Tier 3 — Early Reader)", "7+ years (Tier 4 — Transitional)"];
export const READER_IDENTITIES = ["Boy", "Girl", "Unisex"];
export const CHARACTER_SETUPS = ["One main character", "Two children", "Child + adult (coach, parent, mentor)", "Child + companion (pet, creature)"];
export const COMPANION_ROLES = [
  "Comic relief",
  "Supportive sidekick",
  "Learning alongside",
  "Contrast character",
  "Equal partner (Tier 3–4)",
  "Challenger (Tier 4 only)",
];
export const STRUCTURES = ["Story with arc", "Structural pattern", "Hybrid"];
export const DIRECTIONS = [
  "Learning something new",
  "Preparing for an event",
  "Overcoming a challenge or fear",
  "Pure exploration / discovery",
  "Emotional growth",
  "Navigating relationships (Tier 3–4)",
  "Facing a moral dilemma (Tier 4 only)",
  "Other",
];
export const TONES = ["Energetic and playful", "Warm and encouraging", "Calm and soothing", "Funny / slightly silly", "Adventurous"];
export const LANGUAGE_STYLES = ["Rhyming — AABB", "Rhyming — ABAB", "Rhyming — ABCB", "Rhyming — flexible", "Non-rhyming prose"];
export const ILLUSTRATION_STYLES = ["IMAX Ultra Hyper Film Still (recommended)", "Photorealistic / Cinematic", "Soft watercolor", "Bold modern cartoon", "3D rendered / Pixar-style"];
export const TEXT_DENSITIES = [
  "Very light (8–12 image-only) — Tier 1 default",
  "Standard (5–7 image-only) — Tier 2 default",
  "Slightly text-heavy (3–5 image-only) — Tier 3 default",
  "Text-forward (2–3 image-only) — Tier 4 default",
];

export function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}

// JSON parser — robust extraction from Claude responses
export function parseJSON(text) {
  let c = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(c); } catch {}
  for (const [o, cl] of [["[", "]"], ["{", "}"]]) {
    const s = c.indexOf(o);
    if (s < 0) continue;
    let d = 0;
    for (let i = s; i < c.length; i++) {
      if (c[i] === o) d++;
      if (c[i] === cl) d--;
      if (d === 0) {
        try { return JSON.parse(c.slice(s, i + 1)); } catch { break; }
      }
    }
  }
  throw new Error("JSON parse failed");
}
