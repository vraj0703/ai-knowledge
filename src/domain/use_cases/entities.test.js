const { describe, it } = require("node:test");
const assert = require("node:assert");
const { Capability, VALID_TIERS, VALID_STATUSES } = require("../entities/capability");
const { GraphEdge, VALID_EDGE_TYPES } = require("../entities/graph_edge");
const { SearchResult } = require("../entities/search_result");

// ─── Capability ───

describe("Capability", () => {
  it("requires an id", () => {
    assert.throws(() => new Capability({}), /id is required/);
  });

  it("constructs with minimal fields", () => {
    const cap = new Capability({ id: "test" });
    assert.strictEqual(cap.id, "test");
    assert.strictEqual(cap.name, "test");
    assert.strictEqual(cap.tier, "T1-API");
    assert.strictEqual(cap.status, "enabled");
    assert.strictEqual(cap.free, true);
    assert.strictEqual(cap.mrV, true);
    assert.strictEqual(cap.pm, false);
    assert.strictEqual(cap.useCount, 0);
  });

  it("constructs with full v1 manifest fields", () => {
    const cap = new Capability({
      id: "exa",
      name: "Exa Search",
      url: "https://exa.ai",
      tier: "T1-API",
      status: "enabled",
      free: true,
      category: "APIs and Web Services",
      description: "Web search API",
      method: "api",
      apiDocs: "https://docs.exa.ai",
      authType: "api-key",
      authEnv: "EXA_API_KEY",
      adapter: "adapters/exa.js",
      ministers: ["planning", "external-affairs"],
      sherpas: [],
      mrV: true,
      pm: false,
      useCount: 5,
      lastUsed: "2026-04-01T00:00:00Z",
    });
    assert.strictEqual(cap.id, "exa");
    assert.strictEqual(cap.apiDocs, "https://docs.exa.ai");
    assert.strictEqual(cap.authEnv, "EXA_API_KEY");
    assert.deepStrictEqual(cap.ministers, ["planning", "external-affairs"]);
    assert.strictEqual(cap.useCount, 5);
  });

  it("validates tier against v1 values", () => {
    const cap = new Capability({ id: "t", tier: "T6-REFERENCE" });
    assert.strictEqual(cap.tier, "T6-REFERENCE");
    const bad = new Capability({ id: "t", tier: "INVALID" });
    assert.strictEqual(bad.tier, "T1-API"); // defaults
  });

  it("validates status", () => {
    for (const s of VALID_STATUSES) {
      assert.strictEqual(new Capability({ id: "t", status: s }).status, s);
    }
    assert.strictEqual(new Capability({ id: "t", status: "bad" }).status, "enabled");
  });

  it("isActive/isParked/isInvocable", () => {
    const active = new Capability({ id: "a", status: "enabled", adapter: "x.js", tier: "T1-API" });
    assert.ok(active.isActive());
    assert.ok(active.isInvocable());
    assert.ok(!active.isParked());

    const parked = new Capability({ id: "p", status: "parked" });
    assert.ok(parked.isParked());
    assert.ok(!parked.isActive());

    const ref = new Capability({ id: "r", status: "enabled", adapter: "x.js", tier: "T6-REFERENCE" });
    assert.ok(!ref.isInvocable()); // T6-REFERENCE is never invocable
  });

  it("matchesQuery searches id, name, description, category", () => {
    const cap = new Capability({
      id: "exa",
      name: "Exa Search",
      description: "Web search API",
      category: "APIs and Web Services",
    });
    assert.ok(cap.matchesQuery("exa"));
    assert.ok(cap.matchesQuery("web search"));
    assert.ok(cap.matchesQuery("APIs"));
    assert.ok(!cap.matchesQuery("nonexistent"));
  });

  it("recordUsage returns new Capability with incremented count", () => {
    const cap = new Capability({ id: "test", useCount: 3 });
    const updated = cap.recordUsage();
    assert.strictEqual(updated.useCount, 4);
    assert.ok(updated.lastUsed); // timestamp set
    assert.strictEqual(cap.useCount, 3); // original unchanged
  });

  it("toManifest produces valid TOML matching v1 format", () => {
    const cap = new Capability({
      id: "exa",
      name: "Exa Search",
      url: "https://exa.ai",
      tier: "T1-API",
      status: "enabled",
      category: "APIs and Web Services",
      description: "Web search API",
      method: "api",
      authType: "api-key",
      authEnv: "EXA_API_KEY",
      adapter: "adapters/exa.js",
      ministers: ["planning"],
      sherpas: [],
      mrV: true,
      pm: false,
    });
    const toml = cap.toManifest();
    assert.ok(toml.includes('[capability]'));
    assert.ok(toml.includes('id          = "exa"'));
    assert.ok(toml.includes('[integration]'));
    assert.ok(toml.includes('auth_env    = "EXA_API_KEY"'));
    assert.ok(toml.includes('[consumers]'));
    assert.ok(toml.includes('ministers   = ["planning"]'));
    assert.ok(toml.includes('[usage]'));
  });

  it("fromManifest round-trips correctly", () => {
    const manifest = {
      capability: { id: "test", name: "Test", url: "https://test.com", tier: "T2-FETCH", status: "disabled", free: false, category: "Web Utilities", description: "desc" },
      integration: { method: "fetch", api_docs: "", auth_type: "none", auth_env: "", adapter: "" },
      consumers: { ministers: ["planning"], sherpas: ["crawler"], mr_v: true, pm: false },
      usage: { use_count: 7, last_used: "2026-01-01T00:00:00Z" },
    };
    const cap = Capability.fromManifest(manifest, "test.toml");
    assert.strictEqual(cap.id, "test");
    assert.strictEqual(cap.tier, "T2-FETCH");
    assert.strictEqual(cap.free, false);
    assert.deepStrictEqual(cap.ministers, ["planning"]);
    assert.deepStrictEqual(cap.sherpas, ["crawler"]);
    assert.strictEqual(cap.useCount, 7);
    assert.strictEqual(cap._file, "test.toml");
  });

  it("toSummary returns compact object", () => {
    const cap = new Capability({ id: "exa", name: "Exa", tier: "T1-API", useCount: 5 });
    const s = cap.toSummary();
    assert.strictEqual(s.id, "exa");
    assert.strictEqual(s.use_count, 5);
    assert.strictEqual(s.tier, "T1-API");
    assert.ok(!("_file" in s));
    assert.ok(!("ministers" in s));
  });
});

