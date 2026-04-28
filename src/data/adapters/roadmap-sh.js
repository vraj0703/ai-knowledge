/**
 * Roadmap.sh Adapter — Developer Roadmaps
 *
 * Fetches roadmap page metadata from roadmap.sh.
 * No API key needed.
 *
 * invoke({ topic })
 *   topic: string (required) — e.g. "frontend", "backend", "flutter", "ai-engineer"
 */

const BASE = "https://roadmap.sh";

async function invoke(params = {}) {
  const { topic } = params;
  if (!topic) throw new Error("Missing required param: topic");

  const url = `${BASE}/${encodeURIComponent(topic)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { topic, url, status: `error-${res.status}`, title: null, description: null };
    }

    const html = await res.text();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : topic;

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return { topic, title, url, description };
  } catch (err) {
    return {
      topic,
      url,
      status: "fetch-failed",
      error: err.message,
      note: "URL is still valid for manual browsing"
    };
  }
}

function describe() {
  return {
    name: "Roadmap.sh Developer Roadmaps",
    params: {
      topic: "string (required) — roadmap topic slug (frontend, backend, flutter, ai-engineer, python, etc.)"
    },
    example: { topic: "flutter" }
  };
}

module.exports = { invoke, describe };
