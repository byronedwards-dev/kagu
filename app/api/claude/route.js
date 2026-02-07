// POST /api/claude
// Proxies requests to Anthropic Messages API
// Body: { model?, system, messages, max_tokens? }

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 4096,
        system: body.system || "",
        messages: body.messages || [],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data.error?.message || "Anthropic API error" },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
