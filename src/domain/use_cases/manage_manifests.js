/**
 * ManageManifests — CRUD use case for knowledge capabilities.
 *
 * Ported from v1 importer.js + registry enable/disable/usage logic.
 * All functions take a single params object with dependencies injected.
 */

const { Capability } = require("../entities/capability");
const { GraphEdge } = require("../entities/graph_edge");
const { ManifestNotFoundError, ManifestExistsError } = require("../exceptions");
const { TIER_METHOD, CATEGORY_EDGE_WEIGHT, CONSUMER_EDGE_WEIGHT } = require("../constants");

// ─── Private helpers ────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function deriveId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      return parts.length >= 2 ? slugify(parts[1]) : slugify(parts[0] || host);
    }
    return slugify(host.replace(/\.(com|org|net|io|dev|ai|co|app)$/i, ""));
  } catch {
    return slugify(url);
  }
}

// ─── Use cases ──────────────────────────────────────────────────

/**
 * Add a new capability to the knowledge system.
 *
 * @param {object} params
 * @param {string} params.url
 * @param {string} [params.title]
 * @param {string} [params.tier]
 * @param {string} [params.category]
 * @param {string} [params.description]
 * @param {object} [params.consumers]
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} params.graphStore
 * @param {object} [params.llmProvider] - { classify({ url, title }) => { tier, category, description, consumers } | null }
 * @returns {Promise<{ id: string, name: string, tier: string, category: string, status: string }>}
 */
async function addCapability({
  url,
  title,
  tier,
  category,
  description,
  consumers,
  manifestStore,
  graphStore,
  llmProvider,
}) {
  const id = deriveId(url);

  const existing = await manifestStore.getById(id);
  if (existing) throw new ManifestExistsError(id);

  // Auto-classify via LLM if fields missing
  if ((!tier || !category || !description) && llmProvider) {
    try {
      const cls = await llmProvider.classify({ url, title });
      if (cls) {
        tier = tier || cls.tier;
        category = category || cls.category;
        description = description || cls.description;
        consumers = consumers || cls.consumers;
      }
    } catch {
      /* fallback to defaults below */
    }
  }

  // Defaults
  tier = tier || "T5-BROWSER";
  category = category || "Web Utilities";
  description = description || title || "";
  consumers = consumers || { mr_v: true, ministers: [], sherpas: [] };

  const cap = new Capability({
    id,
    name: title || id,
    url,
    tier,
    status: "disabled",
    free: true,
    category,
    description,
    method: TIER_METHOD[tier] || "reference",
    ministers: consumers.ministers || [],
    sherpas: consumers.sherpas || [],
    mrV: consumers.mr_v !== undefined ? consumers.mr_v : true,
  });

  await manifestStore.save(cap);

  // Create graph edges — category peers
  const categoryPeers = await manifestStore.getByCategory(category);
  for (const peer of categoryPeers) {
    if (peer.id !== id) {
      const edge = new GraphEdge({
        source: id,
        target: peer.id,
        type: "category",
        weight: CATEGORY_EDGE_WEIGHT,
      });
      await graphStore.addEdge(edge);
    }
  }

  // Create graph edges — consumer peers
  const consumerNames = [
    ...(consumers.ministers || []),
    ...(consumers.sherpas || []),
    ...(consumers.mr_v ? ["mr_v"] : []),
  ];
  for (const consumer of consumerNames) {
    const consumerPeers = await manifestStore.getForConsumer(consumer);
    for (const peer of consumerPeers) {
      if (peer.id !== id) {
        const edge = new GraphEdge({
          source: id,
          target: peer.id,
          type: "consumer",
          weight: CONSUMER_EDGE_WEIGHT,
        });
        await graphStore.addEdge(edge);
      }
    }
  }

  return { id, name: cap.name, tier: cap.tier, category: cap.category, status: "added" };
}

/**
 * Update an existing capability's fields.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {object} params.updates
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @returns {Promise<{ id: string, name: string, tier: string, status: string, category: string }>}
 */
async function updateCapability({ id, updates, manifestStore }) {
  const cap = await manifestStore.getById(id);
  if (!cap) throw new ManifestNotFoundError(id);

  // Apply scalar fields
  const scalarFields = ["tier", "category", "description", "status", "name", "url", "free"];
  for (const field of scalarFields) {
    if (updates[field] !== undefined) {
      cap[field] = updates[field];
    }
  }

  // Apply method — updates integration method
  if (updates.method !== undefined) cap.method = updates.method;

  // Apply consumer fields
  if (updates.ministers !== undefined) cap.ministers = updates.ministers;
  if (updates.sherpas !== undefined) cap.sherpas = updates.sherpas;
  if (updates.mrV !== undefined) cap.mrV = updates.mrV;

  await manifestStore.save(cap);

  return { id: cap.id, name: cap.name, tier: cap.tier, status: "updated", category: cap.category };
}

/**
 * Remove a capability and its graph edges.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} params.graphStore
 * @returns {Promise<{ id: string, status: string }>}
 */
async function removeCapability({ id, manifestStore, graphStore }) {
  const cap = await manifestStore.getById(id);
  if (!cap) throw new ManifestNotFoundError(id);

  await manifestStore.remove(id);
  await graphStore.removeNode(id);

  return { id, status: "removed" };
}

/**
 * Enable a capability.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @returns {Promise<Capability>}
 */
async function enableCapability({ id, manifestStore }) {
  const cap = await manifestStore.getById(id);
  if (!cap) throw new ManifestNotFoundError(id);

  cap.status = "enabled";
  await manifestStore.save(cap);

  return cap;
}

/**
 * Disable a capability.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @returns {Promise<Capability>}
 */
async function disableCapability({ id, manifestStore }) {
  const cap = await manifestStore.getById(id);
  if (!cap) throw new ManifestNotFoundError(id);

  cap.status = "disabled";
  await manifestStore.save(cap);

  return cap;
}

/**
 * Record a usage event for a capability.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @returns {Promise<{ useCount: number, lastUsed: string }>}
 */
async function recordUsage({ id, manifestStore }) {
  const cap = await manifestStore.getById(id);
  if (!cap) throw new ManifestNotFoundError(id);

  const updated = cap.recordUsage();
  await manifestStore.save(updated);

  return { useCount: updated.useCount, lastUsed: updated.lastUsed };
}

/**
 * Bulk import multiple links as capabilities.
 *
 * @param {object} params
 * @param {Array<{ url: string, title?: string, tier?: string, category?: string, description?: string, consumers?: object }>} params.links
 * @param {import('../repositories/i_manifest_store').IManifestStore} params.manifestStore
 * @param {import('../repositories/i_graph_store').IGraphStore} params.graphStore
 * @param {object} [params.llmProvider]
 * @returns {Promise<{ imported: number, failed: number, results: Array }>}
 */
async function bulkImport({ links, manifestStore, graphStore, llmProvider }) {
  const results = [];
  let imported = 0;
  let failed = 0;

  for (const link of links) {
    try {
      const result = await addCapability({
        url: link.url,
        title: link.title,
        tier: link.tier,
        category: link.category,
        description: link.description,
        consumers: link.consumers,
        manifestStore,
        graphStore,
        llmProvider,
      });
      results.push(result);
      if (result.status === "added") imported++;
      else failed++;
    } catch (err) {
      results.push({ url: link.url, status: "error", reason: err.message });
      failed++;
    }
  }

  return { imported, failed, results };
}

module.exports = {
  addCapability,
  updateCapability,
  removeCapability,
  enableCapability,
  disableCapability,
  recordUsage,
  bulkImport,
};
