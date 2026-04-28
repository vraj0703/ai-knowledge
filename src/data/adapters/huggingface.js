/**
 * HuggingFace Adapter — Model Inference API
 *
 * Run inference on 200K+ models. Free tier available.
 * Docs: https://huggingface.co/docs/api-inference
 * Auth: HUGGINGFACE_API_KEY
 *
 * invoke({ model, inputs, task?, parameters? })
 *   model: model ID (e.g., "facebook/bart-large-cnn")
 *   inputs: string or object depending on task
 *   task: text-generation|summarization|translation|text-to-image|etc.
 *   parameters: model-specific params
 */

const API_BASE = "https://router.huggingface.co/hf-inference/models";

function getKey() {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("HUGGINGFACE_API_KEY not set");
  return key;
}

async function invoke(params = {}) {
  const { model, inputs, parameters } = params;
  if (!model) throw new Error("Missing required param: model");
  if (!inputs) throw new Error("Missing required param: inputs");

  const body = { inputs };
  if (parameters) body.parameters = parameters;

  const res = await fetch(`${API_BASE}/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    // Model loading — retry hint
    if (res.status === 503) {
      const data = await res.json();
      return {
        status: "loading",
        estimated_time: data.estimated_time,
        message: `Model ${model} is loading. Retry in ${Math.ceil(data.estimated_time || 30)}s.`
      };
    }
    const err = await res.text();
    throw new Error(`HuggingFace API ${res.status}: ${err}`);
  }

  const contentType = res.headers.get("content-type") || "";

  // Image response (text-to-image models)
  if (contentType.includes("image")) {
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      type: "image",
      content_type: contentType,
      size: buffer.length,
      base64: buffer.toString("base64").substring(0, 100) + "...",
      _buffer: buffer
    };
  }

  // JSON response (text models)
  const data = await res.json();
  return Array.isArray(data) ? { results: data } : data;
}

function describe() {
  return {
    name: "HuggingFace Inference",
    params: {
      model: "string (required) — model ID, e.g. 'facebook/bart-large-cnn'",
      inputs: "string (required) — input text or data",
      parameters: "object (optional) — model-specific params like max_length, temperature"
    },
    examples: [
      { model: "facebook/bart-large-cnn", inputs: "Long article text here...", parameters: { max_length: 150 } },
      { model: "stabilityai/stable-diffusion-xl-base-1.0", inputs: "A sunset over mountains" }
    ]
  };
}

module.exports = { invoke, describe };
