/**
 * search_knowledge.js — Knowledge search use cases.
 *
 * Ported from v1 search.js. Implements text search, graph-expanded semantic
 * search, related-capability lookup, and LLM-powered suggestion.
 *
 * All functions are pure with dependencies injected.
 */

const { SearchResult } = require("../entities/search_result");
const { TIER_ORDER, SKIP_TIER } = require("../constants");

// ─── Helpers (not exported) ───

/**
 * Sort capabilities: enabled first, then by tier order, then by use_count desc.
 * @param {import('../entities/search_result').SearchResult[]} items
 * @returns {import('../entities/search_result').SearchResult[]}
 */
function sortCapabilities(items) {
  return [...items].sort((a, b) => {
    const capA = a.capability;
    const capB = b.capability;

    // Enabled first
    const activeA = capA.isActive() ? 0 : 1;
    const activeB = capB.isActive() ? 0 : 1;
    if (activeA !== activeB) return activeA - activeB;

    // Tier order
    const tierA = TIER_ORDER.indexOf(capA.tier);
    const tierB = TIER_ORDER.indexOf(capB.tier);
    if (tierA !== tierB) return tierA - tierB;

    // Use count descending
    return (capB.useCount || 0) - (capA.useCount || 0);
  });
}

/**
 * Deduplicate SearchResults by capability id. First occurrence wins.
 * @param {import('../entities/search_result').SearchResult[]} items
 * @returns {import('../entities/search_result').SearchResult[]}
 */
function dedup(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const id = item.capability.id;
    if (!seen.has(id)) {
      seen.add(id);
      result.push(item);
    }
  }
  return result;
}

// ─── Use Cases ───

/**
 * Plain text search across manifest fields.
 *
 * @param {object} deps
 * @param {string} deps.query
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @returns {Promise<{query: string, count: number, capabilities: object[], method: string}>}
 */
async function textSearch({ query, manifestStore }) {
  const results = await manifestStore.search(query);
  const wrapped = results.map(
    (cap) => new SearchResult({ capability: cap, score: 1, method: "text" })
  );
  const sorted = sortCapabilities(wrapped);

  return {
    query,
    count: sorted.length,
    capabilities: sorted.map((r) => r.toJSON()),
    method: "text",
  };
}

/**
 * Semantic search — text results expanded with graph neighbors.
 * For each text match (up to 5), fetch up to 5 graph neighbors and
 * include them as graph-expanded results. Dedup and sort.
 *
 * @param {object} deps
 * @param {string} deps.query
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @returns {Promise<{query: string, count: number, capabilities: object[], method: string}>}
 */
async function semanticSearch({ query, manifestStore, graphStore }) {
  const textResults = await manifestStore.search(query);

  const allResults = textResults.map(
    (cap) => new SearchResult({ capability: cap, score: 1, method: "text" })
  );

  // Expand with graph neighbors (up to 5 text results, up to 5 neighbors each)
  if (textResults.length > 0) {
    const toExpand = textResults.slice(0, 5);

    for (const cap of toExpand) {
      const neighborEdges = await graphStore.getNeighbors(cap.id, 5);

      for (const edge of neighborEdges) {
        const neighborId = edge.neighborOf(cap.id);
        if (!neighborId) continue;

        const neighborCap = await manifestStore.getById(neighborId);
        if (!neighborCap) continue;

        allResults.push(
          new SearchResult({
            capability: neighborCap,
            score: edge.weight,
            method: "graph-expanded",
          })
        );
      }
    }
  }

  const deduped = dedup(allResults);
  const sorted = sortCapabilities(deduped);

  return {
    query,
    count: sorted.length,
    capabilities: sorted.map((r) => r.toJSON()),
    method: "semantic",
  };
}

/**
 * Find capabilities related to a given capability via graph edges.
 *
 * @param {object} deps
 * @param {string} deps.id - capability ID
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {number} [deps.limit=10]
 * @returns {Promise<{id: string, related: Array<{id: string, name: string, tier: string, weight: number, edgeType: string}>}>}
 */
async function relatedTo({ id, graphStore, manifestStore, limit = 10 }) {
  const neighborEdges = await graphStore.getNeighbors(id, limit);
  const related = [];

  for (const edge of neighborEdges) {
    const neighborId = edge.neighborOf(id);
    if (!neighborId) continue;

    const cap = await manifestStore.getById(neighborId);
    if (!cap) continue;

    related.push({
      id: cap.id,
      name: cap.name,
      tier: cap.tier,
      weight: edge.weight,
      edgeType: edge.type,
    });
  }

  return { id, related };
}

/**
 * LLM-powered suggestion — recommend capabilities for a task.
 * Falls back to textSearch if no llmProvider is available.
 *
 * @param {object} deps
 * @param {string} deps.task - natural language task description
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @param {object} [deps.llmProvider] - must have .recommend(task, catalog) method
 * @returns {Promise<{task: string, suggestions: object[]}>}
 */
async function suggest({ task, manifestStore, graphStore, llmProvider }) {
  // Fall back to text search if no LLM
  if (!llmProvider) {
    const fallback = await textSearch({ query: task, manifestStore });
    return { task, suggestions: fallback.capabilities };
  }

  // Filter to enabled, actionable tiers (T1-T4)
  const all = await manifestStore.loadAll();
  const eligible = all.filter(
    (cap) =>
      cap.isActive() &&
      cap.tier !== SKIP_TIER &&
      cap.tier !== "T5-BROWSER"
  );

  // Build catalog string for LLM context
  const catalog = eligible
    .map((c) => `- ${c.id}: ${c.name} [${c.tier}] — ${c.description}`)
    .join("\n");

  // Ask LLM for recommendations
  const response = await llmProvider.recommend(task, catalog);

  // Parse response — expect array of {id, reason} or plain id strings
  let recommendedIds = [];
  if (Array.isArray(response)) {
    recommendedIds = response.map((r) => (typeof r === "string" ? r : r.id));
  } else if (typeof response === "string") {
    // Try to extract IDs from freeform text
    recommendedIds = eligible
      .filter((c) => response.includes(c.id))
      .map((c) => c.id);
  }

  // Enrich with capability data and graph neighbors
  const suggestions = [];
  for (const recId of recommendedIds) {
    const cap = await manifestStore.getById(recId);
    if (!cap) continue;

    const neighborEdges = await graphStore.getNeighbors(recId, 3);
    const neighbors = [];
    for (const edge of neighborEdges) {
      const nId = edge.neighborOf(recId);
      if (!nId) continue;
      const nCap = await manifestStore.getById(nId);
      if (nCap) {
        neighbors.push({ id: nCap.id, name: nCap.name, weight: edge.weight });
      }
    }

    suggestions.push({
      ...cap.toSummary(),
      method: "suggestion",
      related: neighbors,
    });
  }

  return { task, suggestions };
}

module.exports = { textSearch, semanticSearch, relatedTo, suggest };
