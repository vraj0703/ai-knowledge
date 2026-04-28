/**
 * invoke_adapter.js — Adapter invocation and description use case.
 *
 * Invokes capability adapters with usage tracking and Hebbian spread activation.
 */

const { ManifestNotFoundError, KnowledgeError } = require("../exceptions");
const { HEBBIAN_SPREAD_RATE } = require("../constants");

/**
 * Invoke a capability's adapter.
 *
 * After successful invocation: records usage on the manifest, and optionally
 * spreads a small Hebbian activation boost to graph neighbors.
 *
 * @param {object} deps
 * @param {string} deps.id - capability ID to invoke
 * @param {object} [deps.params] - parameters to pass to the adapter
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_adapter_runner').IAdapterRunner} deps.adapterRunner
 * @param {import('../repositories/i_graph_store').IGraphStore} [deps.graphStore] - optional, for spread activation
 * @returns {Promise<object>} adapter result
 */
async function invokeAdapter({ id, params, manifestStore, adapterRunner, graphStore }) {
  // Verify the capability exists
  const capability = await manifestStore.getById(id);
  if (!capability) {
    throw new ManifestNotFoundError(id);
  }

  // Verify it can be invoked
  if (!capability.isInvocable()) {
    throw new KnowledgeError("Capability is not invocable", "NOT_INVOCABLE");
  }

  // Invoke the adapter
  const result = await adapterRunner.invoke(id, params);

  // Record usage: get fresh copy, bump counter, save back
  const fresh = await manifestStore.getById(id);
  if (fresh) {
    const updated = fresh.recordUsage();
    await manifestStore.save(updated);
  }

  // Spread activation to graph neighbors (small Hebbian boost)
  if (graphStore) {
    const neighbors = await graphStore.getNeighbors(id);
    for (const edge of neighbors) {
      const reinforced = edge.reinforce(HEBBIAN_SPREAD_RATE);
      await graphStore.updateEdge(reinforced);
    }
  }

  return result;
}

/**
 * Describe a capability's adapter (metadata, parameters, etc.).
 *
 * @param {object} deps
 * @param {string} deps.id - capability ID
 * @param {import('../repositories/i_manifest_store').IManifestStore} deps.manifestStore
 * @param {import('../repositories/i_adapter_runner').IAdapterRunner} deps.adapterRunner
 * @returns {Promise<object|null>} adapter description or null
 */
async function describeAdapter({ id, manifestStore, adapterRunner }) {
  const capability = await manifestStore.getById(id);
  if (!capability) {
    throw new ManifestNotFoundError(id);
  }

  const description = await adapterRunner.describe(id);
  return description || null;
}

module.exports = { invokeAdapter, describeAdapter };
