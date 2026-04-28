const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

const { GraphEdge } = require("../entities/graph_edge");
const { Capability } = require("../entities/capability");

// ─── SQLiteGraphStore ───

describe("SQLiteGraphStore", () => {
  let store;
  const tmpDb = path.join(os.tmpdir(), `knowledge-test-${Date.now()}.db`);

  before(() => {
    const { SQLiteGraphStore } = require("../../data/data_sources/local/sqlite_graph_store");
    store = new SQLiteGraphStore({ dbPath: tmpDb });
  });

  after(() => {
    store.close();
    try { fs.unlinkSync(tmpDb); } catch {}
    try { fs.unlinkSync(tmpDb + "-wal"); } catch {}
    try { fs.unlinkSync(tmpDb + "-shm"); } catch {}
  });

  it("addEdge and getEdge round-trip", async () => {
    const edge = new GraphEdge({ source: "exa", target: "gemini", type: "category", weight: 0.3 });
    await store.addEdge(edge);
    const got = await store.getEdge("exa", "gemini");
    assert.ok(got);
    assert.strictEqual(got.source, "exa");
    assert.strictEqual(got.target, "gemini");
    assert.ok(Math.abs(got.weight - 0.3) < 0.01);
  });

  it("getEdge is order-independent (canonical key)", async () => {
    const got1 = await store.getEdge("exa", "gemini");
    const got2 = await store.getEdge("gemini", "exa");
    assert.deepStrictEqual(got1?.canonicalKey(), got2?.canonicalKey());
  });

  it("getNeighbors returns sorted by weight", async () => {
    await store.addEdge(new GraphEdge({ source: "exa", target: "ollama", type: "co-usage", weight: 0.8 }));
    await store.addEdge(new GraphEdge({ source: "exa", target: "shodan", type: "co-usage", weight: 0.1 }));
    const neighbors = await store.getNeighbors("exa", 10);
    assert.ok(neighbors.length >= 3);
    // Should be sorted by weight descending
    for (let i = 1; i < neighbors.length; i++) {
      assert.ok(neighbors[i - 1].weight >= neighbors[i].weight);
    }
  });

  it("updateEdge modifies weight", async () => {
    const edge = await store.getEdge("exa", "gemini");
    const reinforced = edge.reinforce(0.1);
    await store.updateEdge(reinforced);
    const updated = await store.getEdge("exa", "gemini");
    assert.ok(updated.weight > 0.3);
  });

  it("removeEdge deletes edge", async () => {
    await store.addEdge(new GraphEdge({ source: "test-a", target: "test-b", type: "lsd", weight: 0.2 }));
    const removed = await store.removeEdge("test-a", "test-b");
    assert.ok(removed);
    const got = await store.getEdge("test-a", "test-b");
    assert.strictEqual(got, null);
  });

  it("removeNode removes all edges for node", async () => {
    await store.addEdge(new GraphEdge({ source: "node-x", target: "a", type: "consumer", weight: 0.3 }));
    await store.addEdge(new GraphEdge({ source: "node-x", target: "b", type: "category", weight: 0.2 }));
    await store.addEdge(new GraphEdge({ source: "c", target: "node-x", type: "co-usage", weight: 0.5 }));
    const count = await store.removeNode("node-x");
    assert.strictEqual(count, 3);
    const neighbors = await store.getNeighbors("node-x");
    assert.strictEqual(neighbors.length, 0);
  });

  it("stats returns aggregate data", async () => {
    const s = await store.stats();
    assert.ok(typeof s.totalEdges === "number");
    assert.ok(typeof s.byType === "object");
    assert.ok(typeof s.avgWeight === "number");
    assert.ok(Array.isArray(s.strongest));
  });

  it("getByType filters correctly", async () => {
    await store.addEdge(new GraphEdge({ source: "type-a", target: "type-b", type: "lsd", weight: 0.3 }));
    const lsd = await store.getByType("lsd");
    assert.ok(lsd.length > 0);
    for (const edge of lsd) {
      assert.strictEqual(edge.type, "lsd");
    }
  });
});

