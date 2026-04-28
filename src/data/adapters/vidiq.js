/**
 * vidIQ Adapter — YouTube Analytics
 *
 * Fetches basic metadata from vidIQ pages.
 * No API key needed — parses HTML title/description.
 *
 * invoke({ channel?, video? })
 *   channel: string — YouTube channel name/slug
 *   video: string — YouTube video ID
 */

const BASE = "https://vidiq.com";

async function invoke(params = {}) {
  const { channel, video } = params;
  if (!channel && !video) throw new Error("Missing required param: channel or video");

  let url;
  if (video) {
    url = `https://www.youtube.com/watch?v=${encodeURIComponent(video)}`;
  } else {
    url = `${BASE}/youtube-stats/channel/${encodeURIComponent(channel)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { channel, video, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    // Extract OG image if available
    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    const thumbnail = ogMatch ? ogMatch[1].trim() : null;

    return { channel, video, url, title, description, thumbnail };
  } catch (err) {
    return {
      channel,
      video,
      url,
      status: "fetch-failed",
      error: err.message,
      note: "URL is still valid for manual browsing"
    };
  }
}

function describe() {
  return {
    name: "vidIQ YouTube Analytics",
    params: {
      channel: "string — YouTube channel name/slug",
      video: "string — YouTube video ID"
    },
    example: { channel: "katha-sagar" }
  };
}

module.exports = { invoke, describe };
