// POST /api/generate-gemini
// Generates images via Google Gemini image generation
// Body: { prompt, model? }
//
// Models:
//   "gemini-2.0-flash-preview-image-generation" = Nano Banana (fast)
//   "gemini-2.0-pro-preview-image-generation" = Nano Banana Pro (quality)
//
// Docs: https://ai.google.dev/gemini-api/docs/image-generation

export async function POST(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "GEMINI_API_KEY not configured. Get one at https://aistudio.google.com/apikey" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const model = body.model || "gemini-2.0-flash-preview-image-generation";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a children's book illustration: ${body.prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            // Gemini image gen doesn't support explicit aspect ratio in the same way;
            // aspect ratio is controlled by the prompt (mention "square" or "wide panoramic")
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        {
          error:
            err.error?.message ||
            `Gemini API error (${res.status})`,
        },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Extract image from response parts
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      // Gemini sometimes returns only text if it can't generate the image
      const textPart = parts.find((p) => p.text);
      return Response.json(
        {
          error:
            "No image generated. " +
            (textPart?.text || "Try simplifying the prompt."),
        },
        { status: 422 }
      );
    }

    // Return base64 image data
    // The client will need to display this as: data:image/png;base64,{data}
    return Response.json({
      success: true,
      model,
      image_base64: imagePart.inlineData.data,
      mime_type: imagePart.inlineData.mimeType || "image/png",
      // Build a data URL the client can use directly
      image_data_url: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
