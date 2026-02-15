// Storage utilities — localStorage wrapper + state versioning
// Extracted from api.js and extended with state snapshot support

export const storage = {
  async get(key) {
    if (typeof window === "undefined") return null;
    try {
      const v = localStorage.getItem(key);
      return v ? { key, value: v } : null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    if (typeof window === "undefined") return null;
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch {
      return null;
    }
  },
  async delete(key) {
    if (typeof window === "undefined") return null;
    try {
      localStorage.removeItem(key);
      return { key, deleted: true };
    } catch {
      return null;
    }
  },
  async list(prefix) {
    if (typeof window === "undefined") return { keys: [] };
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    } catch {
      return { keys: [] };
    }
  },
};

// Generate a unique state ID
function genStateId(label) {
  const slug = (label || "state")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  return `${slug}-${Date.now().toString(36)}`;
}

// Save a state snapshot
export async function saveState(state, label, parentStateId) {
  const stateId = genStateId(label);
  const snapshot = {
    state_id: stateId,
    parent_state_id: parentStateId || null,
    label: label || "Untitled",
    created_at: new Date().toISOString(),
    state,
  };
  await storage.set(`state:${stateId}`, JSON.stringify(snapshot));
  return snapshot;
}

// Load a state snapshot by ID
export async function loadState(stateId) {
  const r = await storage.get(`state:${stateId}`);
  if (!r) return null;
  try {
    return JSON.parse(r.value);
  } catch {
    return null;
  }
}

// List all state snapshots
export async function listStates() {
  const { keys } = await storage.list("state:");
  const states = [];
  for (const key of keys) {
    try {
      const r = await storage.get(key);
      if (r) {
        const parsed = JSON.parse(r.value);
        states.push({
          state_id: parsed.state_id,
          parent_state_id: parsed.parent_state_id,
          label: parsed.label,
          created_at: parsed.created_at,
        });
      }
    } catch {}
  }
  states.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return states;
}

// Determine which pages are dirty after a change
export function computeDirtyPages(changePath) {
  // Book-level or character-level changes → all 22 dirty
  if (changePath.startsWith("book.") || changePath.startsWith("characters.")) {
    return Array.from({ length: 22 }, (_, i) => i);
  }
  // Page-level change → only that page
  const match = changePath.match(/^pages\[(\d+)\]/);
  if (match) {
    return [parseInt(match[1], 10)];
  }
  // Unknown → all dirty
  return Array.from({ length: 22 }, (_, i) => i);
}
