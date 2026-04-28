/**
 * Pexels Adapter — Free Stock Photos and Videos
 *
 * High-quality, free to use, no attribution required.
 * Docs: https://www.pexels.com/api/documentation/
 * Auth: PEXELS_API_KEY
 *
 * invoke({ query, type?, per_page?, orientation? })
 *   query: search term (required)
 *   type: photos|videos (default: photos)
 *   per_page: 1-80 (default: 10)
 *   orientation: landscape|portrait|square (optional)
 */

const API_PHOTOS = "https://api.pexels.com/v1";
const API_VIDEOS = "https://api.pexels.com/videos";

function getKey() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { query, type = "photos", per_page = 10, orientation } = params;
  if (!query) throw new Error("Missing required param: query");

  const qs = new URLSearchParams({
    query,
    per_page: String(Math.min(per_page, 80))
  });
  if (orientation) qs.set("orientation", orientation);

  const base = type === "videos" ? API_VIDEOS : API_PHOTOS;
  const res = await fetch(`${base}/search?${qs}`, {
    headers: { "Authorization": getKey() }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pexels API ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (type === "videos") {
    return {
      query,
      total_results: data.total_results || 0,
      videos: (data.videos || []).map(v => {
        const best = v.video_files?.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        return {
          id: v.id,
          url: v.url,
          user: v.user?.name,
          file_url: best?.link || null,
          quality: best?.quality || null
        };
      })
    };
  }

  return {
    query,
    total_results: data.total_results || 0,
    photos: (data.photos || []).map(p => ({
      id: p.id,
      url: p.url,
      photographer: p.photographer,
      src_medium: p.src?.medium,
      src_original: p.src?.original
    }))
  };
}

function describe() {
  return {
    name: "Pexels Stock Photos & Videos",
    params: {
      query: "string (required) — search term",
      type: "photos|videos (default: photos)",
      per_page: "number 1-80 (default: 10)",
      orientation: "landscape|portrait|square (optional)"
    },
    example: { query: "nature sunset", type: "photos", per_page: 5, orientation: "landscape" }
  };
}

module.exports = { invoke, describe };
