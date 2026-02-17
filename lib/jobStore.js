// Simple job store that works on both local dev and Vercel serverless.
// Uses /tmp filesystem on Vercel (ephemeral but shared across warm invocations within ~15min).
// Falls back to in-memory for local dev.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const JOBS_DIR = join(process.env.VERCEL ? "/tmp" : process.cwd(), ".n8n-jobs");

function ensureDir() {
  if (!existsSync(JOBS_DIR)) {
    mkdirSync(JOBS_DIR, { recursive: true });
  }
}

export function setJob(jobId, data) {
  ensureDir();
  writeFileSync(join(JOBS_DIR, `${jobId}.json`), JSON.stringify(data));
}

export function getJob(jobId) {
  ensureDir();
  const path = join(JOBS_DIR, `${jobId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function updateJob(jobId, updater) {
  const job = getJob(jobId);
  if (!job) return null;
  const updated = updater(job);
  setJob(jobId, updated);
  return updated;
}

// Clean up jobs older than 1 hour
export function cleanOldJobs() {
  ensureDir();
  const now = Date.now();
  try {
    for (const file of readdirSync(JOBS_DIR)) {
      const path = join(JOBS_DIR, file);
      try {
        const job = JSON.parse(readFileSync(path, "utf8"));
        if (now - job.created > 3600000) unlinkSync(path);
      } catch {
        // Corrupted file, remove it
        try { unlinkSync(path); } catch {}
      }
    }
  } catch {}
}
