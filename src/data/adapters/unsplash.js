/**
 * Unsplash Adapter — Free Stock Photo API
 *
 * 3M+ high-quality photos, no attribution required for most uses.
 * Docs: https://unsplash.com/developers
 * Auth: UNSPLASH_ACCESS_KEY
 *
 * invoke({ query, count?, orientation?, size? })
 *   query: search term
 *   count: 1-30 (default: 5)
 *   orientation: landscape|portrait|squarish (optional)
 *   size: raw|full|regular|small|thumb (default: regular)
 */

const API_BASE = "https://api.unsplash.com";

function getKey() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { query, count = 5, orientation, size = "regular" } = params;
  if (!query) throw new Error("Missing required param: query");

  const qs = new URLSearchParams({
    query,
    per_page: String(Math.min(count, 30))
  });
  if (orientation) qs.set("orientation", orientation);

  const res = await fetch(`${API_BASE}/search/photos?${qs}`, {
    headers: { "Authorization": `Client-ID ${getKey()}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Unsplash API ${res.status}: ${err}`);
  }

  const data = await res.json();

  return {
    query,
    total: data.total,
    count: data.results?.length || 0,
    photos: (data.results || []).map(p => ({
      id: p.id,
      description: p.description || p.alt_description,
      url: p.urls?.[size] || p.urls?.regular,
      download: p.links?.download,
      width: p.width,
      height: p.height,
      photographer: p.user?.name,
      color: p.color
    }))
  };
}

async function download(photoId, outputPath) {
  const res = await fetch(`${API_BASE}/photos/${photoId}/download`, {
    headers: { "Authorization": `Client-ID ${getKey()}` }
  });
  const data = await res.json();

  if (data.url && outputPath) {
    const fs = require("fs");
    const dlRes = await fetch(data.url);
    const buffer = Buffer.from(await dlRes.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    return { saved_to: outputPath, size: buffer.length };
  }
  return { download_url: data.url };
}

function describe() {
  return {
    name: "Unsplash Stock Photos",
    params: {
      query: "string (required) — search term",
      count: "number 1-30 (default: 5)",
      orientation: "landscape|portrait|squarish (optional)",
      size: "raw|full|regular|small|thumb (default: regular)"
    },
    example: { query: "mountain landscape sunset", count: 3, orientation: "landscape" }
  };
}

module.exports = { invoke, download, describe };
