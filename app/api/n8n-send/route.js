// POST /api/n8n-send
// Fire-and-forget: sends pages to n8n webhook, returns immediately with a job_id.
// n8n responds immediately (webhook set to "Immediately"), processes images async,
// then POSTs results back to /api/n8n-callback when done.

import { randomUUID } from "crypto";
import { setJob } from "@/lib/jobStore";

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

    // Store job to filesystem
    setJob(jobId, {
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

    // Fire and forget — don't await
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        callback_url: callbackUrl,
        mode: body.mode || "single",
        book: body.book || {},
        pages: body.pages || [],
      }),
    }).catch(err => {
      // Mark job as failed if webhook send fails
      const { updateJob } = require("@/lib/jobStore");
      updateJob(jobId, job => ({ ...job, status: "error", error: err.message }));
    });

    // Return immediately with job_id
    return Response.json({ job_id: jobId, status: "processing", totalPages: pageIndices.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
