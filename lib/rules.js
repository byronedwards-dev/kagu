// Living Rules system — PRD section 5.3
// All rules are editable in the UI and stored in localStorage.
// The system prompt is assembled dynamically from these sections.

const HARDCODED_PREAMBLE = `You are a children's picture book author and art director for personalized illustrated storybooks.

When asked for JSON, respond with ONLY raw JSON. No markdown code fences, no backticks, no preamble, no explanation.`;

// Default rules content — from PRD section 4
export const DEFAULT_RULES = {
  writing: `Word count by age:
- Toddlers (2-4): ~150–250 words total
- Preschool (3-7): ~250–350 words total
- Early readers (5-9): ~300–400 words total

Hard rules:
- Max 4 lines of text per page
- 8-10 syllables per line (for rhythm consistency)
- Language matches the youngest reader in the target range
- No slang, sarcasm, or complex metaphors
- Vocabulary: concrete and visual
- Emotional beats clear even without reading the text
- Never rhyme a word with itself ("by / by" is not a rhyme)
- Rhymes must feel natural — if a line exists only to serve the rhyme, rewrite it`,

  rhyme: `NEVER rhyme with character names — names are personalized per child, any name-rhyme breaks when the name is swapped. This is the single most important text rule.

Rhyme schemes:
- AABB: Lines 1-2 rhyme, lines 3-4 rhyme
- ABAB: Lines 1+3 rhyme, lines 2+4 rhyme
- ABCB: Only lines 2+4 rhyme (most forgiving)
- ABCB across spreads: L page = A+B lines, R page = C+B(rhyme) lines

Never reuse the same rhyming pair twice in a book.`,

  character: `Child character:
- ALWAYS describe age 1-2 years YOUNGER than actual — image gen models make kids look older. If child is 4, say "2-3 year old toddler." This is critical.
- Face: describe explicitly (eye shape, expression, nose, cheeks, lips, dimples/freckles)
- Clothing: very basic, simple colors, no logos, no complex patterns
- Max 2 accessories — define exact body placement and colors
- Normal human-proportioned faces for better AI face recognition
- Specify: hair length/style/color, skin tone, body build
- Avoid scarves/complex headwear (warps during face swap)

Companion/sidekick:
- Exact breed + age + weight (e.g., "5-month-old Golden Retriever puppy, ~12 lbs")
- Max 2 accessories — define exact body placement and colors
- Size relative to child, fur/skin coloring, distinguishing marks
- Keep color descriptions concise (image prompt budget is ~2,000 words)`,

  imagePrompt: `Every prompt must follow this structure:
[PAGE #]. [ART STYLE KEYWORDS], [ASPECT RATIO + RESOLUTION].
[SCENE — one continuous moment. Characters small within expansive environment.]
[FULL CHARACTER DESCRIPTIONS — repeated from scratch every time]
[FACIAL EXPRESSION & EMOTION — explicit for each character]
[CAMERA/FRAMING: wide shot, characters integrated into environment]

Character rules for prompts:
- ALWAYS redescribe ALL characters from scratch in EVERY prompt — paste the full character block every time
- NEVER reference previous pages — each prompt is fully self-contained (the image model has no memory)
- When using a name, ALWAYS follow with the full description block

Spread page composition:
- Describe as "one panoramic image"
- Say: "One continuous scene across the full frame. The middle area is a continuation of the surrounding environment with no key elements."
- NEVER say "left side," "right side," or "center" — causes the model to break into quadrants

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
- Environment should feel expansive; character exists WITHIN it`,

  bannedWords: [
    "seam",
    "left side",
    "right side",
    "center",
    "close-up",
    "zoomed in",
    "portrait",
    "like the previous page",
  ],

  companion: `Companion character rules:
- At least 3 distinct personality moments across the book
- At least 1 failed mimicry or funny misunderstanding
- Companion reactions can carry image-only pages
- Companion should have a mini-arc or running gag
- Companion appears on EVERY page

Character dynamics:
- Child should be active and brave — grabbing the wheel, making decisions, not passively listening
- Companion should be funny and clumsy — tripping, spinning, failed mimicry, not lecturing
- Moral is earned through action, not stated as a lesson`,

  storyStructure: `Book structure:
- 22 images total: 5 square (1:1) + 17 spread (1:2)
- Minimum 5 image-only pages for pacing (adjust based on text_density setting)
- Each page = ONE drawable scene. Cannot describe multiple sequential actions.
- Nothing important in the center of spread pages — that's the fold line
- Page 21 (Closing) IS part of the story — emotional resolution, not throwaway
- Page 22 (Back Cover) — warm closing image, typically no text
- Scene transitions must be logical — no random location jumps between pages

Pattern-specific rules (if structural pattern or hybrid):
- Vary delivery: explicit early, then implied as familiarity grows
- Rhythm: 2-3 content pages → 1 break page (humor/reaction/quiet moment)
- Pattern should feel present but not monotonous
- Break pages interrupt pattern for surprise and breathing room

Motifs:
- Consider a recurring phrase at 3-4 key emotional moments
- Don't overuse — place at moments of wonder, connection, farewell
- Full circle: opening and closing should connect`,

  qualityChecklist: [
    "All 22 images present (5 square + 17 spreads)",
    "Page types correct",
    "Image-only page count matches density preference",
    "Total word count within target range for age",
    "No page exceeds 4 lines",
    "8-10 syllables per line (if rhyming)",
    "No rhymes use character names",
    "Rhymes feel natural, not forced",
    "Moral clear but not preachy",
    "Ending warm and complete",
    "If pattern: felt but not monotonous, with effective breaks",
    "If arc: clear want → obstacle → resolution",
    "Transitions between pages are logical",
    "3+ companion personality moments",
    "1+ companion comedy beat",
    "Companion feels like a real character, not a prop",
    "Companion appears on every page",
    "Every prompt includes full character descriptions",
    "Every prompt describes ONE drawable scene",
    "Face visibility clear on all appearances (max 90% profile)",
    "No important elements in center of spreads",
    "Spreads use 'one panoramic image' language",
    "'seam' never appears in prompts",
    "Art style keywords consistent",
    "Aspect ratios correct",
    "Characters small within wider scenes",
    "Visual variety (different angles, compositions, scales)",
    "2-3 standout 'wow' illustration moments",
    "Content age-appropriate",
  ],

  customNotes: "",
};

