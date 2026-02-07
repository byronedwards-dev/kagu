// POST /api/generate-ideogram
// Generates images via Ideogram V3 API
// Body: { prompt, aspect_ratio?, model?, rendering_speed? }
//
// Docs: https://developer.ideogram.ai/api-reference/generate-image

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

    // Map our aspect ratios to Ideogram's enum values
    const ratioMap = {
      "1:1": "ASPECT_1_1",
      "1:2": "ASPECT_1_2",     // For spread pages
      "2:1": "ASPECT_2_1",
      "16:9": "ASPECT_16_9",
      "9:16": "ASPECT_9_16",
      "3:2": "ASPECT_3_2",
      "2:3": "ASPECT_2_3",
    };

    const res = await fetch("https://api.ideogram.ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": key,
      },
      body: JSON.stringify({
        image_request: {
          prompt: body.prompt,
          model: body.model || "V_2A",  // V_2A is latest stable; V_3 when available
          aspect_ratio: ratioMap[body.aspect_ratio] || "ASPECT_1_1",
          rendering_speed: body.rendering_speed || "DEFAULT", // TURBO, DEFAULT, QUALITY
          magic_prompt_option: body.magic_prompt !== false ? "AUTO" : "OFF",
          num_images: body.num_images || 1,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: err.message || err.detail || `Ideogram API error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Ideogram returns { data: [{ url, prompt, ... }] }
    const images = (data.data || []).map((img) => ({
      image_url: img.url,
      prompt: img.prompt,
      seed: img.seed,
    }));

    return Response.json({
      success: true,
      model: body.model || "V_2A",
      images,
      image_url: images[0]?.image_url,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