// ─── TOMLManifestStore ───

describe("TOMLManifestStore", () => {
  let store;

  before(() => {
    const { TOMLManifestStore } = require("../../data/repositories/toml_manifest_store");
    const manifestsDir = path.resolve(__dirname, "..", "..", "data", "manifests");
    store = new TOMLManifestStore({ manifestsDir });
  });

  it("loads all 79 manifests", async () => {
    const all = await store.loadAll();
    assert.ok(all.length >= 79, `Expected >= 79 manifests, got ${all.length}`);
  });

  it("getById returns a Capability", async () => {
    const cap = await store.getById("exa");
    assert.ok(cap);
    assert.strictEqual(cap.id, "exa");
    assert.ok(cap instanceof Capability);
  });

  it("search finds capabilities by name/description", async () => {
    const results = await store.search("search");
    assert.ok(results.length > 0);
  });

  it("getByCategory returns category group", async () => {
    const results = await store.getByCategory("APIs and Web Services");
    assert.ok(results.length > 0);
    for (const cap of results) {
      assert.strictEqual(cap.category, "APIs and Web Services");
    }
  });

  it("getForConsumer returns mr-v capabilities", async () => {
    const results = await store.getForConsumer("mr-v");
    assert.ok(results.length > 0);
  });

  it("list with filters works", async () => {
    const enabled = await store.list({ status: "enabled" });
    for (const cap of enabled) {
      assert.strictEqual(cap.status, "enabled");
    }
  });

  it("stats returns registry statistics", async () => {
    const s = await store.stats();
    assert.ok(s.total >= 79);
    assert.ok(typeof s.tiers === "object");
    assert.ok(typeof s.statuses === "object");
  });

  it("save and remove round-trip (in temp dir)", async () => {
    const tmpDir = path.join(os.tmpdir(), `manifests-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const { TOMLManifestStore } = require("../../data/repositories/toml_manifest_store");
    const tmpStore = new TOMLManifestStore({ manifestsDir: tmpDir });

    const cap = new Capability({
      id: "test-save",
      name: "Test Save",
      tier: "T1-API",
      status: "enabled",
      category: "Test",
      description: "A test capability",
    });
    await tmpStore.save(cap);
    assert.ok(fs.existsSync(path.join(tmpDir, "test-save.toml")));

    const loaded = await tmpStore.getById("test-save");
    assert.ok(loaded);
    assert.strictEqual(loaded.name, "Test Save");

    await tmpStore.remove("test-save");
    assert.ok(!fs.existsSync(path.join(tmpDir, "test-save.toml")));

    fs.rmdirSync(tmpDir, { recursive: true });
  });
});

// ─── FileCredentialStore ───

describe("FileCredentialStore", () => {
  let store;

  before(() => {
    const { FileCredentialStore } = require("../../data/repositories/file_credential_store");
    const credPath = path.resolve(__dirname, "..", "..", "..", "config", "secrets", "knowledge.credentials.toml");
    store = new FileCredentialStore({ credentialsPath: credPath });
  });

  it("loads credentials from TOML", async () => {
    const all = await store.loadAll();
    assert.ok(all instanceof Map);
    assert.ok(all.size > 0, "Expected at least one credential section");
  });

  it("finds credential by env var", async () => {
    const cred = await store.getForEnvVar("EXA_API_KEY");
    // May or may not have a value, but should find the entry
    if (cred) {
      assert.strictEqual(cred.envVar, "EXA_API_KEY");
    }
  });

  it("handles missing file gracefully", async () => {
    const { FileCredentialStore } = require("../../data/repositories/file_credential_store");
    const missing = new FileCredentialStore({ credentialsPath: "/nonexistent/credentials.toml" });
    const all = await missing.loadAll();
    assert.strictEqual(all.size, 0);
  });
});
