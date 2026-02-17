// POST /api/n8n-callback?job_id=xxx
// Called by n8n when images are ready (can be called once with all results,
// or multiple times as individual pages complete).
// Accepts multiple formats:
//   { results: { "0": { variants: [{ url, model }] }, ... } }
//   { page_index: 0, url: "...", model: "..." }
//   [{ page_index: 0, url: "...", model: "..." }, ...]

import { getJob, setJob, cleanOldJobs } from "@/lib/jobStore";

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return Response.json({ error: "job_id required" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  try {
    const body = await request.json();

    // Support bulk results: { results: { "0": { variants: [...] }, ... } }
    if (body.results) {
      for (const [idxStr, result] of Object.entries(body.results)) {
        const idx = parseInt(idxStr, 10);
        job.results[idx] = result;
      }
    }

    // Support single page callback: { page_index, url, model }
    if (body.page_index !== undefined && body.url) {
      const idx = body.page_index;
      if (!job.results[idx]) {
        job.results[idx] = { variants: [] };
      }
      job.results[idx].variants.push({ url: body.url, model: body.model || "unknown" });
    }

    // Support array of results: [{ page_index, url, model }, ...]
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.page_index !== undefined && item.url) {
          const idx = item.page_index;
          if (!job.results[idx]) {
            job.results[idx] = { variants: [] };
          }
          job.results[idx].variants.push({ url: item.url, model: item.model || "unknown" });
        }
      }
    }

    job.completedPages = Object.keys(job.results).length;

    // Mark as done if all pages are in
    if (job.completedPages >= job.totalPages) {
      job.status = "done";
    }

    // Save updated job
    setJob(jobId, job);

    // Occasionally clean old jobs
    if (Math.random() < 0.1) cleanOldJobs();

    return Response.json({ ok: true, completedPages: job.completedPages, totalPages: job.totalPages });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
