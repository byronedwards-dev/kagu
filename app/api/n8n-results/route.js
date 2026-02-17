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

  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  // Occasionally clean old jobs
  if (Math.random() < 0.05) cleanOldJobs();

  return Response.json({
    status: job.status,
    completedPages: job.completedPages,
    totalPages: job.totalPages,
    results: job.results,
    error: job.error || null,
  });
}
