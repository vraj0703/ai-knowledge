/**
 * manage_graph.js — Knowledge graph management use cases.
 *
 * Ported from v1 neural.js + graph.js buildFromRegistry.
 * All functions are pure with dependencies injected.
 *
 * Hebbian learning: co-activate strengthens edges, decay weakens unused ones.
 * Registry sync: buildFromRegistry creates consumer/category edges from manifests.
 * Spread activation: stimulating one node lightly reinforces its neighbors.
 */

const { GraphEdge } = require("../entities/graph_edge");
const {
  CONSUMER_EDGE_WEIGHT,
  CATEGORY_EDGE_WEIGHT,
  DECAY_HALF_LIFE_DAYS,
  DECAY_FLOOR,
  HEBBIAN_REINFORCE_RATE,
  HEBBIAN_NEW_EDGE_WEIGHT,
  HEBBIAN_SPREAD_RATE,
  SKIP_TIER,
} = require("../constants");

/**
 * Hebbian co-activation — reinforce edges between all pairs of nodeIds.
 * Creates new co-usage edges for pairs that have no edge yet.
 *
 * @param {object} deps
 * @param {string[]} deps.nodeIds - capability IDs that were used together
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @returns {Promise<{edgesAffected: number}>}
 */
async function coActivate({ nodeIds, graphStore }) {
  let edgesAffected = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const source = nodeIds[i];
      const target = nodeIds[j];
      const existing = await graphStore.getEdge(source, target);

      if (existing) {
        const reinforced = existing.reinforce(HEBBIAN_REINFORCE_RATE);
        await graphStore.updateEdge(reinforced);
      } else {
        const edge = new GraphEdge({
          source,
          target,
          type: "co-usage",
          weight: HEBBIAN_NEW_EDGE_WEIGHT,
        });
        await graphStore.addEdge(edge);
      }
      edgesAffected++;
    }
  }

  return { edgesAffected };
}

/**
 * Time-based decay — apply exponential decay to all edges, prune dead ones.
 *
 * @param {object} deps
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @param {number} [deps.halfLifeDays=30]
 * @param {number} [deps.floor=0.01]
 * @returns {Promise<{decayed: number, removed: number}>}
 */
async function decay({
  graphStore,
  halfLifeDays = DECAY_HALF_LIFE_DAYS,
  floor = DECAY_FLOOR,
}) {
  const edges = await graphStore.loadAll();
  let decayed = 0;
  let removed = 0;

  for (const edge of edges) {
    const decayedEdge = edge.decay(halfLifeDays);

    if (decayedEdge.isBelowFloor(floor)) {
      await graphStore.removeEdge(decayedEdge.source, decayedEdge.target);
      removed++;
    } else if (decayedEdge.weight !== edge.weight) {
      await graphStore.updateEdge(decayedEdge);
      decayed++;
    }
  }

  return { decayed, removed };
}

/**
 * Build graph edges from the manifest registry.
 * Creates consumer-group and category-group edges between capabilities.
 * Skips pairs where both are T6-REFERENCE (no actionable relationship).
 *
 * @param {object} deps
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @returns {Promise<{consumerEdges: number, categoryEdges: number}>}
 */
async function buildFromRegistry({ manifestStore, graphStore }) {
  const capabilities = await manifestStore.loadAll();
  let consumerEdges = 0;
  let categoryEdges = 0;

  // Build consumer index: Map<consumerKey, capabilityId[]>
  const consumerIndex = new Map();
  for (const cap of capabilities) {
    const consumers = [];
    if (cap.mrV) consumers.push("mr_v");
    if (cap.pm) consumers.push("pm");
    for (const m of cap.ministers) consumers.push(`minister:${m}`);
    for (const s of cap.sherpas) consumers.push(`sherpa:${s}`);

    for (const key of consumers) {
      if (!consumerIndex.has(key)) consumerIndex.set(key, []);
      consumerIndex.get(key).push(cap.id);
    }
  }

  // Build category index: Map<category, capabilityId[]>
  const categoryIndex = new Map();
  for (const cap of capabilities) {
    if (!categoryIndex.has(cap.category)) categoryIndex.set(cap.category, []);
    categoryIndex.get(cap.category).push(cap.id);
  }

  // Quick tier lookup
  const tierOf = new Map(capabilities.map((c) => [c.id, c.tier]));

  // Consumer edges: all pairs within each consumer group
  for (const [, ids] of consumerIndex) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (tierOf.get(ids[i]) === SKIP_TIER && tierOf.get(ids[j]) === SKIP_TIER) continue;
        await graphStore.addEdge(
          new GraphEdge({
            source: ids[i],
            target: ids[j],
            type: "consumer",
            weight: CONSUMER_EDGE_WEIGHT,
          })
        );
        consumerEdges++;
      }
    }
  }

  // Category edges: all pairs within each category group
  for (const [, ids] of categoryIndex) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (tierOf.get(ids[i]) === SKIP_TIER && tierOf.get(ids[j]) === SKIP_TIER) continue;
        await graphStore.addEdge(
          new GraphEdge({
            source: ids[i],
            target: ids[j],
            type: "category",
            weight: CATEGORY_EDGE_WEIGHT,
          })
        );
        categoryEdges++;
      }
    }
  }

  return { consumerEdges, categoryEdges };
}

/**
 * Spreading activation — lightly reinforce all neighbors of a node.
 * Models associative memory: using one capability primes its neighbors.
 *
 * @param {object} deps
 * @param {string} deps.nodeId - the activated capability ID
 * @param {import('../repositories/i_graph_store').IGraphStore} deps.graphStore
 * @returns {Promise<{node: string, neighborsActivated: number}>}
 */
async function spreadActivation({ nodeId, graphStore }) {
  const neighbors = await graphStore.getNeighbors(nodeId);
  let neighborsActivated = 0;

  for (const edge of neighbors) {
    const delta = HEBBIAN_SPREAD_RATE * (1 - edge.weight);
    if (delta > 0) {
      const reinforced = edge.reinforce(delta);
      await graphStore.updateEdge(reinforced);
      neighborsActivated++;
    }
  }

  return { node: nodeId, neighborsActivated };
}

module.exports = { coActivate, decay, buildFromRegistry, spreadActivation };
