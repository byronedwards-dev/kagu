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

import { getJob, mergeJobResults, cleanOldJobs } from "@/lib/jobStore";
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
    console.error(`[n8n-callback] Job ${jobId} not found`);
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  try {
    const body = await request.json();
    console.log(`[n8n-callback] job=${jobId} body_keys=${Object.keys(body)} isArray=${Array.isArray(body)}`);

    // Collect all new results into a normalized map: { pageIdx: { variants: [...] } }
    const newResults = {};

    // Support bulk results: { results: { "0": { variants: [...] }, ... } }
    if (body.results) {
      for (const [idxStr, result] of Object.entries(body.results)) {
        const idx = parseInt(idxStr, 10);
        if (!newResults[idx]) newResults[idx] = { variants: [] };
        for (const v of (result.variants || [])) {
          const blobUrl = await uploadImageToBlob(v.url, blobFilename(idx, v.model));
          newResults[idx].variants.push({ url: blobUrl, model: v.model || "unknown" });
        }
      }
    }

    // Support single page callback: { page_index, url, model }
    if (body.page_index !== undefined && body.url) {
      const idx = body.page_index;
      if (!newResults[idx]) newResults[idx] = { variants: [] };
      const blobUrl = await uploadImageToBlob(body.url, blobFilename(idx, body.model));
      newResults[idx].variants.push({ url: blobUrl, model: body.model || "unknown" });
    }

    // Support array of results: [{ page_index, url, model }, ...]
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.page_index !== undefined && item.url) {
          const idx = item.page_index;
          if (!newResults[idx]) newResults[idx] = { variants: [] };
          const blobUrl = await uploadImageToBlob(item.url, blobFilename(idx, item.model));
          newResults[idx].variants.push({ url: blobUrl, model: item.model || "unknown" });
        }
      }
    }

    const newPages = Object.keys(newResults);
    if (newPages.length === 0) {
      console.warn(`[n8n-callback] No results parsed from body! Full body: ${JSON.stringify(body).slice(0, 500)}`);
    } else {
      console.log(`[n8n-callback] newResults pages: ${newPages.join(",")}`);
    }

    // Merge into existing job (handles concurrent callbacks safely)
    const updated = await mergeJobResults(jobId, newResults, job.totalPages);

    // Occasionally clean old jobs
    if (Math.random() < 0.1) cleanOldJobs();

    const cp = updated?.completedPages || 0;
    const tp = updated?.totalPages || job.totalPages;
    console.log(`[n8n-callback] After merge: completedPages=${cp} totalPages=${tp} status=${updated?.status}`);

    return Response.json({ ok: true, completedPages: cp, totalPages: tp });
  } catch (err) {
    console.error(`[n8n-callback] Error:`, err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
