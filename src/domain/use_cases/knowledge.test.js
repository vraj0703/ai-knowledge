const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

const { Capability } = require("../entities/capability");
const { GraphEdge } = require("../entities/graph_edge");

// ─── Mock Stores ───

class MockManifestStore {
  constructor() {
    this.capabilities = new Map();
    this.saved = [];
    this.removed = [];
  }
  async loadAll() { return [...this.capabilities.values()]; }
  async getById(id) { return this.capabilities.get(id) || null; }
  async search(query) {
    return [...this.capabilities.values()].filter(c => c.matchesQuery(query));
  }
  async getByCategory(cat) {
    return [...this.capabilities.values()].filter(c => c.category === cat);
  }
  async getForConsumer(consumer) {
    return [...this.capabilities.values()].filter(c => {
      if (consumer === "mr-v") return c.mrV;
      if (consumer === "pm") return c.pm;
      if (consumer.startsWith("minister-")) return c.ministers.includes(consumer.slice(9));
      if (consumer.startsWith("sherpa-")) return c.sherpas.includes(consumer.slice(7));
      return false;
    });
  }
  async list(filters = {}) {
    let caps = [...this.capabilities.values()];
    if (filters.status) caps = caps.filter(c => c.status === filters.status);
    if (filters.tier) caps = caps.filter(c => c.tier === filters.tier);
    return caps;
  }
  async save(cap) {
    this.capabilities.set(cap.id, cap);
    this.saved.push(cap.id);
  }
  async remove(id) {
    this.capabilities.delete(id);
    this.removed.push(id);
    return true;
  }
  async stats() { return { total: this.capabilities.size }; }
  async reload() {}

  // Helper to seed test data
  seed(caps) {
    for (const raw of caps) {
      const cap = new Capability(raw);
      this.capabilities.set(cap.id, cap);
    }
  }
}

class MockGraphStore {
  constructor() { this.edges = new Map(); }
  async loadAll() { return [...this.edges.values()]; }
  async getEdge(s, t) {
    const key = [s, t].sort().join("::");
    return this.edges.get(key) || null;
  }
  async getNeighbors(nodeId, limit = 10) {
    const result = [];
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId || edge.target === nodeId) result.push(edge);
    }
    result.sort((a, b) => b.weight - a.weight);
    return result.slice(0, limit);
  }
  async getByType(type) {
    return [...this.edges.values()].filter(e => e.type === type);
  }
  async addEdge(edge) {
    this.edges.set(edge.canonicalKey(), edge);
    return edge;
  }
  async updateEdge(edge) {
    this.edges.set(edge.canonicalKey(), edge);
  }
  async removeEdge(s, t) {
    const key = [s, t].sort().join("::");
    return this.edges.delete(key);
  }
  async removeNode(nodeId) {
    let count = 0;
    for (const [key, edge] of this.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(key);
        count++;
      }
    }
    return count;
  }
  async stats() {
    return { totalEdges: this.edges.size, byType: {}, avgWeight: 0, strongest: [] };
  }
}

class MockLSDProvider {
  constructor(suggestions = []) { this._suggestions = suggestions; }
  async discover(capabilities) {
    return this._suggestions;
  }
}

// ─── Tests ───

describe("manage_manifests", () => {
  const { addCapability, updateCapability, removeCapability, enableCapability, disableCapability, recordUsage, bulkImport } = require("./manage_manifests");

  it("addCapability creates and saves capability", async () => {
    const ms = new MockManifestStore();
    const gs = new MockGraphStore();
    const result = await addCapability({
      url: "https://exa.ai",
      title: "Exa Search",
      tier: "T1-API",
      category: "APIs and Web Services",
      description: "Web search",
      consumers: { mr_v: true, ministers: [], sherpas: [] },
      manifestStore: ms,
      graphStore: gs,
    });
    assert.strictEqual(result.status, "added");
    assert.ok(result.id);
    assert.ok(ms.saved.length > 0);
  });

  it("addCapability rejects duplicate", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "exa", name: "Exa" }]);
    const gs = new MockGraphStore();
    await assert.rejects(
      () => addCapability({ url: "https://exa.ai", manifestStore: ms, graphStore: gs }),
      { code: "MANIFEST_EXISTS" }
    );
  });

  it("updateCapability modifies fields", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "test", name: "Old Name", category: "Old" }]);
    const result = await updateCapability({
      id: "test",
      updates: { name: "New Name", category: "New" },
      manifestStore: ms,
    });
    assert.strictEqual(result.status, "updated");
    const updated = await ms.getById("test");
    assert.strictEqual(updated.name, "New Name");
  });

  it("removeCapability deletes manifest and graph edges", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "test", name: "Test" }]);
    const gs = new MockGraphStore();
    await gs.addEdge(new GraphEdge({ source: "test", target: "other", type: "category", weight: 0.2 }));
    const result = await removeCapability({ id: "test", manifestStore: ms, graphStore: gs });
    assert.strictEqual(result.status, "removed");
    assert.ok(ms.removed.includes("test"));
    assert.strictEqual(gs.edges.size, 0);
  });

  it("enableCapability and disableCapability toggle status", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "test", status: "disabled" }]);
    const enabled = await enableCapability({ id: "test", manifestStore: ms });
    assert.strictEqual(enabled.status, "enabled");
    const disabled = await disableCapability({ id: "test", manifestStore: ms });
    assert.strictEqual(disabled.status, "disabled");
  });

  it("recordUsage increments count", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "test", useCount: 3 }]);
    const usage = await recordUsage({ id: "test", manifestStore: ms });
    assert.strictEqual(usage.useCount, 4);
  });

  it("bulkImport processes multiple links", async () => {
    const ms = new MockManifestStore();
    const gs = new MockGraphStore();
    const result = await bulkImport({
      links: [
        { url: "https://a.com", title: "A" },
        { url: "https://b.com", title: "B" },
      ],
      manifestStore: ms,
      graphStore: gs,
    });
    assert.strictEqual(result.imported, 2);
    assert.strictEqual(result.failed, 0);
  });
});