// ─── GraphEdge ───

describe("GraphEdge", () => {
  it("requires source and target", () => {
    assert.throws(() => new GraphEdge({ target: "b", type: "co-usage" }), /source is required/);
    assert.throws(() => new GraphEdge({ source: "a", type: "co-usage" }), /target is required/);
  });

  it("rejects same source and target", () => {
    assert.throws(() => new GraphEdge({ source: "a", target: "a", type: "co-usage" }), /must differ/);
  });

  it("validates edge type", () => {
    assert.throws(() => new GraphEdge({ source: "a", target: "b", type: "invalid" }), /Invalid edge type/);
    for (const t of VALID_EDGE_TYPES) {
      assert.strictEqual(new GraphEdge({ source: "a", target: "b", type: t }).type, t);
    }
  });

  it("sorts source and target canonically", () => {
    const edge = new GraphEdge({ source: "zebra", target: "alpha", type: "co-usage" });
    assert.strictEqual(edge.source, "alpha");
    assert.strictEqual(edge.target, "zebra");
  });

  it("canonicalKey is consistent regardless of input order", () => {
    const e1 = new GraphEdge({ source: "a", target: "b", type: "co-usage" });
    const e2 = new GraphEdge({ source: "b", target: "a", type: "co-usage" });
    assert.strictEqual(e1.canonicalKey(), e2.canonicalKey());
    assert.strictEqual(e1.canonicalKey(), "a::b");
  });

  it("clamps weight to 0-1", () => {
    assert.strictEqual(new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 1.5 }).weight, 1);
    assert.strictEqual(new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: -0.5 }).weight, 0);
  });

  it("reinforce with logarithmic dampening", () => {
    const edge = new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.5 });
    const r1 = edge.reinforce(0.1);
    // weight = min(1, 0.5 + 0.1 * (1 - 0.5)) = 0.55
    assert.ok(Math.abs(r1.weight - 0.55) < 0.001);
    assert.strictEqual(edge.weight, 0.5); // immutable

    // Near 1.0, growth slows
    const high = new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.95 });
    const r2 = high.reinforce(0.1);
    // weight = min(1, 0.95 + 0.1 * 0.05) = 0.955
    assert.ok(Math.abs(r2.weight - 0.955) < 0.001);
  });

  it("weaken by multiplicative factor", () => {
    const edge = new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.5 });
    const w = edge.weaken(0.8);
    assert.ok(Math.abs(w.weight - 0.4) < 0.001);
    assert.strictEqual(edge.weight, 0.5); // immutable
  });

  it("decay with half-life", () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const edge = new GraphEdge({
      source: "a", target: "b", type: "co-usage",
      weight: 1.0, lastActivated: thirtyDaysAgo.toISOString(),
    });
    const decayed = edge.decay(30);
    // After exactly 1 half-life, weight should be ~0.5
    assert.ok(Math.abs(decayed.weight - 0.5) < 0.05);
  });

  it("isBelowFloor detects weak edges", () => {
    const weak = new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.005 });
    assert.ok(weak.isBelowFloor(0.01));
    const strong = new GraphEdge({ source: "a", target: "b", type: "co-usage", weight: 0.5 });
    assert.ok(!strong.isBelowFloor(0.01));
  });

  it("neighborOf returns correct neighbor", () => {
    const edge = new GraphEdge({ source: "alpha", target: "beta", type: "co-usage" });
    assert.strictEqual(edge.neighborOf("alpha"), "beta");
    assert.strictEqual(edge.neighborOf("beta"), "alpha");
    assert.strictEqual(edge.neighborOf("gamma"), null);
  });
});

// ─── SearchResult ───

describe("SearchResult", () => {
  it("requires capability", () => {
    assert.throws(() => new SearchResult({}), /capability is required/);
  });

  it("constructs with defaults", () => {
    const cap = new Capability({ id: "test" });
    const sr = new SearchResult({ capability: cap });
    assert.strictEqual(sr.score, 0);
    assert.strictEqual(sr.method, "text");
  });

  it("toJSON includes capability summary + search metadata", () => {
    const cap = new Capability({ id: "exa", name: "Exa", tier: "T1-API" });
    const sr = new SearchResult({ capability: cap, score: 0.9, method: "semantic" });
    const json = sr.toJSON();
    assert.strictEqual(json.id, "exa");
    assert.strictEqual(json.score, 0.9);
    assert.strictEqual(json.method, "semantic");
  });
});
