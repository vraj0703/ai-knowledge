/**
 * Raj Sadan Knowledge v2 — Capability Registry, Neural Graph, Hebbian Learning
 *
 * Port 3489 | 79 manifests | 58 adapters | SQLite graph | LSD discovery
 *
 * Run:   node knowledge/index.js
 * Or:    python raj_sadan.py start (includes knowledge in boot)
 */

const path = require("path");
const { createContainer } = require("./di/container");
const { KnowledgeController } = require("./presentation/state_management/controllers/knowledge_controller");
const { createServer } = require("./presentation/pages/server");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(process.env.KNOWLEDGE_PORT) || 3489;

async function main() {
  console.log();
  console.log("  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("  \u2551     Raj Sadan Knowledge v2          \u2551");
  console.log("  \u2551     Registry \u00b7 Graph \u00b7 Hebbian \u00b7 LSD  \u2551");
  console.log("  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");
  console.log();

  // Step 1: Create DI container
  const container = createContainer({ projectRoot: PROJECT_ROOT, port: PORT });

  // Step 2: Inject credentials into process.env
  const injected = await container.credentialStore.injectToEnv();
  console.log(`[knowledge-v2] Credentials injected: ${injected} API keys`);

  // Step 3: Load manifest stats
  const stats = await container.manifestStore.stats();
  console.log(`[knowledge-v2] Manifests loaded: ${stats.total} capabilities`);
  console.log(`[knowledge-v2] SQLite DB: ${container.config.dbPath}`);

  // Step 4: Graph stats
  const gStats = await container.graphStore.stats();
  console.log(`[knowledge-v2] Graph: ${gStats.totalEdges} edges, avg weight ${gStats.avgWeight}`);

  // Step 5: Create controller and server
  const knowledge = new KnowledgeController(container);
  const { listen } = createServer({ knowledge, port: PORT });
  await listen();

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[knowledge-v2] shutting down...");
    container.graphStore.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[knowledge-v2] fatal:", err);
  process.exit(1);
});
