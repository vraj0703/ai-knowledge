/**
 * smoke.test.js — basic load + DI swap tests for ai-knowledge.
 *
 * Contract: clone + install + start runs without SQLite, Ollama, or
 * Langflow. The container wires up mocks by default; KNOWLEDGE_USE_REAL
 * swaps individual integrations to real.
 */

const test = require("node:test");
const assert = require("node:assert");

const { createContainer, KNOWN_KEYS } = require("../src/di/container.js");
const { InMemoryGraphStore } = require("../src/data/repositories/mocks/in_memory_graph_store.js");
const { InMemoryManifestStore, SEED_MANIFESTS } = require("../src/data/repositories/mocks/in_memory_manifest_store.js");
const { StubCredentialStore } = require("../src/data/repositories/mocks/stub_credential_store.js");
const { StubAdapterRunner } = require("../src/data/repositories/mocks/stub_adapter_runner.js");
const { StubLSDProvider } = require("../src/data/repositories/mocks/stub_lsd_provider.js");

// ────────────────────────────────────────────────────────────
// Default container — every integration is mocked
// ────────────────────────────────────────────────────────────

test("default container wires up mocks for every integration", () => {
  const c = createContainer();
  assert.ok(c.graphStore instanceof InMemoryGraphStore);
  assert.ok(c.manifestStore instanceof InMemoryManifestStore);
  assert.ok(c.credentialStore instanceof StubCredentialStore);
  assert.ok(c.adapterRunner instanceof StubAdapterRunner);
  assert.ok(c.lsdProvider instanceof StubLSDProvider);
});

// ────────────────────────────────────────────────────────────
// Stub behavior
// ────────────────────────────────────────────────────────────

test("manifest store ships with seed capabilities", async () => {
  const store = new InMemoryManifestStore();
  const all = await store.list();
  assert.ok(all.length >= 5);
  const ids = all.map((m) => m.id);
  assert.ok(ids.includes("file-read"));
  assert.ok(ids.includes("http-fetch"));
  assert.ok(ids.includes("ollama-chat"));
});

test("manifest search matches by name + category", async () => {
  const store = new InMemoryManifestStore();
  const llm = await store.search("llm");
  assert.ok(llm.length >= 1);
  assert.ok(llm.every((m) => m.name.toLowerCase().includes("llm") || m.categories?.some((c) => c.includes("llm"))));
});

test("graph store upsert + reinforce raises edge weight", async () => {
  const g = new InMemoryGraphStore();
  await g.upsertNode({ id: "a", kind: "tool" });
  await g.upsertNode({ id: "b", kind: "tool" });
  await g.upsertEdge({ from: "a", to: "b", type: "co-usage", weight: 0.2 });
  const e = await g.reinforce("a", "b", "co-usage", 0.1);
  assert.ok(Math.abs(e.weight - 0.3) < 1e-9);
});

test("graph store neighbors returns highest-weight edges first", async () => {
  const g = new InMemoryGraphStore();
  await g.upsertEdge({ from: "x", to: "a", type: "co-usage", weight: 0.5 });
  await g.upsertEdge({ from: "x", to: "b", type: "co-usage", weight: 0.9 });
  await g.upsertEdge({ from: "x", to: "c", type: "co-usage", weight: 0.2 });
  const n = await g.neighbors("x");
  assert.strictEqual(n[0].to, "b");
  assert.strictEqual(n[1].to, "a");
  assert.strictEqual(n[2].to, "c");
});

test("stub LSD provider suggests edges from shared categories", async () => {
  const lsd = new StubLSDProvider();
  const nodes = [
    { id: "a", categories: ["llm", "ai"] },
    { id: "b", categories: ["llm", "parsing"] },
    { id: "c", categories: ["network"] },
  ];
  const suggestions = await lsd.discover({ nodes, existing: [] });
  // a + b share "llm" — must suggest. c has no overlap with a or b — must not.
  const pairs = suggestions.map((s) => `${s.from}-${s.to}`);
  assert.ok(pairs.includes("a-b") || pairs.includes("b-a"));
  assert.ok(!pairs.includes("a-c") && !pairs.includes("c-a"));
});

test("stub credential store never returns real secrets", async () => {
  const s = new StubCredentialStore();
  const r = await s.get("any-cap");
  assert.strictEqual(r.mock, true);
  assert.ok(r.token.includes("[mock]"));
});

test("stub adapter runner records would-be invocations", async () => {
  const r = new StubAdapterRunner();
  const res = await r.run({ capabilityId: "http-fetch", args: { url: "https://example.com" } });
  assert.strictEqual(res.mock, true);
  assert.strictEqual(res.capabilityId, "http-fetch");
  assert.strictEqual(r.history().length, 1);
});

// ────────────────────────────────────────────────────────────
// KNOWLEDGE_USE_REAL swap
// ────────────────────────────────────────────────────────────

test("KNOWLEDGE_USE_REAL=manifests swaps only the manifest store", () => {
  // Without real db better-sqlite3 + a manifests dir, this just checks instance type.
  const c = createContainer({ useReal: "manifests", manifestsDir: "/tmp/nope" });
  assert.ok(!(c.manifestStore instanceof InMemoryManifestStore));
  // Others stay mocked
  assert.ok(c.graphStore instanceof InMemoryGraphStore);
  assert.ok(c.lsdProvider instanceof StubLSDProvider);
});

test("KNOWN_KEYS export documents the 5 swap keys", () => {
  assert.ok(KNOWN_KEYS.includes("graph"));
  assert.ok(KNOWN_KEYS.includes("manifests"));
  assert.ok(KNOWN_KEYS.includes("credentials"));
  assert.ok(KNOWN_KEYS.includes("adapters"));
  assert.ok(KNOWN_KEYS.includes("lsd"));
  assert.strictEqual(KNOWN_KEYS.length, 5);
});

// ────────────────────────────────────────────────────────────
// E2E: register + search + use (Hebbian reinforce)
// ────────────────────────────────────────────────────────────

test("e2e: register a capability, search for it, record a co-usage", async () => {
  const c = createContainer();
  await c.manifestStore.upsert({
    id: "test-cap",
    name: "Test capability",
    description: "A capability for testing.",
    kind: "tool",
    tier: "T4-CLI",
    status: "enabled",
    categories: ["test"],
  });

  const found = await c.manifestStore.search("test");
  assert.ok(found.some((m) => m.id === "test-cap"));

  await c.graphStore.upsertEdge({
    from: "test-cap",
    to: "http-fetch",
    type: "co-usage",
    weight: 0.15,
  });
  const reinforced = await c.graphStore.reinforce("test-cap", "http-fetch", "co-usage", 0.1);
  assert.ok(reinforced);
  assert.ok(reinforced.weight >= 0.25);
});
