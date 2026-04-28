/**
 * Shodan Adapter — Internet Intelligence API
 *
 * Search engine for internet-connected devices.
 * Docs: https://developer.shodan.io
 * Auth: SHODAN_API_KEY
 *
 * invoke({ action, query?, ip? })
 *   action: search|host|count|myip
 *   query: Shodan search query (for search/count)
 *   ip: IP address (for host)
 */

const API_BASE = "https://api.shodan.io";

function getKey() {
  const key = process.env.SHODAN_API_KEY;
  if (!key) throw new Error("SHODAN_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { action = "search", query, ip } = params;
  const key = getKey();

  switch (action) {
    case "search": {
      if (!query) throw new Error("Missing required param: query");
      const qs = new URLSearchParams({ key, query });
      const res = await fetch(`${API_BASE}/shodan/host/search?${qs}`);
      if (!res.ok) throw new Error(`Shodan API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        total: data.total,
        count: data.matches?.length || 0,
        matches: (data.matches || []).slice(0, 10).map(m => ({
          ip: m.ip_str,
          port: m.port,
          org: m.org,
          product: m.product,
          os: m.os,
          location: `${m.location?.city || ""}, ${m.location?.country_name || ""}`
        }))
      };
    }
    case "host": {
      if (!ip) throw new Error("Missing required param: ip");
      const res = await fetch(`${API_BASE}/shodan/host/${ip}?key=${key}`);
      if (!res.ok) throw new Error(`Shodan API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        ip: data.ip_str,
        org: data.org,
        os: data.os,
        ports: data.ports,
        hostnames: data.hostnames,
        location: `${data.city || ""}, ${data.country_name || ""}`,
        vulns: data.vulns || [],
        services: (data.data || []).slice(0, 5).map(s => ({
          port: s.port,
          transport: s.transport,
          product: s.product,
          version: s.version
        }))
      };
    }
    case "count": {
      if (!query) throw new Error("Missing required param: query");
      const qs = new URLSearchParams({ key, query });
      const res = await fetch(`${API_BASE}/shodan/host/count?${qs}`);
      if (!res.ok) throw new Error(`Shodan API ${res.status}: ${await res.text()}`);
      return await res.json();
    }
    case "myip": {
      const res = await fetch(`${API_BASE}/tools/myip?key=${key}`);
      if (!res.ok) throw new Error(`Shodan API ${res.status}: ${await res.text()}`);
      return { ip: await res.text() };
    }
    default:
      throw new Error(`Unknown action: ${action}. Use: search|host|count|myip`);
  }
}

function describe() {
  return {
    name: "Shodan Internet Intelligence",
    params: {
      action: "search|host|count|myip (required)",
      query: "string — Shodan search query (for search/count)",
      ip: "string — IP address (for host lookup)"
    },
    examples: [
      { action: "search", query: "port:3000 country:IN" },
      { action: "host", ip: "8.8.8.8" },
      { action: "myip" }
    ]
  };
}

module.exports = { invoke, describe };
