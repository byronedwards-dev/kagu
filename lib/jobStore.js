// Job store with two backends:
// 1. Vercel Blob (persistent, works across serverless instances) — used when BLOB_READ_WRITE_TOKEN is set
// 2. Filesystem fallback (/tmp on Vercel, .n8n-jobs locally) — used when no token configured
//
// The Blob backend solves the issue where n8n callbacks hit a different serverless
// instance than the one that created the job, losing the /tmp job files.
//
// IMPORTANT: n8n can fire multiple callbacks nearly simultaneously (one per page).
// To handle this, we use a cache-busted fetch approach for reads and always merge
// results rather than overwrite when updating.

import { put, del, list } from "@vercel/blob";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blobPath = (jobId) => `kagu-jobs/${jobId}.json`;

// ── Blob-backed store ──────────────────────────────────────────────

async function setBlobJob(jobId, data) {
  await put(blobPath(jobId), JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function getBlobJob(jobId) {
  try {
    // List blobs with the job prefix to find the URL
    const { blobs } = await list({ prefix: blobPath(jobId) });
    if (!blobs.length) return null;
    // Cache-bust: append timestamp to avoid CDN serving stale data
    const bustUrl = blobs[0].url + (blobs[0].url.includes("?") ? "&" : "?") + `_t=${Date.now()}`;
    const res = await fetch(bustUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function cleanOldBlobJobs() {
  try {
    const now = Date.now();
    const { blobs } = await list({ prefix: "kagu-jobs/" });
    for (const blob of blobs) {
      try {
        const res = await fetch(blob.url, { cache: "no-store" });
        if (res.ok) {
          const job = await res.json();
          if (now - job.created > 3600000) {
            await del(blob.url);
          }
        }
      } catch {
        // Corrupted blob, delete it
        try { await del(blob.url); } catch {}
      }
    }
  } catch {}
}

// ── Filesystem fallback ────────────────────────────────────────────

const JOBS_DIR = join(process.env.VERCEL ? "/tmp" : process.cwd(), ".n8n-jobs");

function ensureDir() {
  if (!existsSync(JOBS_DIR)) {
    mkdirSync(JOBS_DIR, { recursive: true });
  }
}

function setFsJob(jobId, data) {
  ensureDir();
  writeFileSync(join(JOBS_DIR, `${jobId}.json`), JSON.stringify(data));
}

function getFsJob(jobId) {
  ensureDir();
  const path = join(JOBS_DIR, `${jobId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function cleanOldFsJobs() {
  ensureDir();
  const now = Date.now();
  try {
    for (const file of readdirSync(JOBS_DIR)) {
      const path = join(JOBS_DIR, file);
      try {
        const job = JSON.parse(readFileSync(path, "utf8"));
        if (now - job.created > 3600000) unlinkSync(path);
      } catch {
        try { unlinkSync(path); } catch {}
      }
    }
  } catch {}
}

// ── Public API (same interface as before) ──────────────────────────

export async function setJob(jobId, data) {
  // Always write to fs for same-instance access
  setFsJob(jobId, data);
  if (useBlob()) {
    // Also persist to Blob so other serverless instances can find it
    try {
      await setBlobJob(jobId, data);
    } catch (err) {
      console.error("Blob setJob failed (fs backup exists):", err.message);
    }
  }
}

export async function getJob(jobId) {
  if (useBlob()) {
    // Try blob first (persistent), fall back to fs (same instance)
    const blobJob = await getBlobJob(jobId);
    if (blobJob) return blobJob;
    return getFsJob(jobId);
  }
  return getFsJob(jobId);
}

// Merge new results into job without losing existing results from concurrent callbacks.
// This is critical: n8n fires one callback per page nearly simultaneously, so each
// callback must read-merge-write rather than overwrite.
export async function mergeJobResults(jobId, newResults, totalPages) {
  // Read the latest state (cache-busted)
  const job = await getJob(jobId);
  if (!job) return null;

  // Merge results — never discard existing results
  for (const [idxStr, result] of Object.entries(newResults)) {
    const idx = parseInt(idxStr, 10);
    if (!job.results[idx]) {
      job.results[idx] = { variants: [] };
    }
    for (const v of (result.variants || [])) {
      // Avoid duplicates by URL
      const exists = job.results[idx].variants.some(ev => ev.url === v.url);
      if (!exists) {
        job.results[idx].variants.push(v);
      }
    }
  }

  job.completedPages = Object.keys(job.results).length;
  if (job.completedPages >= (totalPages || job.totalPages)) {
    job.status = "done";
  }

  await setJob(jobId, job);
  return job;
}

export async function updateJob(jobId, updater) {
  const job = await getJob(jobId);
  if (!job) return null;
  const updated = updater(job);
  await setJob(jobId, updated);
  return updated;
}

export function cleanOldJobs() {
  if (useBlob()) {
    cleanOldBlobJobs().catch(() => {});
  }
  cleanOldFsJobs();
}
