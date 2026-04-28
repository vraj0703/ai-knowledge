/**
 * OCR.space Adapter — Image/PDF to Text
 *
 * Extract text from images and PDFs via OCR.
 * Docs: https://ocr.space/OCRAPI
 * Auth: OCR_SPACE_API_KEY
 * Free tier: 500 requests/day
 *
 * invoke({ url?, file?, language? })
 *   url: image URL to OCR (provide url OR file, not both)
 *   file: local file path (read as base64)
 *   language: "eng" (default), "hin" for Hindi, etc.
 */

const fs = require("fs");
const path = require("path");

const API_URL = "https://api.ocr.space/parse/image";

function getKey() {
  const key = process.env.OCR_SPACE_API_KEY;
  if (!key) throw new Error("OCR_SPACE_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { url, file, language = "eng" } = params;
  if (!url && !file) throw new Error("Missing required param: url or file");

  const fields = [`apikey=${getKey()}`, `language=${language}`, `isOverlayRequired=false`];

  if (url) {
    fields.push(`url=${encodeURIComponent(url)}`);
  } else {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const ext = path.extname(filePath).slice(1) || "png";
    const mime = ext === "pdf" ? "application/pdf" : `image/${ext}`;
    const b64 = fs.readFileSync(filePath).toString("base64");
    fields.push(`base64Image=${encodeURIComponent(`data:${mime};base64,${b64}`)}`);
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: fields.join("&")
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OCR.space API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parsed = data.ParsedResults?.[0];
  if (parsed?.ErrorMessage) throw new Error(`OCR.space: ${parsed.ErrorMessage}`);

  const text = parsed?.ParsedText || "";
  return { text, lines: text.split("\n").filter(Boolean).length, language };
}

function describe() {
  return {
    name: "OCR.space — Image/PDF to Text",
    params: {
      url: "string (optional) — image URL to OCR",
      file: "string (optional) — local file path to OCR",
      language: "string (default: eng) — eng, hin, fra, deu, etc."
    },
    example: { url: "https://example.com/receipt.png", language: "eng" }
  };
}

module.exports = { invoke, describe };
