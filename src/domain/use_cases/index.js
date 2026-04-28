// Use cases — implemented in phases 3-4
// Each file exports named functions with dependency injection.

const manageManifests = require("./manage_manifests");
const manageGraph = require("./manage_graph");
const searchKnowledge = require("./search_knowledge");
const invokeAdapterUC = require("./invoke_adapter");
const discoverConnectionsUC = require("./discover_connections");

module.exports = {
  ...manageManifests,
  ...manageGraph,
  ...searchKnowledge,
  ...invokeAdapterUC,
  ...discoverConnectionsUC,
};
