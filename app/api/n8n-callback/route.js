// POST /api/n8n-callback?job_id=xxx
// Called by n8n when images are ready (can be called once with all results,
// or multiple times as individual pages complete).
// Accepts multiple formats:
//   { results: { "0": { variants: [{ url, model }] }, ... } }
//   { page_index: 0, url: "...", model: "..." }
//   [{ page_index: 0, url: "...", model: "..." }, ...]
//
// Each page result is written as a separate blob (write-once, no overwrites).

import { getJob, addPageResult, cleanOldJobs } from "@/lib/jobStore";
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

  // Quick check that job exists
  const job = await getJob(jobId);
  if (!job) {
    console.error(`[n8n-callback] Job ${jobId} not found`);
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  try {
    const body = await request.json();
    console.log(`[n8n-callback] job=${jobId} body_keys=${Object.keys(body)} isArray=${Array.isArray(body)}`);

    // Collect page results: { pageIdx: [{ url, model }] }
    const pageResults = {};

    // Support bulk results: { results: { "0": { variants: [{ url, model }] }, ... } }
    if (body.results) {
      for (const [idxStr, result] of Object.entries(body.results)) {
        const idx = parseInt(idxStr, 10);
        if (!pageResults[idx]) pageResults[idx] = [];
        for (const v of (result.variants || [])) {
          const blobUrl = await uploadImageToBlob(v.url, blobFilename(idx, v.model));
          pageResults[idx].push({ url: blobUrl, model: v.model || "unknown" });
        }
      }
    }

    // Support single page callback: { page_index, url, model }
    if (body.page_index !== undefined && body.url) {
      const idx = body.page_index;
      if (!pageResults[idx]) pageResults[idx] = [];
      const blobUrl = await uploadImageToBlob(body.url, blobFilename(idx, body.model));
      pageResults[idx].push({ url: blobUrl, model: body.model || "unknown" });
    }

    // Support array of results: [{ page_index, url, model }, ...]
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.page_index !== undefined && item.url) {
          const idx = item.page_index;
          if (!pageResults[idx]) pageResults[idx] = [];
          const blobUrl = await uploadImageToBlob(item.url, blobFilename(idx, item.model));
          pageResults[idx].push({ url: blobUrl, model: item.model || "unknown" });
        }
      }
    }

    const pages = Object.keys(pageResults);
    if (pages.length === 0) {
      console.warn(`[n8n-callback] No results parsed! body: ${JSON.stringify(body).slice(0, 500)}`);
      return Response.json({ ok: true, warning: "no results parsed", completedPages: job.completedPages, totalPages: job.totalPages });
    }

    // Write each page as a separate blob (write-once, no overwrites, no race conditions)
    for (const [idxStr, variants] of Object.entries(pageResults)) {
      const idx = parseInt(idxStr, 10);
      console.log(`[n8n-callback] Writing page ${idx} with ${variants.length} variant(s)`);
      await addPageResult(jobId, idx, variants);
    }

    // Re-read to get current completedPages count
    const updated = await getJob(jobId);
    const cp = updated?.completedPages || 0;
    const tp = updated?.totalPages || job.totalPages;
    console.log(`[n8n-callback] After write: completedPages=${cp} totalPages=${tp} status=${updated?.status}`);

    // Occasionally clean old jobs
    if (Math.random() < 0.1) cleanOldJobs();

    return Response.json({ ok: true, completedPages: cp, totalPages: tp });
  } catch (err) {
    console.error(`[n8n-callback] Error:`, err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
