// Job store using write-once Blob pattern.
//
// Instead of one mutable blob per job (which suffers from CDN caching +
// overwrite issues), we use a write-once pattern:
//
//   kagu-jobs/{jobId}/meta.json     — created once by n8n-send (job metadata)
//   kagu-jobs/{jobId}/page-0.json   — created once per page by n8n-callback
//   kagu-jobs/{jobId}/page-1.json   — etc.
//
// Reading a job: list all blobs with prefix, assemble results.
// No overwrites needed. No CDN caching issues (each blob read once).
// No race conditions (each callback writes its own separate file).

import { put, del, list } from "@vercel/blob";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const metaPath = (jobId) => `kagu-jobs/${jobId}/meta.json`;
const pagePath = (jobId, pageIdx) => `kagu-jobs/${jobId}/page-${pageIdx}.json`;

// ── Blob-backed store ──────────────────────────────────────────────

async function writeBlobOnce(path, data) {
  await put(path, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true, // safe for retries — same page callback can fire twice
  });
}

async function readBlob(url) {
  // Cache-bust to avoid stale CDN reads
  const bustUrl = url + (url.includes("?") ? "&" : "?") + `_t=${Date.now()}`;
  const res = await fetch(bustUrl, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

// ── Filesystem fallback ────────────────────────────────────────────

const JOBS_DIR = join(process.env.VERCEL ? "/tmp" : process.cwd(), ".n8n-jobs");

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeFsFile(filePath, data) {
  ensureDir(join(filePath, ".."));
  writeFileSync(filePath, JSON.stringify(data));
}

function readFsFile(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, "utf8")); } catch { return null; }
}

// ── Public API ─────────────────────────────────────────────────────

// Create a new job (called by n8n-send)
export async function createJob(jobId, totalPages) {
  const meta = {
    status: "processing",
    created: Date.now(),
    totalPages,
    completedPages: 0,
  };

  // Write to filesystem (same-instance)
  const jobDir = join(JOBS_DIR, jobId);
  writeFsFile(join(jobDir, "meta.json"), meta);

  // Write to Blob (cross-instance)
  if (useBlob()) {
    try {
      await writeBlobOnce(metaPath(jobId), meta);
      console.log(`[jobStore] Created blob meta for job ${jobId}`);
    } catch (err) {
      console.error(`[jobStore] Blob meta write failed: ${err.message}`);
    }
  }
}

// Store results for a single page (called by n8n-callback, one call per page)
export async function addPageResult(jobId, pageIdx, variants) {
  const pageData = { pageIdx, variants, ts: Date.now() };

  // Write to filesystem
  const jobDir = join(JOBS_DIR, jobId);
  writeFsFile(join(jobDir, `page-${pageIdx}.json`), pageData);

  // Write to Blob (separate file per page)
  if (useBlob()) {
    try {
      const path = pagePath(jobId, pageIdx);
      await writeBlobOnce(path, pageData);
      console.log(`[jobStore] Wrote blob ${path} (${variants.length} variants)`);
    } catch (err) {
      console.error(`[jobStore] Blob page-${pageIdx} write FAILED for job ${jobId}: ${err.message}`);
    }
  }
}

