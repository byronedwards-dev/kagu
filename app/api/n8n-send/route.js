// POST /api/n8n-send
// Proxies image generation requests to n8n webhook
// Body matches PRD section 6.1: { mode, state_id?, label?, book, characters?, pages, dirty_pages?, fork_source? }

export async function POST(request) {
  // Try env var first, fall back to body-provided URL
  const envUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

  try {
    const body = await request.json();
    const webhookUrl = envUrl || body.webhook_url;

    if (!webhookUrl) {
      return Response.json(
        { error: "n8n webhook URL not configured. Set N8N_WEBHOOK_URL in .env.local or in Settings." },
        { status: 500 }
      );
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: body.mode || "single",
        state_id: body.state_id,
        label: body.label,
        book: body.book || {},
        characters: body.characters || {},
        pages: body.pages || [],
        dirty_pages: body.dirty_pages || [],
        fork_source: body.fork_source || null,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return Response.json(
        { error: `n8n webhook error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
