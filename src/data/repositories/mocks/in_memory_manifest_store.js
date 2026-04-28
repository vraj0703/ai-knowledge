/**
 * InMemoryManifestStore — default mock for TOMLManifestStore.
 *
 * Holds capability manifests in process. Ships with a small generic seed
 * set so search returns sensible results out of the box.
 */

const SEED_MANIFESTS = [
  {
    id: "file-read",
    name: "Read a file",
    kind: "io",
    tier: "T4-CLI",
    status: "enabled",
    description: "Read the contents of a text file from disk.",
    consumers: [],
    categories: ["filesystem"],
    mock: true,
  },
  {
    id: "http-fetch",
    name: "HTTP fetch",
    kind: "io",
    tier: "T2-FETCH",
    status: "enabled",
    description: "Fetch a URL over HTTP and return the response body.",
    consumers: [],
    categories: ["network"],
    mock: true,
  },
  {
    id: "ollama-chat",
    name: "Local LLM chat (Ollama)",
    kind: "ai",
    tier: "T1-API",
    status: "enabled",
    description: "Send a prompt to a local Ollama-served model and return the completion.",
    consumers: [],
    categories: ["ai", "llm"],
    mock: true,
  },
  {
    id: "shell-exec",
    name: "Shell exec",
    kind: "system",
    tier: "T4-CLI",
    status: "enabled",
    description: "Run a shell command and capture stdout/stderr/exitcode.",
    consumers: [],
    categories: ["system"],
    mock: true,
  },
  {
    id: "json-extract",
    name: "JSON extract from LLM output",
    kind: "transform",
    tier: "T6-REFERENCE",
    status: "enabled",
    description: "Robust JSON parsing from LLM output (fenced blocks, trailing commas, comments).",
    consumers: [],
    categories: ["llm", "parsing"],
    mock: true,
  },
];

class InMemoryManifestStore {
  constructor({ seeded = true } = {}) {
    this._items = new Map();
    if (seeded) {
      for (const m of SEED_MANIFESTS) this._items.set(m.id, { ...m });
    }
  }

  async list({ status } = {}) {
    const all = Array.from(this._items.values());
    return status ? all.filter((m) => m.status === status) : all;
  }

  async get(id) {
    return this._items.get(id) || null;
  }

  async upsert(manifest) {
    this._items.set(manifest.id, { ...manifest, mock: true });
    return manifest.id;
  }

  async delete(id) {
    return this._items.delete(id);
  }

  async search(query) {
    if (!query) return Array.from(this._items.values());
    const q = String(query).toLowerCase();
    return Array.from(this._items.values()).filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.id?.toLowerCase().includes(q) ||
        m.categories?.some((c) => c.toLowerCase().includes(q)),
    );
  }
}

module.exports = { InMemoryManifestStore, SEED_MANIFESTS };
