# @vraj0703/ai-knowledge

> Capability registry for AI agents — neural graph, Hebbian strengthening, LSD discovery, manifest-driven adapter runner. Mockable defaults so it runs without SQLite, Ollama, or Langflow.

[![CI](https://github.com/vraj0703/ai-knowledge/actions/workflows/ci.yml/badge.svg)](https://github.com/vraj0703/ai-knowledge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node: 18+](https://img.shields.io/badge/Node-18+-green.svg)](package.json)

The "what tools do I have and which one fits this task" layer. Five interfaces (graph store, manifest store, credential store, adapter runner, LSD provider), five default mocks, one DI container that picks per-integration. The manifest store ships with a small generic seed set so search returns sensible results out of the box.

> **Status:** v0.1.0. Lifted from raj-sadan. Mock-default DI runs `clone + npm install + npm start` in seconds with no backing service.

## What it does

| Surface | Purpose |
|---|---|
| **Manifest store** | Per-capability TOML manifest (id, name, description, tier, categories) |
| **Graph store** | Nodes (capabilities) + weighted edges (consumer / category / co-usage / lsd) |
| **Hebbian strengthening** | Edges between capabilities used together get reinforced; unused edges decay |
| **LSD (Latent Semantic Discovery)** | LLM finds new edges between nodes that weren't explicitly linked |
| **Adapter runner** | Per-capability TOML manifest names a Node adapter that knows how to invoke the underlying service (Cloudflare API, GitHub, Exa, etc.) |
| **Credential store** | Per-capability secrets (API tokens, etc.) — stays out of the graph |

The pattern: an agent searches for "what tool does X", picks one, invokes it, the act of invoking strengthens edges to other tools that often go together. Over time the graph self-organizes by usage.

## Install

```bash
npm install @vraj0703/ai-knowledge
```

Zero dependencies for the default (mock) path. Real path needs three optional peer deps:
- `better-sqlite3` — for the real SQLite graph store
- `@modelcontextprotocol/sdk` + `zod` — for `ai-knowledge mcp`

## Use

### Standalone HTTP service

```bash
ai-knowledge serve                       # mocks, port 3489
ai-knowledge --version
ai-knowledge --help

# CLI shortcuts
ai-knowledge search "fetch a URL"
ai-knowledge lookup http-fetch
ai-knowledge register my-tool "My Tool" "Does X for me"
```

### MCP server

```bash
ai-knowledge mcp
```

Four tools auto-discovered:
- `knowledge_search` — find capabilities by query
- `knowledge_lookup` — fetch one by id
- `knowledge_register` — add a new manifest
- `knowledge_use` — record a capability use (Hebbian reinforce)

### From code

```js
const { createContainer } = require("@vraj0703/ai-knowledge/container");

const c = createContainer();              // all mocks
const found = await c.manifestStore.search("llm");
// → matches "ollama-chat" from the seed set

const real = createContainer({ useReal: "graph,manifests" });
```

### Switch to real integrations

```bash
KNOWLEDGE_USE_REAL=all ai-knowledge serve
KNOWLEDGE_USE_REAL=graph,manifests ai-knowledge serve
```

Five known keys: `graph`, `manifests`, `credentials`, `adapters`, `lsd`.

## Mockability contract

Every external integration ships with a stub:
- `InMemoryGraphStore` — Map-backed nodes + edges; Hebbian strengthening works in process
- `InMemoryManifestStore` — seeded with 5 generic capabilities (file-read, http-fetch, ollama-chat, shell-exec, json-extract) so search returns hits out of the box
- `StubCredentialStore` — returns `[mock]`-tagged fake secrets, never reads real ones
- `StubAdapterRunner` — records would-be invocations; nothing executes
- `StubLSDProvider` — deterministic suggestions based on shared categories (no LLM call)

11 smoke tests run in <150 ms. None touch disk, network, or any LLM.

## Configuration

| Var | Default | Purpose |
|---|---|---|
| `KNOWLEDGE_PORT` | 3489 | HTTP port |
| `KNOWLEDGE_USE_REAL` | (empty) | Comma-separated integrations to switch to real, or `all` |
| `KNOWLEDGE_DB_PATH` | `data/data_sources/local/knowledge.db` | SQLite file |
| `KNOWLEDGE_OLLAMA_HOST` | `http://localhost:11434` | LLM provider for direct LSD |
| `KNOWLEDGE_OLLAMA_MODEL` | `gemma4:e4b` | Model name |
| `KNOWLEDGE_LANGFLOW_HOST` | `http://100.108.180.118:7860` | Langflow server (raj-sadan default) |
| `KNOWLEDGE_HEBBIAN_REINFORCE` | 0.1 | Edge weight bump per use |
| `KNOWLEDGE_DECAY_HALF_LIFE` | 30 | Days for unused edges to halve |

## What's not here yet

- **Generic seed manifests** are 5 placeholders. raj-sadan has 71 specific manifests (Cloudflare zones, Exa API key, GitHub OAuth, etc.) that stay raj-sadan-side via `KNOWLEDGE_MANIFESTS_DIR`.
- **Vector similarity search** — current search is text matching. Adding an embedder + vector store (could share ai-memory's) is a v0.2 follow-up.
- **Live integration tests** — only mocks tested. Real SQLite + Ollama + Langflow are exercised by raj-sadan's boot smoke via `KNOWLEDGE_USE_REAL=all`.

## See also

- [ai-mind](https://github.com/vraj0703/ai-mind) — the cognitive layer ai-knowledge serves
- [ai-memory](https://github.com/vraj0703/ai-memory) — long-term state, paired with ai-knowledge for context
- [ai-senses](https://github.com/vraj0703/ai-senses)
- [ai-constitution](https://github.com/vraj0703/ai-constitution)

## License

MIT.
