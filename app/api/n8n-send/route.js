// POST /api/n8n-send
// Sends pages to n8n webhook and returns immediately with a job_id.
// n8n webhook should be set to "Respond Immediately".
// n8n processes images async, then POSTs results back to /api/n8n-callback.

import { randomUUID } from "crypto";
import { setJob, updateJob } from "@/lib/jobStore";

export async function POST(request) {
  const envUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

  try {
    const body = await request.json();
    const webhookUrl = body.webhook_url || envUrl;

    if (!webhookUrl) {
      return Response.json(
        { error: "n8n webhook URL not configured. Set N8N_WEBHOOK_URL in .env.local or in Settings." },
        { status: 500 }
      );
    }

    // Generate a unique job ID
    const jobId = randomUUID();
    const pageIndices = (body.pages || []).map(p => p.page_index);

    // Store job (Blob + filesystem)
    await setJob(jobId, {
      status: "processing",
      created: Date.now(),
      totalPages: pageIndices.length,
      completedPages: 0,
      results: {},
    });

    // Determine the callback URL for n8n to POST results back to
    const host = request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const callbackUrl = `${proto}://${host}/api/n8n-callback?job_id=${jobId}`;

    // Send to n8n — await the initial response but don't wait for processing
    // n8n responds immediately, then processes in background
    try {
      const n8nRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          callback_url: callbackUrl,
          mode: body.mode || "single",
          book: body.book || {},
          pages: body.pages || [],
        }),
      });

      if (!n8nRes.ok) {
        const errText = await n8nRes.text().catch(() => "");
        await updateJob(jobId, job => ({ ...job, status: "error", error: `n8n returned ${n8nRes.status}: ${errText}` }));
      }
    } catch (err) {
      await updateJob(jobId, job => ({ ...job, status: "error", error: err.message }));
    }

    // Return with job_id (even if n8n had an error, frontend will pick it up via polling)
    return Response.json({ job_id: jobId, status: "processing", totalPages: pageIndices.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
