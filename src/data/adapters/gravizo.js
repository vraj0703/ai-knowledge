/**
 * Gravizo Adapter — UML Diagram Renderer
 *
 * Renders UML/DOT/PlantUML diagrams as SVG images.
 * No API key needed — just URL-encode the diagram text.
 *
 * invoke({ diagram })
 *   diagram: string (required) — UML/DOT/PlantUML source text
 */

const BASE = "https://g.gravizo.com/svg?";

async function invoke(params = {}) {
  const { diagram } = params;
  if (!diagram) throw new Error("Missing required param: diagram");

  const url = BASE + encodeURIComponent(diagram);

  // Verify the URL is reachable
  try {
    const res = await fetch(url, { method: "HEAD" });
    return {
      diagram: diagram.substring(0, 200),
      url,
      status: res.ok ? "ok" : `error-${res.status}`,
      contentType: res.headers.get("content-type") || "unknown"
    };
  } catch (err) {
    // Even if HEAD fails, the URL is still valid for embedding
    return {
      diagram: diagram.substring(0, 200),
      url,
      status: "url-generated",
      note: "Could not verify URL, but it should work in a browser"
    };
  }
}

function describe() {
  return {
    name: "Gravizo UML Renderer",
    params: {
      diagram: "string (required) — UML/DOT/PlantUML diagram source"
    },
    example: { diagram: "digraph G { A -> B; B -> C; }" }
  };
}

module.exports = { invoke, describe };
