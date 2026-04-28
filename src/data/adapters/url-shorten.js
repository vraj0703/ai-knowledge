/**
 * URL Shortener Adapter — is.gd
 *
 * Free URL shortener, no auth required.
 *
 * invoke({ url })
 *   url: string (required) — URL to shorten
 */

const API_BASE = "https://is.gd/create.php";

async function invoke(params = {}) {
  const { url } = params;
  if (!url) throw new Error("Missing required param: url");

  const apiUrl = `${API_BASE}?format=json&url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`is.gd ${res.status}: ${await res.text()}`);
  const data = await res.json();

  if (data.errorcode) {
    throw new Error(`is.gd error ${data.errorcode}: ${data.errormessage}`);
  }

  return {
    original: url,
    short: data.shorturl
  };
}

function describe() {
  return {
    name: "URL Shortener (is.gd)",
    params: {
      url: "string (required) — URL to shorten"
    },
    example: { url: "https://github.com/raj-sadan/raj-sadan" }
  };
}

module.exports = { invoke, describe };
