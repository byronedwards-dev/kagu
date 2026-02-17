// GET /api/n8n-results?job_id=xxx
// Frontend polls this to check job progress and get completed images.
// Returns: { status, completedPages, totalPages, results }

if (!globalThis.__n8nJobs) globalThis.__n8nJobs = {};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  if (!jobId || !globalThis.__n8nJobs[jobId]) {
    return Response.json({ error: "Unknown job_id" }, { status: 404 });
  }

  const job = globalThis.__n8nJobs[jobId];

  // Clean up old jobs (older than 1 hour)
  const now = Date.now();
  for (const [id, j] of Object.entries(globalThis.__n8nJobs)) {
    if (now - j.created > 3600000) delete globalThis.__n8nJobs[id];
  }

  return Response.json({
    status: job.status,
    completedPages: job.completedPages,
    totalPages: job.totalPages,
    results: job.results,
    error: job.error || null,
  });
}
