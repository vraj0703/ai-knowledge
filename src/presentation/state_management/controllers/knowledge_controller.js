/**
 * KnowledgeController — HTTP-to-domain adapter.
 *
 * Wraps all use cases, stores repos as instance properties.
 * Each method orchestrates one or more use case functions.
 */

const {
  addCapability, updateCapability, removeCapability,
  enableCapability, disableCapability, recordUsage, bulkImport,
  coActivate, decay, buildFromRegistry, spreadActivation,
  textSearch, semanticSearch, relatedTo, suggest,
  discoverConnections, runLSD,
  invokeAdapter, describeAdapter,
} = require("../../../domain/use_cases");

class KnowledgeController {
  constructor(deps) {
    this.manifestStore = deps.manifestStore;
    this.graphStore = deps.graphStore;
    this.credentialStore = deps.credentialStore;
    this.adapterRunner = deps.adapterRunner;
    this.lsdProvider = deps.lsdProvider;
  }

  // ─── Manifest Management ───

  async addCapability(url, title, opts = {}) {
    return addCapability({
      url, title, ...opts,
      manifestStore: this.manifestStore,
      graphStore: this.graphStore,
    });
  }

  async updateCapability(id, updates) {
    return updateCapability({ id, updates, manifestStore: this.manifestStore });
  }

  async removeCapability(id) {
    return removeCapability({
      id, manifestStore: this.manifestStore, graphStore: this.graphStore,
    });
  }

  async enableCapability(id) {
    return enableCapability({ id, manifestStore: this.manifestStore });
  }

  async disableCapability(id) {
    return disableCapability({ id, manifestStore: this.manifestStore });
  }

  async recordUsage(id) {
    return recordUsage({ id, manifestStore: this.manifestStore });
  }

  async bulkImport(links) {
    return bulkImport({
      links, manifestStore: this.manifestStore, graphStore: this.graphStore,
    });
  }

  async listCapabilities(filters) {
    return this.manifestStore.list(filters);
  }

  async getCapability(id) {
    return this.manifestStore.getById(id);
  }

  async getForConsumer(consumer) {
    return this.manifestStore.getForConsumer(consumer);
  }

  async getStats() {
    const registryStats = await this.manifestStore.stats();
    const graphStats = await this.graphStore.stats();
    return { registry: registryStats, graph: graphStats };
  }

  // ─── Search ───

  async textSearch(query) {
    return textSearch({ query, manifestStore: this.manifestStore });
  }

  async semanticSearch(query) {
    return semanticSearch({
      query, manifestStore: this.manifestStore, graphStore: this.graphStore,
    });
  }

  async relatedTo(id, limit) {
    return relatedTo({
      id, graphStore: this.graphStore, manifestStore: this.manifestStore, limit,
    });
  }

  async suggest(task) {
    return suggest({
      task, manifestStore: this.manifestStore, graphStore: this.graphStore,
    });
  }

  // ─── Graph ───

  async coActivate(nodeIds) {
    return coActivate({ nodeIds, graphStore: this.graphStore });
  }

  async decay(halfLifeDays) {
    return decay({ graphStore: this.graphStore, halfLifeDays });
  }

  async buildFromRegistry() {
    return buildFromRegistry({
      manifestStore: this.manifestStore, graphStore: this.graphStore,
    });
  }

  async graphStats() {
    return this.graphStore.stats();
  }

  async graphEdges(id) {
    return this.graphStore.getNeighbors(id);
  }

  // ─── LSD ───

  async runLSD() {
    return runLSD({
      manifestStore: this.manifestStore,
      graphStore: this.graphStore,
      lsdProvider: this.lsdProvider,
    });
  }

  // ─── Adapter ───

  async invokeAdapter(id, params) {
    return invokeAdapter({
      id, params,
      manifestStore: this.manifestStore,
      adapterRunner: this.adapterRunner,
      graphStore: this.graphStore,
    });
  }

  async describeAdapter(id) {
    return describeAdapter({
      id, manifestStore: this.manifestStore, adapterRunner: this.adapterRunner,
    });
  }
}

module.exports = { KnowledgeController };
