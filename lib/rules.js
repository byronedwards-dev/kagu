// Living Rules system — PRD section 5.3
// All rules are editable in the UI and stored in localStorage.
// The system prompt is assembled dynamically from these sections.

const HARDCODED_PREAMBLE = `You are a children's picture book author and art director for personalized illustrated storybooks.

When asked for JSON, respond with ONLY raw JSON. No markdown code fences, no backticks, no preamble, no explanation.`;

// Default rules content — from PRD section 4
export const DEFAULT_RULES = {
  writing: `Text Rules by Age Tier:

Tier 1 — Toddler (ages 2–3):
- Total words: 50–150
- Max 2 lines per page
- 5–7 syllables per line
- 8–12 image-only pages (images dominate)
- Default rhyme: AABB
- Default structure: Pure pattern (no arc)
- Language: concrete nouns, present tense, repetitive phrases, onomatopoeia
- No metaphors, no abstract concepts, no past/future tense complexity
- Moral: none required — sensory experience or routine completion is the goal

Tier 2 — Preschool (ages 3–5) ← default tier:
- Total words: 150–350
- Max 4 lines per page
- 8–10 syllables per line
- 5–7 image-only pages (standard density)
- Default rhyme: ABCB
- Default structure: Hybrid (pattern + light arc)
- Language: simple but playful, 2–3 "stretch words" allowed with clear context
- Simple dialogue is effective ("'Look!' said the bear.")
- Humor through absurdity and surprise works well
- Moral: demonstrated through action, never stated directly

Tier 3 — Early Reader (ages 5–7):
- Total words: 300–500
- Max 5 lines per page
- 8–12 syllables per line (or natural prose rhythm)
- 3–5 image-only pages (used for dramatic effect)
- Default rhyme: ABCB/ABAB or prose (both strong options)
- Default structure: Story with arc (or strong hybrid)
- Language: richer vocabulary, dialogue carries personality, simple internal thoughts allowed ("Max wondered if he was brave enough")
- Simple similes okay ("fast as a cheetah"), gentle wordplay
- Character should face a real decision at climax
- Moral: can be slightly more visible; character reflection is okay

Tier 4 — Transitional (ages 7+):
- Total words: 500–1,000+
- Max 6–8 lines per page (paragraph-based)
- Natural prose rhythm (no syllable count)
- 2–3 image-only pages (for impact, not pacing)
- Default: prose (rhyme only if exceptional)
- Default structure: Full arc with clear want → escalation → climax → resolution
- Language: literary prose with voice, figurative language, character-distinct dialogue, internal monologue
- Subplots and secondary character motivations are welcome
- Moral: earned through genuine struggle, ambiguity is okay
- Pattern structures are not recommended for this tier
- Consider reducing total images to 16–18 with more text per spread

After the user selects a target age range, identify the matching tier and apply its defaults automatically. If the age range spans two tiers, use the LOWER tier (write for the youngest reader).

Hard rules (all tiers):
- Language matches the youngest reader in the target range
- No slang or sarcasm
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
- Face: realistic proportional face with natural features — mention eye color and overall expression only. Faces are swapped in post, so avoid over-detailing (no specific nose shape, lip fullness, dimple placement). The less facial detail, the more the AI focuses on everything else correctly.
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
- CRITICAL: Characters and human figures must NEVER be placed in the middle third of a spread image — the book seam will cut through them. Place all characters in the left third or right third of the panoramic frame. If two characters appear, one occupies the left third and one the right third, with the middle third showing only scenery/background as a continuous panoramic bridge between them.

Face & body rules (for personalization tech):
- THREE-QUARTER VIEW is the default for ALL character appearances — explicitly state "three-quarter view" in every prompt
- Pure profile (side view) is allowed on max 2 pages per book and NEVER consecutive — always specify "slight three-quarter angle" unless the scene absolutely requires profile
- Maximum profile: 90% — beyond that, face-swap technology fails
- Faces must be COMPLETELY unobstructed — no hands near face, no hair across eyes, no objects in front of face, no extreme shadows on face, no food/items held near mouth level
- Body proportions consistent across ALL pages — height relationships CANNOT be fixed in post
- Describe facial expression explicitly in every prompt (e.g., "wide smile showing teeth", "curious raised eyebrows")
- Avoid extreme foreshortening on faces
- Keep lighting consistent within scenes — avoid harsh side-lighting that shadows half the face

Character framing & scene composition:
- Characters SMALL within wider scenes — NOT close-up, NOT zoomed in, NOT portrait-style
- Make character part of the scene, not front-and-center
- Think "wide shot showing the world with the character in it"
- Environment should feel expansive; character exists WITHIN it

Age-specific illustration guidance:
- Tier 1 (2–3): Large, clear, simple compositions with ONE focal point per page. Bright bold colors, high contrast. Minimal background detail — cluttered visuals reduce comprehension at this age. Faces with exaggerated, clear emotions. Familiar objects children can point to and name.
- Tier 2 (3–5): Richer environments welcome. Action scenes effective — characters doing things, not just standing. Visual humor works (funny background details, companion reactions). Emotional nuance in faces: curious, determined, confused, proud.
- Tier 3 (5–7): More sophisticated compositions — varied camera angles, dynamic action. Text-illustration interplay is important — illustrations can add subtext or hidden details. Background storytelling (details that tell their own story). Nuanced emotions and body language.
- Tier 4 (7+): Cinematic, detailed compositions that reward close looking. Fewer but more impactful illustrations. Allow occasional close-up emotional moments alongside wide shots. Environmental storytelling through clues, foreshadowing, world-building.`,

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
- Moral is earned through action, not stated as a lesson

Age-adjusted companion rules:
- Tier 1 (2–3): Companion is simple presence — physical comedy only (falls down, gets wet, makes a mess). No verbal humor. Role should be "learning alongside" or "contrast character."
- Tier 2 (3–5): Companion shines as comic relief — failed mimicry, funny misunderstandings, personality moments. Clumsy sidekick archetype works best.
- Tier 3 (5–7): Companion can have a genuine mini-arc and play a plot-functional role (helps solve the problem). Verbal humor begins to work alongside physical comedy. Running gags pay off well.
- Tier 4 (7+): Companion needs genuine depth — own wants, own arc, can challenge or disagree with the protagonist. Add "equal partner" and "challenger" as role options alongside comic relief.`,

  storyStructure: `Book structure:
- Total page count is variable (16-24, default 22): 5 fixed square pages (Cover, Inside Left, Inside Right, Closing, Back Cover) + variable spreads
- Minimum 5 image-only pages for pacing (adjust based on text_density setting)
- Each page = ONE drawable scene. Cannot describe multiple sequential actions.
- Nothing important in the center of spread pages — that's the fold line
- Page 1 (Cover) = book title + cover scene image ONLY — no story text. The cover is image_only: true always.
- Story text begins on page 2 (Inside Left). By page 4 the main action should be underway.
- Second-to-last page (Closing) IS part of the story — emotional resolution, not throwaway
- Last page (Back Cover) — warm closing image, typically no text
- Scene transitions must be logical — no random location jumps between pages

Story pacing:
- Pages 1-2 are setup/introduction only — establish the character and world
- The main action/adventure MUST begin by page 3-4 at the latest
- Story climax should resolve at least 2 pages before the end
- Resolution after climax is brief — 1-2 pages MAX. No extended "what I learned" monologues, no dream sequences, no long reflections about the day
- Every page should advance the plot or develop character — if a page could be removed without losing anything, cut it

Pattern-specific rules (if structural pattern or hybrid):
- Vary delivery: explicit early, then implied as familiarity grows
- Rhythm: 2-3 content pages → 1 break page (humor/reaction/quiet moment)
- Pattern should feel present but not monotonous
- Break pages interrupt pattern for surprise and breathing room

Motifs:
- Consider a recurring phrase at 3-4 key emotional moments
- Don't overuse — place at moments of wonder, connection, farewell
- Full circle: opening and closing should connect

Age-tier structure defaults (auto-applied if no selection):
- Tier 1 (2–3): Pure pattern
- Tier 2 (3–5): Hybrid
- Tier 3 (5–7): Story with arc
- Tier 4 (7+): Story with arc (pattern not recommended)

Story direction rules:
- EVERY story must have a clearly defined direction — even "pure exploration" has a purpose per page
- When generating outline, EVERY page must state its narrative purpose (setup, escalation, climax beat, resolution, etc.)
- If the story combines educational elements (e.g., basketball skills) with emotional themes (e.g., teamwork), the outline must specify which element each page advances
- The direction should be visible in each page description — a reader should understand the story's trajectory from the outline alone

Age-tier story direction guidance:
- Tier 1: Default to "Pure exploration / discovery" — toddlers explore, they don't overcome
- Tier 2: All directions work; "Learning something new" and "Pure exploration" are strongest
- Tier 3: "Overcoming a challenge" and "Emotional growth" become strong defaults
- Tier 4: Full range including relationship navigation and moral complexity

Age Tier Quick Reference:
| Dimension | Tier 1 (2–3) | Tier 2 (3–5) | Tier 3 (5–7) | Tier 4 (7+) |
| Total Words | 50–150 | 150–350 | 300–500 | 500–1,000+ |
| Max Lines/Page | 2 | 4 | 5 | 6–8 |
| Syllables/Line | 5–7 | 8–10 | 8–12 | Natural prose |
| Image-Only Pages | 8–12 | 5–7 | 3–5 | 2–3 |
| Default Structure | Pure pattern | Hybrid | Arc | Arc + subplot |
| Default Rhyme | AABB | ABCB | ABCB or prose | Prose |
| Moral Delivery | None | Demonstrated | Slightly visible | Earned |
| Companion Depth | Simple presence | Comic relief | Mini-arc | Own arc |
| Language Ceiling | Concrete nouns only | Simple + 2–3 stretch words | Richer vocab, similes | Literary, figurative |
| Dialogue | None | Simple exclamations | Personality-carrying | Character-distinct |
| Internal Thoughts | No | No | Simple ("Max wondered…") | Full internal monologue |
| Emotional Range | Happy, sad, surprised | + curious, proud, nervous | + conflicted, determined | + morally complex |
| Illustration Style | Simple, bold, 1 focal point | Richer environments | Sophisticated, varied angles | Cinematic, detailed |

Tier Selection Logic:
1. User selects a target age range (e.g., "3–5" or "5–7")
2. Map to the matching tier
3. If range spans two tiers (e.g., "3–7"), use the LOWER tier — always write for the youngest reader
4. Apply all tier defaults automatically
5. User can override any individual default during clarification`,

  qualityChecklist: [
    // Layout
    "All pages present with correct format assignments (5 square + variable spreads)",
    "Page types correct",
    "Image-only page count matches density preference",
    // Text (tier-aware)
    "Total word count within target range for selected age tier",
    "No page exceeds max lines for tier (2 for Tier 1, 4 for Tier 2, 5 for Tier 3, 6–8 for Tier 4)",
    "Syllable count matches tier (5–7 / 8–10 / 8–12 / natural prose)",
    "No rhymes use character names",
    "Rhymes feel natural, not forced",
    "Language complexity matches tier — no abstract concepts in Tier 1, no figurative language below Tier 3",
    "If Tier 1: all text uses present tense, concrete nouns, and repetitive structure",
    "If Tier 4: prose has distinct voice, dialogue sounds natural, internal thoughts feel earned",
    // Story (tier-aware)
    "Moral delivery matches tier (none for Tier 1, demonstrated for Tier 2, slightly visible for Tier 3, earned through struggle for Tier 4)",
    "Ending warm and complete",
    "If pattern: felt but not monotonous, with effective breaks",
    "If arc: clear want → obstacle → resolution",
    "If Tier 3–4: character faces a genuine decision or dilemma at the climax",
    "If Tier 4: stakes feel meaningful, resolution is satisfying but not predictable",
    "Transitions between pages are logical",
    "Main action begins by page 3-4 (pages 1-2 are setup only)",
    "Climax resolves at least 2 pages before the end",
    "Resolution after climax is brief (1-2 pages max, no extended monologues)",
    "Cover page (page 1) has no story text — title and cover scene only",
    "Structure type matches tier recommendation (pure pattern for Tier 1, hybrid for Tier 2, arc for Tier 3–4)",
    // Companion
    "3+ companion personality moments",
    "1+ companion comedy beat",
    "Companion feels like a real character, not a prop",
    "Companion appears on every page",
    // Image prompts
    "Every prompt includes full character descriptions",
    "Recurring secondary characters described consistently across all prompts (same hair, clothes, features)",
    "Every prompt describes ONE drawable scene",
    "Face visibility clear on all appearances (max 90% profile, three-quarter view default)",
    "Faces completely unobstructed — no hands, hair, objects, or shadows blocking face",
    "No important elements in center of spreads",
    "Characters/figures placed in left or right third of spreads — never in the middle third (book seam)",
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

// Quality checklist items grouped by the step where they should be checked
export function getChecklistForStep(step, checklist, hasCompanion) {
  const items = checklist || DEFAULT_RULES.qualityChecklist;
  const filtered = hasCompanion ? items : items.filter(i => !i.toLowerCase().includes("companion"));

  // Keywords that match checklist items to each step
  const matchers = {
    outline: [
      "22 images present", "Page types correct", "Image-only page count",
      "Structure type matches", "Transitions between pages",
      "Main action begins", "Climax resolves", "Resolution after climax", "Cover page",
    ],
    text: [
      "word count", "max lines", "Syllable count", "rhymes use character names",
      "Rhymes feel natural", "Language complexity", "Tier 1:", "Tier 4: prose",
      "Moral delivery", "Ending warm", "pattern: felt but", "arc: clear want",
      "genuine decision", "Tier 4: stakes",
      "companion personality", "companion comedy", "Companion feels like", "Companion appears",
    ],
    prompts: [
      "character descriptions", "consistently across", "ONE drawable scene", "Face visibility",
      "center of spreads", "panoramic image", "seam", "Art style keywords",
      "Aspect ratios", "Characters small", "Visual variety", "wow", "age-appropriate",
    ],
  };

  const keys = matchers[step];
  if (!keys) return [];
  return filtered.filter(item => keys.some(k => item.toLowerCase().includes(k.toLowerCase())));
}

// Which rule sections are relevant to each step — PRD section 5.3
export const STEP_RULES = {
  brief: ["storyStructure", "companion", "customNotes"],
  concepts: ["storyStructure", "companion", "customNotes"],
  characters: ["character", "customNotes"],
  outline: ["storyStructure", "companion", "customNotes"],
  text: ["writing", "rhyme", "companion", "customNotes"],
  prompts: ["imagePrompt", "character", "bannedWords", "customNotes"],
};

export const SECTION_LABELS = {
  writing: "Writing Rules",
  rhyme: "Rhyme Rules",
  character: "Character Rules",
  imagePrompt: "Image Prompt Rules",
  bannedWords: "Banned Words",
  companion: "Companion Rules",
  storyStructure: "Story Structure",
  customNotes: "Additional Notes",
};

// Assemble the system prompt for a given step
// opts.hasCompanion — only include companion rules when the character setup has a companion
export function assembleSystemPrompt(rules, step, opts = {}) {
  let sections = STEP_RULES[step] || Object.keys(STEP_RULES).flatMap(k => STEP_RULES[k]).filter((v, i, a) => a.indexOf(v) === i);

  // Only include companion rules when the character setup includes a companion
  if (!opts.hasCompanion) {
    sections = sections.filter(s => s !== "companion");
  }

  let prompt = HARDCODED_PREAMBLE;

  for (const key of sections) {
    const label = SECTION_LABELS[key];
    if (!label) continue;

    let content;
    if (key === "bannedWords") {
      const words = rules.bannedWords || DEFAULT_RULES.bannedWords;
      content = "NEVER use these words/phrases in image prompts: " + words.join(", ");
    } else {
      content = rules[key];
    }

    // Strip companion/sidekick instructions from character rules when no companion
    if (key === "character" && !opts.hasCompanion && content) {
      content = content.replace(/\n*Companion\/sidekick:[\s\S]*$/, "");
    }

    if (content && content.trim()) {
      prompt += `\n\n=== ${label} ===\n${content}`;
    }
  }

  return prompt;
}

// Validation: scan text for banned words
// Ignores negated usage like "nothing in center", "not in the center", "avoid center"
export function findBannedWords(text, bannedWords) {
  const lower = text.toLowerCase();
  return (bannedWords || DEFAULT_RULES.bannedWords).filter(w => {
    const wl = w.toLowerCase();
    if (!lower.includes(wl)) return false;
    // Check if every occurrence is negated (preceded by "no ", "not ", "nothing ", "never ", "avoid ")
    const negators = /(?:no|not|nothing|never|avoid|without|don't|doesn't)\s+(?:\w+\s+){0,3}/gi;
    const negated = [...lower.matchAll(new RegExp(negators.source + wl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi"))];
    const all = [...lower.matchAll(new RegExp(wl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi"))];
    // If every occurrence is negated, it's fine
    return negated.length < all.length;
  });
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
