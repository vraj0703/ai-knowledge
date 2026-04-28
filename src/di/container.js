/**
 * DI Container — wires all knowledge dependencies together.
 *
 * Mock-default: every external integration ships with a stub so the organ
 * runs `clone + npm install + npm start` without SQLite, Ollama, or
 * Langflow. The InMemoryManifestStore ships seeded with 5 generic
 * capabilities so search returns sensible results out of the box.
 *
 * Set KNOWLEDGE_USE_REAL to swap individual integrations to real:
 *   KNOWLEDGE_USE_REAL="graph"            — real SQLite graph
 *   KNOWLEDGE_USE_REAL="manifests,graph"  — plus real TOML manifests
 *   KNOWLEDGE_USE_REAL="all"              — everything real
 *
 * Knobs in `config`:
 *   projectRoot, port, useReal, dbPath, manifestsDir, adaptersDir,
 *   credentialsPath, ollamaHost, ollamaModel, langflowHost, forceDirect.
 */

const path = require("path");

// Real implementations
const { SQLiteGraphStore } = require("../data/data_sources/local/sqlite_graph_store");
const { TOMLManifestStore } = require("../data/repositories/toml_manifest_store");
const { FileCredentialStore } = require("../data/repositories/file_credential_store");
const { NodeAdapterRunner } = require("../data/repositories/node_adapter_runner");
const { LangflowLSDProvider } = require("../data/data_sources/remote/langflow_lsd_provider");
const { DirectLSDProvider } = require("../data/data_sources/remote/direct_lsd_provider");

// Mocks
const { InMemoryGraphStore } = require("../data/repositories/mocks/in_memory_graph_store");
const { InMemoryManifestStore } = require("../data/repositories/mocks/in_memory_manifest_store");
const { StubCredentialStore } = require("../data/repositories/mocks/stub_credential_store");
const { StubAdapterRunner } = require("../data/repositories/mocks/stub_adapter_runner");
const { StubLSDProvider } = require("../data/repositories/mocks/stub_lsd_provider");

const {
  KNOWLEDGE_PORT,
  OLLAMA_HOST,
  OLLAMA_MODEL,
  LANGFLOW_HOST,
  DB_PATH,
} = require("../domain/constants");

const KNOWN_KEYS = ["graph", "manifests", "credentials", "adapters", "lsd"];

function _parseUseReal(value) {
  if (!value) return new Set();
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "all") return new Set(KNOWN_KEYS);
    return new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

function createContainer(config = {}) {
  const projectRoot = config.projectRoot || process.cwd();
  const port = config.port || KNOWLEDGE_PORT;
  const useReal = _parseUseReal(config.useReal ?? process.env.KNOWLEDGE_USE_REAL);
  const _real = (key) => useReal.has(key);

  const dbPath = config.dbPath || path.join(projectRoot, DB_PATH);
  const manifestsDir = config.manifestsDir || path.join(projectRoot, "data", "manifests");
  const adaptersDir = config.adaptersDir || path.join(projectRoot, "data", "adapters");
  const credentialsPath =
    config.credentialsPath || path.join(projectRoot, "config", "secrets", "knowledge.credentials.toml");

  // ─── Stores ───
  const graphStore = _real("graph")
    ? new SQLiteGraphStore({ dbPath })
    : new InMemoryGraphStore();

  const manifestStore = _real("manifests")
    ? new TOMLManifestStore({ manifestsDir })
    : new InMemoryManifestStore();

  const credentialStore = _real("credentials")
    ? new FileCredentialStore({ credentialsPath })
    : new StubCredentialStore();

  const adapterRunner = _real("adapters")
    ? new NodeAdapterRunner({ adaptersDir, manifestStore })
    : new StubAdapterRunner();

  // ─── LSD provider ───
  const langflowHost = config.langflowHost || LANGFLOW_HOST;
  const ollamaHost = config.ollamaHost || OLLAMA_HOST;
  const ollamaModel = config.ollamaModel || OLLAMA_MODEL;

  let lsdProvider;
  if (_real("lsd")) {
    if (config.forceDirect) {
      lsdProvider = new DirectLSDProvider({ host: ollamaHost, model: ollamaModel });
    } else {
      lsdProvider = new LangflowLSDProvider({ host: langflowHost });
    }
  } else {
    lsdProvider = new StubLSDProvider();
  }

  return {
    graphStore,
    manifestStore,
    credentialStore,
    adapterRunner,
    lsdProvider,
    config: {
      projectRoot,
      port,
      dbPath,
      manifestsDir,
      adaptersDir,
      credentialsPath,
      ollamaHost,
      ollamaModel,
      langflowHost,
      useReal: Array.from(useReal),
    },
  };
}

module.exports = { createContainer, KNOWN_KEYS };
