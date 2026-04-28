/**
 * discover_connections.js — Lateral Synapse Discovery (LSD) use case.
 *
 * Finds unexpected connections between capabilities using an LLM provider.
 * Ported from v1 lsd.js with clean architecture dependency injection.
 */

const { GraphEdge } = require("../entities/graph_edge");
const {
  SKIP_TIER,
  LSD_BATCH_SIZE,
  LSD_BATCHES,
  LSD_MIN_STRENGTH,
  LSD_MAX_STRENGTH,
} = require("../constants");

/**
 * Fisher-Yates shuffle a copy of arr, return first n elements.
 * @param {any[]} arr
 * @param {number} n
 * @returns {any[]}
 */
function sample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Run a single batch of LSD discovery.
 *
 * @param {object} deps
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @param {import('../repositories/i_lsd_provider').ILSDProvider} deps.lsdProvider
 * @param {number} [deps.batchSize=20]
 * @returns {Promise<{discovered: number, edges: import('../entities/graph_edge').GraphEdge[], skipped: number}>}
 */
async function discoverConnections({ manifestStore, graphStore, lsdProvider, batchSize = LSD_BATCH_SIZE }) {
  // Load all capabilities, filter out reference-only tier
  const all = await manifestStore.loadAll();
  const eligible = all.filter((c) => c.tier !== SKIP_TIER);

  // Sample a random batch
  const sampled = sample(eligible, batchSize);

  // Ask the LSD provider for connection suggestions
  const suggestions = await lsdProvider.discover(sampled, []);

  const edges = [];
  let skipped = 0;

  for (const suggestion of suggestions) {
    const { source, target, reason, strength } = suggestion;

    // Verify both endpoints exist in the manifest store
    const sourceCapability = await manifestStore.getById(source);
    const targetCapability = await manifestStore.getById(target);
    if (!sourceCapability || !targetCapability) {
      skipped++;
      continue;
    }

    // Skip if edge already exists
    const existing = await graphStore.getEdge(source, target);
    if (existing) {
      skipped++;
      continue;
    }

    // Clamp strength to allowed LSD range
    const clampedStrength = Math.max(LSD_MIN_STRENGTH, Math.min(LSD_MAX_STRENGTH, strength));

    // Create and persist the new edge
    const edge = new GraphEdge({
      source,
      target,
      type: "lsd",
      weight: clampedStrength,
      reason,
    });

    await graphStore.addEdge(edge);
    edges.push(edge);
  }

  return { discovered: edges.length, edges, skipped };
}

/**
 * Run multiple batches of LSD discovery and aggregate results.
 *
 * @param {object} deps
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @param {import('../repositories/i_lsd_provider').ILSDProvider} deps.lsdProvider
 * @param {number} [deps.batches=3]
 * @param {number} [deps.batchSize=20]
 * @returns {Promise<{totalDiscovered: number, totalSkipped: number, timestamp: string, edges: import('../entities/graph_edge').GraphEdge[]}>}
 */
async function runLSD({ manifestStore, graphStore, lsdProvider, batches = LSD_BATCHES, batchSize = LSD_BATCH_SIZE }) {
  let totalDiscovered = 0;
  let totalSkipped = 0;
  const allEdges = [];

  for (let i = 0; i < batches; i++) {
    const result = await discoverConnections({ manifestStore, graphStore, lsdProvider, batchSize });
    totalDiscovered += result.discovered;
    totalSkipped += result.skipped;
    allEdges.push(...result.edges);
  }

  return {
    totalDiscovered,
    totalSkipped,
    timestamp: new Date().toISOString(),
    edges: allEdges,
  };
}

module.exports = { discoverConnections, runLSD, sample };
