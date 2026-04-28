/**
 * GeoJS Adapter — IP Geolocation
 *
 * Returns geographic information for an IP address.
 * Docs: https://www.geojs.io/docs/v1/endpoints/geo/
 * Auth: None
 *
 * invoke({ ip? })
 *   ip: specific IP to look up (optional, uses caller's IP if omitted)
 */

const API_BASE = "https://get.geojs.io/v1/ip/geo";

async function invoke(params = {}) {
  const { ip } = params;
  const url = ip ? `${API_BASE}/${ip}.json` : `${API_BASE}.json`;

  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GeoJS API ${res.status}: ${err}`);
  }

  const data = await res.json();

  return {
    ip: data.ip,
    country: data.country,
    city: data.city,
    region: data.region,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    organization: data.organization_name || data.organization
  };
}

function describe() {
  return {
    name: "GeoJS — IP Geolocation",
    params: {
      ip: "string (optional) — IP to geolocate, uses caller's IP if omitted"
    },
    example: { ip: "8.8.8.8" }
  };
}

module.exports = { invoke, describe };
