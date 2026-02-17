// GET /api/n8n-results?job_id=xxx
// Frontend polls this to check job progress and get completed images.
// Returns: { status, completedPages, totalPages, results }

import { getJob, cleanOldJobs } from "@/lib/jobStore";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return Response.json({ error: "job_id required" }, { status: 400 });
  }

  const job = await getJob(jobId);
  if (!job) {
    console.log(`[n8n-results] Job ${jobId} not found`);
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  const resultPages = Object.keys(job.results || {});
  console.log(`[n8n-results] job=${jobId} status=${job.status} completed=${job.completedPages} total=${job.totalPages} resultPages=[${resultPages.join(",")}]`);

  // Occasionally clean old jobs
  if (Math.random() < 0.05) cleanOldJobs();

  // Auto-timeout: if job has been processing for over 5 minutes, mark it as timed out
  const JOB_TIMEOUT = 5 * 60 * 1000;
  let status = job.status;
  let error = job.error || null;
  if (status === "processing" && job.created && (Date.now() - job.created > JOB_TIMEOUT)) {
    status = "error";
    error = "Job timed out after 5 minutes. Check your n8n workflow for errors (bad API responses, missing credentials, etc.).";
  }

  return Response.json({
    status,
    completedPages: job.completedPages,
    totalPages: job.totalPages,
    results: job.results,
    error,
  });
}