describe("manage_graph", () => {
  const { coActivate, decay, buildFromRegistry, spreadActivation } = require("./manage_graph");

  it("coActivate creates edges between pairs", async () => {
    const gs = new MockGraphStore();
    const result = await coActivate({ nodeIds: ["a", "b", "c"], graphStore: gs });
    assert.strictEqual(result.edgesAffected, 3); // a-b, a-c, b-c
    assert.strictEqual(gs.edges.size, 3);
  });

  it("coActivate reinforces existing edges", async () => {
    const gs = new MockGraphStore();
    await gs.addEdge(new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.3 }));
    await coActivate({ nodeIds: ["a", "b"], graphStore: gs });
    const edge = await gs.getEdge("a", "b");
    assert.ok(edge.weight > 0.3); // reinforced
  });

  it("decay removes weak edges", async () => {
    const gs = new MockGraphStore();
    const oldDate = new Date(Date.now() - 365 * 86400000).toISOString(); // 1 year ago
    await gs.addEdge(new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.02, lastActivated: oldDate }));
    await gs.addEdge(new GraphEdge({ source: "c", target: "d", type: "co-usage", weight: 0.5 })); // recent
    const result = await decay({ graphStore: gs, halfLifeDays: 30, floor: 0.01 });
    assert.ok(result.removed >= 1); // old weak edge removed
  });

  it("buildFromRegistry creates category and consumer edges", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "a", category: "APIs", mrV: true, tier: "T1-API" },
      { id: "b", category: "APIs", mrV: true, tier: "T1-API" },
      { id: "c", category: "Design", tier: "T2-FETCH" },
    ]);
    const gs = new MockGraphStore();
    const result = await buildFromRegistry({ manifestStore: ms, graphStore: gs });
    assert.ok(result.categoryEdges > 0); // a-b share category
    assert.ok(result.consumerEdges > 0); // a-b share mr-v consumer
  });

  it("spreadActivation boosts neighbors", async () => {
    const gs = new MockGraphStore();
    await gs.addEdge(new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.3 }));
    await gs.addEdge(new GraphEdge({ source: "a", target: "c", type: "category", weight: 0.5 }));
    const result = await spreadActivation({ nodeId: "a", graphStore: gs });
    assert.strictEqual(result.neighborsActivated, 2);
    const edge = await gs.getEdge("a", "b");
    assert.ok(edge.weight > 0.3); // boosted
  });
});

describe("search_knowledge", () => {
  const { textSearch, semanticSearch, relatedTo } = require("./search_knowledge");

  it("textSearch returns matching capabilities", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "exa", name: "Exa Search", description: "Web search API", category: "APIs", status: "enabled" },
      { id: "ollama", name: "Ollama", description: "Local LLM", category: "AI", status: "enabled" },
    ]);
    const result = await textSearch({ query: "search", manifestStore: ms });
    assert.ok(result.count >= 1);
    assert.ok(result.capabilities.some(c => c.id === "exa"));
    assert.strictEqual(result.method, "text");
  });

  it("semanticSearch expands with graph neighbors", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "exa", name: "Exa Search", description: "Web search", category: "APIs", status: "enabled" },
      { id: "gemini", name: "Gemini", description: "Google AI", category: "AI", status: "enabled" },
    ]);
    const gs = new MockGraphStore();
    await gs.addEdge(new GraphEdge({ source: "exa", target: "gemini", type: "co-usage", weight: 0.5 }));
    const result = await semanticSearch({ query: "search", manifestStore: ms, graphStore: gs });
    assert.ok(result.count >= 1);
    assert.ok(result.capabilities.length >= 1);
  });

  it("relatedTo returns graph neighbors with capability data", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "a", name: "A", tier: "T1-API" },
      { id: "b", name: "B", tier: "T2-FETCH" },
    ]);
    const gs = new MockGraphStore();
    await gs.addEdge(new GraphEdge({ source: "a", target: "b", type: "category", weight: 0.3 }));
    const result = await relatedTo({ id: "a", graphStore: gs, manifestStore: ms });
    assert.ok(result.related.length > 0);
    assert.strictEqual(result.related[0].id, "b");
  });
});

