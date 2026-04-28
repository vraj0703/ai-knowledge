/**
 * Pixabay Adapter — Free Images and Videos
 *
 * 4.5M+ free stock photos, illustrations, vectors, and videos.
 * Docs: https://pixabay.com/api/docs/
 * Auth: PIXABAY_API_KEY
 *
 * invoke({ query, type?, per_page?, image_type?, orientation? })
 *   query: search term (required)
 *   type: images|videos (default: images)
 *   per_page: 3-200 (default: 10)
 *   image_type: all|photo|illustration|vector (images only, default: all)
 *   orientation: all|horizontal|vertical (optional)
 */

const API_BASE = "https://pixabay.com/api";

function getKey() {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("PIXABAY_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { query, type = "images", per_page = 10, image_type = "all", orientation } = params;
  if (!query) throw new Error("Missing required param: query");

  const qs = new URLSearchParams({
    key: getKey(),
    q: query,
    per_page: String(Math.max(3, Math.min(per_page, 200)))
  });
  if (orientation) qs.set("orientation", orientation);

  const endpoint = type === "videos" ? `${API_BASE}/videos/` : `${API_BASE}/`;

  if (type !== "videos" && image_type !== "all") {
    qs.set("image_type", image_type);
  }

  const res = await fetch(`${endpoint}?${qs}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pixabay API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const hits = data.hits || [];

  if (type === "videos") {
    return {
      query,
      total: data.totalHits || 0,
      videos: hits.map(v => ({
        id: v.id,
        tags: v.tags,
        user: v.user,
        video_url: v.videos?.large?.url || v.videos?.medium?.url || null
      }))
    };
  }

  return {
    query,
    total: data.totalHits || 0,
    images: hits.map(h => ({
      id: h.id,
      tags: h.tags,
      user: h.user,
      preview_url: h.previewURL,
      large_url: h.largeImageURL
    }))
  };
}

function describe() {
  return {
    name: "Pixabay Free Images & Videos",
    params: {
      query: "string (required) — search term",
      type: "images|videos (default: images)",
      per_page: "number 3-200 (default: 10)",
      image_type: "all|photo|illustration|vector (images only, default: all)",
      orientation: "all|horizontal|vertical (optional)"
    },
    example: { query: "tropical beach", type: "images", image_type: "photo", per_page: 5 }
  };
}

module.exports = { invoke, describe };
