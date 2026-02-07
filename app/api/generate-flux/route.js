// POST /api/generate-flux
// Generates images via Black Forest Labs Flux API
// Body: { prompt, width?, height?, model? }
//
// Flux API is async: submit → poll → return image URL
// Models: "flux-2-pro" (default), "flux-2-max", "flux-pro-1.1", "flux-max"

const BFL_BASE = "https://api.bfl.ai/v1";

export async function POST(request) {
  const key = process.env.BFL_API_KEY;
  if (!key) {
    return Response.json(
      { error: "BFL_API_KEY not configured. Get one at https://api.bfl.ml/" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const model = body.model || "flux-2-pro";

    // Step 1: Submit generation request
    const submitRes = await fetch(`${BFL_BASE}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-key": key,
      },
      body: JSON.stringify({
        prompt: body.prompt,
        width: body.width || 1024,
        height: body.height || 1024,
        ...(body.seed != null && { seed: body.seed }),
      }),
    });

    if (!submitRes.ok) {
      const err = await submitRes.json().catch(() => ({}));
      return Response.json(
        { error: err.detail || err.message || `Flux submit failed (${submitRes.status})` },
        { status: submitRes.status }
      );
    }

    const { id } = await submitRes.json();
    if (!id) {
      return Response.json({ error: "No task ID returned" }, { status: 500 });
    }

    // Step 2: Poll for result (max ~60 seconds)
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(`${BFL_BASE}/get_result?id=${id}`, {
        headers: { "x-key": key },
      });

      if (!pollRes.ok) continue;

      const result = await pollRes.json();

      if (result.status === "Ready") {
        return Response.json({
          success: true,
          model,
          image_url: result.result?.sample,
          seed: result.result?.seed,
          task_id: id,
        });
      }

      if (result.status === "Error") {
        return Response.json(
          { error: result.result || "Generation failed" },
          { status: 500 }
        );
      }

      // Still "Pending" or "Processing" — keep polling
    }

    return Response.json(
      { error: "Timeout — generation took too long", task_id: id },
      { status: 504 }
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