describe("discover_connections", () => {
  const { discoverConnections, runLSD } = require("./discover_connections");

  it("discoverConnections creates LSD edges", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "exa", name: "Exa", tier: "T1-API" },
      { id: "gemini", name: "Gemini", tier: "T1-API" },
      { id: "ollama", name: "Ollama", tier: "T1-API" },
    ]);
    const gs = new MockGraphStore();
    const lsd = new MockLSDProvider([
      { source: "exa", target: "gemini", reason: "both search", strength: 0.3 },
    ]);
    const result = await discoverConnections({
      manifestStore: ms, graphStore: gs, lsdProvider: lsd, batchSize: 3,
    });
    assert.strictEqual(result.discovered, 1);
    assert.strictEqual(result.edges.length, 1);
    const edge = await gs.getEdge("exa", "gemini");
    assert.ok(edge);
    assert.strictEqual(edge.type, "lsd");
  });

  it("discoverConnections skips existing edges", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "exa", name: "Exa", tier: "T1-API" },
      { id: "gemini", name: "Gemini", tier: "T1-API" },
    ]);
    const gs = new MockGraphStore();
    await gs.addEdge(new GraphEdge({ source: "exa", target: "gemini", type: "category", weight: 0.2 }));
    const lsd = new MockLSDProvider([
      { source: "exa", target: "gemini", reason: "already connected", strength: 0.3 },
    ]);
    const result = await discoverConnections({
      manifestStore: ms, graphStore: gs, lsdProvider: lsd,
    });
    assert.strictEqual(result.discovered, 0);
    assert.strictEqual(result.skipped, 1);
  });

  it("runLSD runs multiple batches", async () => {
    const ms = new MockManifestStore();
    ms.seed([
      { id: "a", tier: "T1-API" },
      { id: "b", tier: "T1-API" },
      { id: "c", tier: "T1-API" },
    ]);
    const gs = new MockGraphStore();
    let callCount = 0;
    const lsd = {
      async discover() {
        callCount++;
        return [{ source: "a", target: `b`, reason: `batch-${callCount}`, strength: 0.2 }];
      }
    };
    const result = await runLSD({
      manifestStore: ms, graphStore: gs, lsdProvider: lsd, batches: 3, batchSize: 3,
    });
    assert.strictEqual(callCount, 3);
    assert.ok(result.totalDiscovered >= 1);
  });
});

describe("invoke_adapter", () => {
  const { invokeAdapter, describeAdapter } = require("./invoke_adapter");

  it("invokeAdapter calls adapter and records usage", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "exa", status: "enabled", adapter: "adapters/exa.js", tier: "T1-API" }]);
    const gs = new MockGraphStore();
    const runner = {
      async invoke(id, params) { return { results: ["test"] }; },
      async describe(id) { return { name: "Exa" }; },
    };
    const result = await invokeAdapter({
      id: "exa", params: { q: "test" },
      manifestStore: ms, adapterRunner: runner, graphStore: gs,
    });
    assert.deepStrictEqual(result, { results: ["test"] });
    const cap = await ms.getById("exa");
    assert.strictEqual(cap.useCount, 1); // usage recorded
  });

  it("invokeAdapter rejects non-invocable capability", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "ref", status: "enabled", tier: "T6-REFERENCE" }]);
    const runner = { async invoke() {} };
    await assert.rejects(
      () => invokeAdapter({ id: "ref", manifestStore: ms, adapterRunner: runner }),
      /not invocable/
    );
  });

  it("describeAdapter returns description", async () => {
    const ms = new MockManifestStore();
    ms.seed([{ id: "exa", adapter: "adapters/exa.js" }]);
    const runner = {
      async describe() { return { name: "Exa", params: { q: "string" } }; },
    };
    const desc = await describeAdapter({ id: "exa", manifestStore: ms, adapterRunner: runner });
    assert.ok(desc);
    assert.strictEqual(desc.name, "Exa");
  });
});
