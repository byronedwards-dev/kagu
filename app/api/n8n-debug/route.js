// GET /api/n8n-debug?job_id=xxx
// Debug endpoint — shows raw job state from Blob and filesystem.

import { list } from "@vercel/blob";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  const result = {
    jobId,
    hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
    blobFiles: [],
    fsFiles: [],
    assembledJob: null,
  };

  // Check Blob files for this job
  if (process.env.BLOB_READ_WRITE_TOKEN && jobId) {
    try {
      const { blobs } = await list({ prefix: `kagu-jobs/${jobId}/` });
      result.blobFiles = blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }));
    } catch (e) {
      result.blobError = e.message;
    }
  }

  // Check filesystem
  if (jobId) {
    const JOBS_DIR = join(process.env.VERCEL ? "/tmp" : process.cwd(), ".n8n-jobs");
    const jobDir = join(JOBS_DIR, jobId);
    try {
      if (existsSync(jobDir)) {
        result.fsFiles = readdirSync(jobDir).map(f => {
          try {
            const content = JSON.parse(readFileSync(join(jobDir, f), "utf8"));
            return { file: f, keys: Object.keys(content), preview: JSON.stringify(content).slice(0, 200) };
          } catch {
            return { file: f, error: "parse failed" };
          }
        });
      } else {
        result.fsError = "Job directory not found";
      }
    } catch (e) {
      result.fsError = e.message;
    }
  }

  // List all recent jobs
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "kagu-jobs/" });
      const jobIds = new Set();
      for (const b of blobs) {
        const parts = b.pathname.split("/");
        if (parts.length >= 3) jobIds.add(parts[1]);
      }
      result.recentJobIds = [...jobIds].slice(0, 10);
    } catch {}
  }

  return Response.json(result);
}
