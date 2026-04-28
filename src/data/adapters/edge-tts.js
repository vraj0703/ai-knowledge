/**
 * Edge-TTS Adapter — Free Text-to-Speech via WSL
 *
 * Uses Microsoft Edge TTS via edge-tts Python package in WSL Kali.
 * Replaces Speechma.
 *
 * invoke({ text, voice, output })
 *   text:   string (required) — text to synthesize
 *   voice:  string (optional, default "en-US-AriaNeural") — voice name
 *   output: string (optional, default "/tmp/edge-tts-output.mp3") — output path in WSL
 *   action: string (optional, default "synthesize") — "synthesize" | "voices"
 */

const { execSync } = require("child_process");

const DEFAULT_VOICE = "en-US-AriaNeural";
const DEFAULT_OUTPUT = "/tmp/edge-tts-output.mp3";

function wslExec(cmd) {
  return execSync(`wsl -d kali-linux -- ${cmd}`, {
    encoding: "utf-8",
    timeout: 30000
  }).trim();
}

function ensureInstalled() {
  try {
    wslExec("edge-tts --version");
  } catch {
    try {
      wslExec("pip3 install edge-tts");
    } catch (e) {
      throw new Error(`Failed to install edge-tts in WSL: ${e.message}`);
    }
  }
}

async function invoke(params = {}, credentials = {}) {
  const { text, voice = DEFAULT_VOICE, output = DEFAULT_OUTPUT, action = "synthesize" } = params;

  if (action === "voices") {
    ensureInstalled();
    const raw = wslExec("edge-tts --list-voices");
    const voices = raw.split("\n")
      .filter(line => line.startsWith("Name:"))
      .slice(0, 30)
      .map(line => {
        const name = line.replace("Name: ", "").trim();
        return { name };
      });
    return { count: voices.length, voices };
  }

  // Default: synthesize
  if (!text) throw new Error("Missing required param: text");

  ensureInstalled();

  const safeText = text.replace(/"/g, '\\"').replace(/\n/g, " ");
  const cmd = `edge-tts --text "${safeText}" --voice ${voice} --write-media ${output}`;

  try {
    wslExec(cmd);
  } catch (e) {
    throw new Error(`Edge-TTS synthesis failed: ${e.message}`);
  }

  // Convert WSL path to Windows path for access
  let windowsPath;
  try {
    windowsPath = execSync(`wsl -d kali-linux -- wslpath -w ${output}`, {
      encoding: "utf-8",
      timeout: 5000
    }).trim();
  } catch {
    windowsPath = null;
  }

  return {
    text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
    voice,
    wsl_path: output,
    windows_path: windowsPath,
    format: "mp3"
  };
}

function describe() {
  return {
    name: "Edge-TTS (via WSL)",
    params: {
      text: "string (required) — text to synthesize",
      voice: "string (optional, default 'en-US-AriaNeural') — TTS voice name",
      output: "string (optional, default '/tmp/edge-tts-output.mp3') — output path in WSL",
      action: "string (optional) — 'synthesize' or 'voices'"
    },
    example: { text: "Good morning, Prime Minister.", voice: "en-US-AriaNeural" }
  };
}

module.exports = { invoke, describe };
