# Changelog

## [Unreleased]

## [0.1.2] — 2026-04-29

### Changed (BREAKING — npm scope)

- **Renamed npm package from `@vraj0703/ai-knowledge` to `@raj-sadan/ai-knowledge`** to match the project's npm org. Update install: `npm install @raj-sadan/ai-knowledge`.
- `release.yml` added — tag-triggered npm publish with provenance attestation.
- `publishConfig` added: `access: public`, `provenance: true`.

### Note

v0.1.0 and v0.1.1 existed only as Git tags (never published to npm). v0.1.2 is the first npm publish.

## [0.1.1] — 2026-04-29

### Fixed

- **Bundled 79 capability manifests** at `src/data/manifests/` — the package previously assumed consumers would supply their own manifests dir, which left `TOMLManifestStore` tests (loadAll, getById, search, getByCategory, getForConsumer, stats) failing on a fresh clone. Manifests are generic external services (Exa, Gemini, Cloudflare, Hugging Face, Open-Meteo, etc.) — none raj-sadan-private. Consumers can still override with `KNOWLEDGE_MANIFESTS_DIR` or by passing `manifestsDir` to `TOMLManifestStore`.
- **Fixed `FileCredentialStore` test** — pointed at a placeholder `tests/fixtures/credentials.toml` (committed, no real secrets) instead of a non-existent `config/secrets/knowledge.credentials.toml`. The runtime contract is unchanged: consumers point `FileCredentialStore` at their own gitignored credentials file.
- **Test suite now 65/65 green** on a clean `npm install` (was 58/65).
- **`npm test` script** narrowed from `tests/ src/domain/use_cases/*.test.js` (which failed in Node 24+ on directory args) to `src/domain/use_cases/*.test.js`.

## [0.1.0] — 2026-04-28

First public release. Lifted from raj-sadan's v2 knowledge organ.

### Added

- **Clean architecture lift** — domain (5 interfaces, use cases, entities, exceptions, constants), data (sources, repositories, mocks, adapters, migrations), di, navigation, presentation. 91 JS files.
- **Mock-default DI container** — every external integration ships with a stub:
  - `InMemoryGraphStore` (Map-backed nodes + edges; reinforce, neighbors)
  - `InMemoryManifestStore` (seeded with 5 generic capabilities — file-read, http-fetch, ollama-chat, shell-exec, json-extract)
  - `StubCredentialStore` (never returns real secrets)
  - `StubAdapterRunner` (records would-be invocations)
  - `StubLSDProvider` (deterministic shared-category suggestions, no LLM)
- **`KNOWLEDGE_USE_REAL` swap** — five keys: `graph`, `manifests`, `credentials`, `adapters`, `lsd`.
- **Constants with env-var fallback** — `KNOWLEDGE_*` env vars override every default.
- **CLI dispatcher** at `bin/ai-knowledge` — `serve`, `mcp`, `search`, `lookup`, `register`.
- **MCP server** with 4 tools: `knowledge_search`, `knowledge_lookup`, `knowledge_register`, `knowledge_use` (Hebbian reinforce on co-usage).
- **CI matrix** on Node 18 / 20 / 22.
- **11 smoke tests** including an e2e register + search + reinforce round-trip.

### Known limitations

- Seed manifests are 5 placeholders; raj-sadan's 71 stay raj-sadan-side via `KNOWLEDGE_MANIFESTS_DIR`.
- Search is text matching, not vector similarity. Adding an embedder (could share `ai-memory`'s) is a v0.2 follow-up.
- Live integration tests left to the consumer; only mocks exercised here.
