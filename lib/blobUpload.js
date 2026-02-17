// Upload images to Vercel Blob for persistent CDN-backed storage.
// Falls back to returning the original URL if BLOB_READ_WRITE_TOKEN is not set
// or if the upload fails for any reason — never breaks the flow.

import { put } from "@vercel/blob";

/**
 * Upload an image to Vercel Blob. Returns the blob URL.
 * @param {string} imageUrl - base64 data URL or https URL
 * @param {string} filename - e.g. "kagu/page-3-flux-2-pro-1708123456.png"
 * @returns {Promise<string>} - blob URL or original URL on failure
 */
export async function uploadImageToBlob(imageUrl, filename) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return imageUrl; // No token configured, pass through
  }

  try {
    let buffer;
    let contentType = "image/png";

    if (imageUrl.startsWith("data:")) {
      // Parse base64 data URL: "data:image/png;base64,<data>"
      const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
      if (!match) return imageUrl;
      contentType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else if (imageUrl.startsWith("http")) {
      // Fetch external URL and re-upload for consistency
      const res = await fetch(imageUrl);
      if (!res.ok) return imageUrl;
      contentType = res.headers.get("content-type") || "image/png";
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      return imageUrl; // Unknown format, pass through
    }

    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    return blob.url;
  } catch (err) {
    console.error("Blob upload failed, using original URL:", err.message);
    return imageUrl; // Graceful fallback
  }
}
