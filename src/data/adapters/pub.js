/**
 * pub.dev Adapter — Flutter/Dart Package Registry
 *
 * Search packages and get package details.
 * Docs: https://pub.dev/help/api
 * Auth: None required
 *
 * invoke({ query }) → search packages
 * invoke({ package }) → get package details
 */

const API_BASE = "https://pub.dev/api";

async function invoke(params = {}) {
  const { query, package: pkg } = params;

  if (pkg) {
    const res = await fetch(`${API_BASE}/packages/${encodeURIComponent(pkg)}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`pub.dev ${res.status}: ${err}`);
    }
    const data = await res.json();
    const latest = data.latest?.pubspec || {};
    return {
      name: data.name,
      version: latest.version,
      description: latest.description,
      homepage: latest.homepage,
      repository: latest.repository,
      dependencies: Object.keys(latest.dependencies || {}),
      versions: (data.versions || []).slice(0, 10).map(v => v.version)
    };
  }

  if (query) {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`pub.dev ${res.status}: ${err}`);
    }
    const data = await res.json();
    return {
      query,
      count: data.packages?.length || 0,
      packages: (data.packages || []).slice(0, 10).map(p => ({
        name: p.package
      }))
    };
  }

  throw new Error("Missing required param: query or package");
}

function describe() {
  return {
    name: "pub.dev Package Registry",
    params: {
      query: "string — search packages by keyword",
      package: "string — get details for a specific package name"
    },
    example: { query: "state management" }
  };
}

module.exports = { invoke, describe };
