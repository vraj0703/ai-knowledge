/**
 * Open UI Adapter — Design System Standards
 *
 * Fetches design system specs from open-ui.org.
 * No API key needed.
 *
 * invoke({ component? })
 *   component: string — component name to look up (e.g. "select", "checkbox", "tabs")
 */

const BASE = "https://open-ui.org";

async function invoke(params = {}) {
  const { component } = params;

  const url = component
    ? `${BASE}/components/${encodeURIComponent(component)}`
    : `${BASE}/design-systems/`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RajSadan/1.0)" }
    });

    if (!res.ok) {
      return { component, url, status: `error-${res.status}` };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : null;

    return { component, url, title, description, note: "Open URL to browse design system specifications" };
  } catch (err) {
    return { component, url, status: "fetch-failed", error: err.message, note: "URL is still valid for manual browsing" };
  }
}

function describe() {
  return {
    name: "Open UI — Design System Standards",
    params: {
      component: "string — component name (select, checkbox, tabs, etc.) or omit for full listing"
    },
    example: { component: "select" }
  };
}

module.exports = { invoke, describe };
