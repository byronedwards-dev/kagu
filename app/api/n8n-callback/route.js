// POST /api/n8n-callback?job_id=xxx
// Called by n8n when images are ready (can be called once with all results,
// or multiple times as individual pages complete).
// Accepts multiple formats:
//   { results: { "0": { variants: [{ url, model }] }, ... } }
//   { page_index: 0, url: "...", model: "..." }
//   [{ page_index: 0, url: "...", model: "..." }, ...]
//
// Images are uploaded to Vercel Blob for persistent CDN storage.
// Falls back to original URLs if BLOB_READ_WRITE_TOKEN is not configured.

import { getJob, setJob, cleanOldJobs } from "@/lib/jobStore";
import { uploadImageToBlob } from "@/lib/blobUpload";

function blobFilename(pageIndex, model) {
  const ts = Date.now();
  const safeModel = (model || "unknown").replace(/[^a-z0-9-]/gi, "-");
  return `kagu/page-${pageIndex}-${safeModel}-${ts}.png`;
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return Response.json({ error: "job_id required" }, { status: 400 });
  }

  const job = await getJob(jobId);
  if (!job) {
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  try {
    const body = await request.json();

    // Support bulk results: { results: { "0": { variants: [...] }, ... } }
    if (body.results) {
      for (const [idxStr, result] of Object.entries(body.results)) {
        const idx = parseInt(idxStr, 10);
        if (!job.results[idx]) job.results[idx] = { variants: [] };
        for (const v of (result.variants || [])) {
          const blobUrl = await uploadImageToBlob(v.url, blobFilename(idx, v.model));
          job.results[idx].variants.push({ url: blobUrl, model: v.model || "unknown" });
        }
      }
    }

    // Support single page callback: { page_index, url, model }
    if (body.page_index !== undefined && body.url) {
      const idx = body.page_index;
      if (!job.results[idx]) {
        job.results[idx] = { variants: [] };
      }
      const blobUrl = await uploadImageToBlob(body.url, blobFilename(idx, body.model));
      job.results[idx].variants.push({ url: blobUrl, model: body.model || "unknown" });
    }

    // Support array of results: [{ page_index, url, model }, ...]
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.page_index !== undefined && item.url) {
          const idx = item.page_index;
          if (!job.results[idx]) {
            job.results[idx] = { variants: [] };
          }
          const blobUrl = await uploadImageToBlob(item.url, blobFilename(idx, item.model));
          job.results[idx].variants.push({ url: blobUrl, model: item.model || "unknown" });
        }
      }
    }

    job.completedPages = Object.keys(job.results).length;

    // Mark as done if all pages are in
    if (job.completedPages >= job.totalPages) {
      job.status = "done";
    }

    // Save updated job
    await setJob(jobId, job);

    // Occasionally clean old jobs
    if (Math.random() < 0.1) cleanOldJobs();

    return Response.json({ ok: true, completedPages: job.completedPages, totalPages: job.totalPages });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
