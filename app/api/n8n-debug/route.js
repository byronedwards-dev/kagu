// GET /api/n8n-debug?job_id=xxx
// Debug endpoint — returns raw job data from both Blob and filesystem.
// Use this to diagnose why the frontend isn't seeing results.

import { list } from "@vercel/blob";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  const result = {
    jobId,
    hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
    blobJob: null,
    blobError: null,
    fsJob: null,
    fsError: null,
    recentJobs: [],
  };

  // Check Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "kagu-jobs/" });
      result.recentJobs = blobs.map(b => ({ pathname: b.pathname, url: b.url.slice(0, 80), uploadedAt: b.uploadedAt }));

      if (jobId) {
        const match = blobs.find(b => b.pathname.includes(jobId));
        if (match) {
          const bustUrl = match.url + (match.url.includes("?") ? "&" : "?") + `_t=${Date.now()}`;
          const res = await fetch(bustUrl, { cache: "no-store" });
          if (res.ok) {
            const job = await res.json();
            result.blobJob = {
              status: job.status,
              completedPages: job.completedPages,
              totalPages: job.totalPages,
              resultKeys: Object.keys(job.results || {}),
              resultSummary: Object.entries(job.results || {}).map(([k, v]) => ({
                page: k,
                variantCount: v.variants?.length || 0,
                urls: (v.variants || []).map(vv => vv.url?.slice(0, 60)),
              })),
              created: job.created,
              ageMs: Date.now() - job.created,
            };
          } else {
            result.blobError = `Fetch returned ${res.status}`;
          }
        } else {
          result.blobError = "No blob found with this jobId";
        }
      }
    } catch (e) {
      result.blobError = e.message;
    }
  }

  // Check filesystem
  if (jobId) {
    const JOBS_DIR = join(process.env.VERCEL ? "/tmp" : process.cwd(), ".n8n-jobs");
    const path = join(JOBS_DIR, `${jobId}.json`);
    try {
      if (existsSync(path)) {
        const job = JSON.parse(readFileSync(path, "utf8"));
        result.fsJob = {
          status: job.status,
          completedPages: job.completedPages,
          totalPages: job.totalPages,
          resultKeys: Object.keys(job.results || {}),
          resultSummary: Object.entries(job.results || {}).map(([k, v]) => ({
            page: k,
            variantCount: v.variants?.length || 0,
            urls: (v.variants || []).map(vv => vv.url?.slice(0, 60)),
          })),
          created: job.created,
          ageMs: Date.now() - job.created,
        };
      } else {
        result.fsError = "File not found at " + path;
      }
    } catch (e) {
      result.fsError = e.message;
    }
  }

  return Response.json(result);
}