// Which rule sections are relevant to each step — PRD section 5.3
const STEP_RULES = {
  brief: ["storyStructure", "companion", "customNotes"],
  concepts: ["storyStructure", "companion", "customNotes"],
  characters: ["character", "customNotes"],
  outline: ["storyStructure", "companion", "customNotes"],
  text: ["writing", "rhyme", "companion", "customNotes"],
  prompts: ["imagePrompt", "character", "bannedWords", "customNotes"],
};

// Assemble the system prompt for a given step
export function assembleSystemPrompt(rules, step) {
  const sections = STEP_RULES[step] || Object.keys(STEP_RULES).flatMap(k => STEP_RULES[k]).filter((v, i, a) => a.indexOf(v) === i);
  let prompt = HARDCODED_PREAMBLE;

  const sectionLabels = {
    writing: "WRITING RULES",
    rhyme: "RHYME RULES",
    character: "CHARACTER RULES",
    imagePrompt: "IMAGE PROMPT RULES",
    bannedWords: "BANNED WORDS",
    companion: "COMPANION RULES",
    storyStructure: "STORY STRUCTURE",
    customNotes: "ADDITIONAL NOTES",
  };

  for (const key of sections) {
    const label = sectionLabels[key];
    if (!label) continue;

    let content;
    if (key === "bannedWords") {
      const words = rules.bannedWords || DEFAULT_RULES.bannedWords;
      content = "NEVER use these words/phrases in image prompts: " + words.join(", ");
    } else {
      content = rules[key];
    }

    if (content && content.trim()) {
      prompt += `\n\n=== ${label} ===\n${content}`;
    }
  }

  return prompt;
}

// Validation: scan text for banned words
export function findBannedWords(text, bannedWords) {
  const lower = text.toLowerCase();
  return (bannedWords || DEFAULT_RULES.bannedWords).filter(w => lower.includes(w.toLowerCase()));
}

// Validation: rough syllable count
export function countSyllables(line) {
  if (!line) return 0;
  const word = line.trim().toLowerCase().replace(/[^a-z\s]/g, "");
  const words = word.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const w of words) {
    let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
      .match(/[aeiouy]{1,2}/g);
    total += count ? count.length : 1;
  }
  return total;
}

// Validation: check if any rhyming words match character names
export function findNameRhymes(text, names) {
  if (!text || !names?.length) return [];
  const lines = text.split("\n").filter(l => l.trim());
  const lastWords = lines.map(l => {
    const words = l.trim().replace(/[.,!?;:]+$/, "").split(/\s+/);
    return words[words.length - 1]?.toLowerCase() || "";
  });
  const nameSet = new Set(names.map(n => n.toLowerCase()));
  return lastWords.filter(w => nameSet.has(w));
}

// Load rules from localStorage (client-side only)
export function loadRules() {
  if (typeof window === "undefined") return { ...DEFAULT_RULES };
  try {
    const saved = localStorage.getItem("kagu-rules");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_RULES, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_RULES };
}

// Save rules to localStorage
export function saveRules(rules) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("kagu-rules", JSON.stringify(rules));
  } catch {}
}
