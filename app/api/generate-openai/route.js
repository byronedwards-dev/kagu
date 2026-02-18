// POST /api/generate-openai
// Generates images via OpenAI GPT Image API
// Body: { prompt, size?, quality?, model? }
//
// Models: "gpt-image-1" (default)
// Sizes: "1024x1024", "1024x1536" (portrait), "1536x1024" (landscape)
// Quality: "low", "medium", "high" (default: "medium")
//
// Docs: https://platform.openai.com/docs/api-reference/images/create

export async function POST(request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "OPENAI_API_KEY not configured. Get one at https://platform.openai.com/api-keys" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: body.model || "gpt-image-1",
        prompt: body.prompt,
        n: 1,
        size: body.size || "1024x1024",
        quality: body.quality || "medium",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: err.error?.message || `OpenAI API error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // GPT Image models always return base64
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json(
        { error: "No image returned from OpenAI" },
        { status: 422 }
      );
    }

    return Response.json({
      success: true,
      model: body.model || "gpt-image-1",
      image_base64: b64,
      mime_type: "image/png",
      image_data_url: `data:image/png;base64,${b64}`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
