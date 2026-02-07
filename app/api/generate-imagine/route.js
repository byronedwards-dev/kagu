// POST /api/generate-imagine
// Generates images via ImagineArt (Vyro) API
// Body: { prompt, aspect_ratio?, style? }
//
// NOTE: ImagineArt API has limited model access compared to web UI.
// "Imagine Pro" as used in the web UI is NOT directly available as an API style.
// Available styles: "realistic", "anime", "flux-schnell", "flux-dev", "imagine-turbo"
//
// Docs: https://platform.imagine.art/

export async function POST(request) {
  const key = process.env.IMAGINE_API_KEY;
  if (!key) {
    return Response.json(
      { error: "IMAGINE_API_KEY not configured. Get one at https://platform.imagine.art/" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // ImagineArt uses form data, not JSON
    const formData = new FormData();
    formData.append("prompt", body.prompt);
    formData.append("style", body.style || "realistic");
    formData.append("aspect_ratio", body.aspect_ratio || "1:1");
    formData.append("variation", String(body.variation || 1));
    if (body.seed != null) formData.append("seed", String(body.seed));

    const res = await fetch("https://api.vyro.ai/v2/image/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return Response.json(
        { error: `ImagineArt API error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    // ImagineArt returns binary image data
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return Response.json({
      success: true,
      model: body.style || "realistic",
      image_base64: base64,
      mime_type: "image/png",
      image_data_url: `data:image/png;base64,${base64}`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
