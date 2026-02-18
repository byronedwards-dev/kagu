// POST /api/generate-ideogram
// Generates images via Ideogram V3 API
// Body: { prompt, aspect_ratio?, rendering_speed? }
//
// V3 Docs: https://developer.ideogram.ai/api-reference/api-reference/generate-v3
// V3 uses multipart/form-data and a different endpoint than V2

export async function POST(request) {
  const key = process.env.IDEOGRAM_API_KEY;
  if (!key) {
    return Response.json(
      { error: "IDEOGRAM_API_KEY not configured. Get one at https://developer.ideogram.ai/" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // V3 uses simpler aspect ratio format: "1x1", "2x1", "16x9", etc.
    // Kagu "1:2" means 1-high-by-2-wide (landscape spread) → Ideogram "2x1"
    const ratioMap = {
      "1:1": "1x1",
      "1:2": "2x1",
      "2:1": "1x2",
      "16:9": "16x9",
      "9:16": "9x16",
      "3:2": "3x2",
      "2:3": "2x3",
      "3:4": "3x4",
      "4:3": "4x3",
      "4:5": "4x5",
      "5:4": "5x4",
    };

    // Build multipart/form-data
    const formData = new FormData();
    formData.append("prompt", body.prompt);
    formData.append("aspect_ratio", ratioMap[body.aspect_ratio] || "1x1");
    formData.append("rendering_speed", body.rendering_speed || "DEFAULT");
    formData.append("magic_prompt", body.magic_prompt !== false ? "AUTO" : "OFF");
    formData.append("num_images", String(body.num_images || 1));

    if (body.negative_prompt) {
      formData.append("negative_prompt", body.negative_prompt);
    }
    if (body.seed != null) {
      formData.append("seed", String(body.seed));
    }

    const res = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
      method: "POST",
      headers: {
        "Api-Key": key,
        // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: err.message || err.detail || `Ideogram V3 API error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // V3 response: { created, data: [{ url, prompt, resolution, seed, ... }] }
    const images = (data.data || []).map((img) => ({
      image_url: img.url,
      prompt: img.prompt,
      seed: img.seed,
      resolution: img.resolution,
    }));

    return Response.json({
      success: true,
      model: "V3",
      images,
      image_url: images[0]?.image_url,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
