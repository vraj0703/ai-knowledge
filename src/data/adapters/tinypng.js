/**
 * TinyPNG Adapter — Image Compression API
 *
 * Compress PNG/JPEG/WebP images. Up to 500 free compressions/month.
 * Docs: https://tinypng.com/developers
 * Auth: TINYPNG_API_KEY
 *
 * invoke({ input, output? })
 *   input: file path or URL of image to compress
 *   output: file path to save compressed image (optional, returns URL if omitted)
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.tinify.com";

function getKey() {
  const key = process.env.TINYPNG_API_KEY;
  if (!key) throw new Error("TINYPNG_API_KEY not set");
  return key;
}

function authHeader() {
  return "Basic " + Buffer.from(`api:${getKey()}`).toString("base64");
}

async function invoke(params = {}) {
  const { input, output } = params;
  if (!input) throw new Error("Missing required param: input (file path or URL)");

  let res;

  // URL input
  if (input.startsWith("http")) {
    res = await fetch(`${API_BASE}/shrink`, {
      method: "POST",
      headers: {
        "Authorization": authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ source: { url: input } })
    });
  }
  // File input
  else {
    const filePath = path.resolve(input);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const fileBuffer = fs.readFileSync(filePath);
    res = await fetch(`${API_BASE}/shrink`, {
      method: "POST",
      headers: {
        "Authorization": authHeader()
      },
      body: fileBuffer
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TinyPNG API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const resultUrl = data.output?.url;

  const result = {
    input_size: data.input?.size,
    output_size: data.output?.size,
    ratio: data.output?.ratio,
    savings_percent: Math.round((1 - (data.output?.ratio || 1)) * 100),
    type: data.output?.type,
    url: resultUrl
  };

  // Download to file if output path specified
  if (output && resultUrl) {
    const dlRes = await fetch(resultUrl, {
      headers: { "Authorization": authHeader() }
    });
    const buffer = Buffer.from(await dlRes.arrayBuffer());
    const outPath = path.resolve(output);
    fs.writeFileSync(outPath, buffer);
    result.saved_to = outPath;
  }

  return result;
}

function describe() {
  return {
    name: "TinyPNG Image Compression",
    params: {
      input: "string (required) — file path or URL of image",
      output: "string (optional) — file path to save compressed image"
    },
    example: { input: "https://example.com/photo.png", output: "./compressed.png" }
  };
}

module.exports = { invoke, describe };