// Read the full job state (called by n8n-results polling)
export async function getJob(jobId) {
  if (useBlob()) {
    try {
      const { blobs } = await list({ prefix: `kagu-jobs/${jobId}/` });
      if (!blobs.length) return getJobFromFs(jobId);

      // Find meta blob
      const metaBlob = blobs.find(b => b.pathname.endsWith("/meta.json"));
      if (!metaBlob) return getJobFromFs(jobId);

      const meta = await readBlob(metaBlob.url);
      if (!meta) return getJobFromFs(jobId);

      // Check for error blob
      const errorBlob = blobs.find(b => b.pathname.endsWith("/error.json"));
      let jobError = null;
      if (errorBlob) {
        const errData = await readBlob(errorBlob.url);
        if (errData) jobError = errData.error;
      }

      // Find page blobs
      const pageBlobs = blobs.filter(b => b.pathname.match(/\/page-\d+\.json$/));
      const results = {};

      for (const pb of pageBlobs) {
        const pageData = await readBlob(pb.url);
        if (pageData && pageData.pageIdx !== undefined) {
          results[pageData.pageIdx] = { variants: pageData.variants || [] };
        }
      }

      const completedPages = Object.keys(results).length;
      const status = jobError ? "error" : completedPages >= meta.totalPages ? "done" : meta.status;
      return {
        status,
        created: meta.created,
        totalPages: meta.totalPages,
        completedPages,
        results,
        error: jobError,
      };
    } catch (err) {
      console.error(`[jobStore] Blob getJob failed: ${err.message}`);
      return getJobFromFs(jobId);
    }
  }
  return getJobFromFs(jobId);
}

// Filesystem-only job read (fallback)
function getJobFromFs(jobId) {
  const jobDir = join(JOBS_DIR, jobId);
  const meta = readFsFile(join(jobDir, "meta.json"));
  if (!meta) return null;

  // Check for error file
  const errFile = readFsFile(join(jobDir, "error.json"));
  const jobError = errFile?.error || null;

  const results = {};
  try {
    if (existsSync(jobDir)) {
      for (const file of readdirSync(jobDir)) {
        const match = file.match(/^page-(\d+)\.json$/);
        if (match) {
          const pageData = readFsFile(join(jobDir, file));
          if (pageData) {
            results[pageData.pageIdx] = { variants: pageData.variants || [] };
          }
        }
      }
    }
  } catch {}

  const completedPages = Object.keys(results).length;
  const status = jobError ? "error" : completedPages >= meta.totalPages ? "done" : meta.status;
  return {
    status,
    created: meta.created,
    totalPages: meta.totalPages,
    completedPages,
    results,
    error: jobError,
  };
}

// Mark job as errored (called by n8n-send on webhook failure)
export async function setJobError(jobId, error) {
  const errorMeta = { error, status: "error", ts: Date.now() };

  // Write error file to filesystem
  const jobDir = join(JOBS_DIR, jobId);
  writeFsFile(join(jobDir, "error.json"), errorMeta);

  // Write error to Blob
  if (useBlob()) {
    try {
      await writeBlobOnce(`kagu-jobs/${jobId}/error.json`, errorMeta);
    } catch {}
  }
}

// Clean old jobs (>1 hour)
export async function cleanOldJobs() {
  // Clean Blob
  if (useBlob()) {
    try {
      const now = Date.now();
      const { blobs } = await list({ prefix: "kagu-jobs/" });
      // Group by jobId
      const jobIds = new Set();
      for (const b of blobs) {
        const parts = b.pathname.split("/");
        if (parts.length >= 3) jobIds.add(parts[1]);
      }
      for (const jid of jobIds) {
        const metaBlob = blobs.find(b => b.pathname === `kagu-jobs/${jid}/meta.json`);
        if (metaBlob) {
          const meta = await readBlob(metaBlob.url);
          if (meta && now - meta.created > 3600000) {
            const jobBlobs = blobs.filter(b => b.pathname.startsWith(`kagu-jobs/${jid}/`));
            for (const jb of jobBlobs) {
              try { await del(jb.url); } catch {}
            }
          }
        }
      }
    } catch {}
  }

  // Clean filesystem
  ensureDir(JOBS_DIR);
  try {
    const now = Date.now();
    for (const dir of readdirSync(JOBS_DIR)) {
      const jobDir = join(JOBS_DIR, dir);
      const meta = readFsFile(join(jobDir, "meta.json"));
      if (meta && now - meta.created > 3600000) {
        try {
          for (const f of readdirSync(jobDir)) unlinkSync(join(jobDir, f));
          require("fs").rmdirSync(jobDir);
        } catch {}
      }
    }
  } catch {}
}
