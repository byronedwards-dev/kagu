// GET /api/n8n-status?job_id=xxx
// Polls n8n for generation job status
// Response matches PRD section 6.2

export async function GET(request) {
  const envUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return Response.json({ error: "job_id is required" }, { status: 400 });
    }

    // Derive status URL from webhook URL
    // Convention: webhook URL ends with /kagu-generate, status URL ends with /kagu-status
    let statusUrl = envUrl;
    if (!statusUrl) {
      return Response.json(
        { error: "n8n webhook URL not configured" },
        { status: 500 }
      );
    }

    statusUrl = statusUrl.replace(/\/kagu-generate$/, "/kagu-status");
    statusUrl = `${statusUrl}?job_id=${encodeURIComponent(jobId)}`;

    const res = await fetch(statusUrl, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return Response.json(
        { error: `n8n status error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
