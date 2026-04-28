/**
 * QR Code Adapter — QR Code Generator
 *
 * Uses goqr.me API, no auth required.
 * Returns a URL pointing to the generated QR image.
 *
 * invoke({ data, size? })
 *   data: string (required) — text or URL to encode
 *   size: string (default: "200x200")
 */

const API_BASE = "https://api.qrserver.com/v1/create-qr-code/";

async function invoke(params = {}) {
  const { data, size = "200x200" } = params;
  if (!data) throw new Error("Missing required param: data");

  const url = `${API_BASE}?data=${encodeURIComponent(data)}&size=${encodeURIComponent(size)}`;

  // Verify the URL is reachable
  try {
    const res = await fetch(url, { method: "HEAD" });
    return {
      data,
      url,
      size,
      status: res.ok ? "ok" : `error-${res.status}`
    };
  } catch {
    return {
      data,
      url,
      size,
      status: "url-generated",
      note: "Could not verify URL, but it should work in a browser"
    };
  }
}

function describe() {
  return {
    name: "QR Code Generator",
    params: {
      data: "string (required) — text or URL to encode into QR",
      size: "string — dimensions like '200x200' (default)"
    },
    example: { data: "https://raj-sadan.local", size: "300x300" }
  };
}

module.exports = { invoke, describe };
