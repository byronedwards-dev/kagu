// Client-side API helpers
// All calls go through Next.js API routes (no CORS issues, keys stay server-side)

export async function callClaude(messages, systemPrompt, signal) {
  const res = await fetch("/api/claude", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content?.map((b) => b.text || "").join("") || "";
}

/**
 * Generate an image using one of the supported models.
 * Returns: { success, image_url?, image_data_url?, model, error? }
 */
export async function generateImage({ model, prompt, aspectRatio, signal }) {
  const routeMap = {
    "flux-2-pro": "/api/generate-flux",
    "flux-pro": "/api/generate-flux",
    "flux-pro-1.1": "/api/generate-flux",
    "flux-max": "/api/generate-flux",
    "flux-klein": "/api/generate-flux",
    ideogram: "/api/generate-ideogram",
    "ideogram-quality": "/api/generate-ideogram",
    gemini: "/api/generate-gemini",
    "gemini-pro": "/api/generate-gemini",
    "imagine-realistic": "/api/generate-imagine",
    "imagine-turbo": "/api/generate-imagine",
  };

  const route = routeMap[model];
  if (!route) throw new Error(`Unknown model: ${model}`);

  // Map aspect ratios: our format → what each API expects
  const bodyForModel = () => {
    switch (model) {
      case "flux-2-pro":
        return {
          prompt,
          model: "flux-2-pro",
          width: aspectRatio === "1:1" ? 1024 : 2048,
          height: 1024,
        };
      case "flux-pro":
        return {
          prompt,
          model: "flux-pro-1.1",
          width: aspectRatio === "1:1" ? 1024 : 2048,
          height: 1024,
        };
      case "flux-pro-1.1":
        return {
          prompt,
          model: "flux-pro-1.1",
          width: aspectRatio === "1:1" ? 1024 : 2048,
          height: 1024,
        };
      case "flux-max":
        return {
          prompt,
          model: "flux-2-max",
          width: aspectRatio === "1:1" ? 1024 : 2048,
          height: 1024,
        };
      case "flux-klein":
        return {
          prompt,
          model: "flux-2-klein-9b",
          width: aspectRatio === "1:1" ? 1024 : 2048,
          height: 1024,
        };
      case "ideogram":
        return {
          prompt,
          aspect_ratio: aspectRatio || "1:1",
          rendering_speed: "DEFAULT",
        };
      case "ideogram-quality":
        return {
          prompt,
          aspect_ratio: aspectRatio || "1:1",
          rendering_speed: "QUALITY",
        };
      case "gemini":
        return {
          prompt:
            aspectRatio === "1:1"
              ? `Square format image. ${prompt}`
              : `Wide panoramic format image. ${prompt}`,
          model: "gemini-2.5-flash-image",
        };
      case "gemini-pro":
        return {
          prompt:
            aspectRatio === "1:1"
              ? `Square format image. ${prompt}`
              : `Wide panoramic format image. ${prompt}`,
          model: "gemini-2.5-pro-image",
        };
      case "imagine-realistic":
        return { prompt, aspect_ratio: aspectRatio || "1:1", style: "realistic" };
      case "imagine-turbo":
        return { prompt, aspect_ratio: aspectRatio || "1:1", style: "imagine-turbo" };
      default:
        return { prompt };
    }
  };

  const res = await fetch(route, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyForModel()),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Model tiers for UI grouping
export const MODEL_TIERS = [
  { id: "speed", label: "Speed", description: "Fast & cheap — drafts and iteration" },
  { id: "balance", label: "Balance", description: "Best quality-to-cost ratio" },
  { id: "quality", label: "Quality", description: "Premium output — final renders" },
];

// Model metadata for UI (ordered by tier)
export const IMAGE_MODELS = [
  // Speed
  {
    id: "flux-klein",
    name: "Flux Klein 9B",
    provider: "Black Forest Labs",
    tier: "speed",
    best_for: "Quick drafts, cost-efficient batches",
    cost: "$0.015+$0.002/MP",
  },
  {
    id: "gemini",
    name: "Gemini Flash",
    provider: "Google Gemini",
    tier: "speed",
    best_for: "Quick drafts and testing",
    cost: "~$0.02/image",
  },
  // Balance
  {
    id: "flux-2-pro",
    name: "Flux.2 Pro",
    provider: "Black Forest Labs",
    tier: "balance",
    best_for: "Most books — current winner",
    cost: "from $0.03/MP",
  },
  {
    id: "ideogram",
    name: "Ideogram V3",
    provider: "Ideogram",
    tier: "balance",
    best_for: "Stylized looks, text-heavy covers",
    cost: "~$0.04/image",
  },
  {
    id: "imagine-realistic",
    name: "ImagineArt Realistic",
    provider: "ImagineArt/Vyro",
    tier: "balance",
    best_for: "Fallback photorealistic",
    cost: "~$0.03/image",
  },
  // Quality
  {
    id: "flux-max",
    name: "Flux Max",
    provider: "Black Forest Labs",
    tier: "quality",
    best_for: "Premium outputs, complex scenes",
    cost: "from $0.07/MP",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google Gemini",
    tier: "quality",
    best_for: "Warm, emotional scenes",
    cost: "~$0.04/image",
  },
  {
    id: "ideogram-quality",
    name: "Ideogram V3 Quality",
    provider: "Ideogram",
    tier: "quality",
    best_for: "Final renders",
    cost: "~$0.08/image",
  },
];

// Simple localStorage-based session storage for Next.js
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
