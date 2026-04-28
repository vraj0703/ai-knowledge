#!/usr/bin/env node
/**
 * ai-knowledge CLI dispatcher.
 *
 * Subcommands:
 *   serve      — start the HTTP service (default)
 *   mcp        — start the MCP server on stdio
 *   search     — search the capability registry
 *   lookup     — look up one capability by id
 *   register   — add a new manifest from CLI args
 *   --version | --help
 */

const args = process.argv.slice(2);
const cmd = args[0];

function printHelp() {
  console.log(`\
ai-knowledge — capability registry for AI agents.

usage:
  ai-knowledge [serve]                start the HTTP service
  ai-knowledge mcp                    start the MCP server on stdio
  ai-knowledge search <query>         search the registry
  ai-knowledge lookup <id>            look up one capability
  ai-knowledge register <id> <name>   register a new manifest
  ai-knowledge --version | --help

env:
  KNOWLEDGE_PORT                  HTTP port (default 3489)
  KNOWLEDGE_USE_REAL              comma-separated integrations to switch
                                  from mock to real, or "all"
                                  keys: graph, manifests, credentials,
                                  adapters, lsd
`);
}

(async () => {
  if (!cmd || cmd === "serve") {
    require("../src/index.js");
    return;
  }
  if (cmd === "--version" || cmd === "-V") {
    console.log(require("../package.json").version);
    return;
  }
  if (cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }
  if (cmd === "search") {
    const query = args.slice(1).join(" ");
    const { createContainer } = require("../src/di/container.js");
    const c = createContainer({ projectRoot: process.cwd() });
    const results = await c.manifestStore.search(query);
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  if (cmd === "lookup") {
    const id = args[1];
    if (!id) { console.error("error: lookup requires an id"); process.exit(2); }
    const { createContainer } = require("../src/di/container.js");
    const c = createContainer({ projectRoot: process.cwd() });
    const item = await c.manifestStore.get(id);
    console.log(JSON.stringify(item, null, 2));
    return;
  }
  if (cmd === "register") {
    const id = args[1];
    const name = args[2];
    if (!id || !name) { console.error("error: register requires id + name"); process.exit(2); }
    const { createContainer } = require("../src/di/container.js");
    const c = createContainer({ projectRoot: process.cwd() });
    await c.manifestStore.upsert({
      id, name,
      description: args.slice(3).join(" ") || "(no description)",
      kind: "tool",
      tier: "T6-REFERENCE",
      status: "enabled",
      categories: [],
    });
    console.log(JSON.stringify({ id, registered: true }, null, 2));
    return;
  }
  if (cmd === "mcp") {
    const { createContainer } = require("../src/di/container.js");
    const { createMcpServer, startStdio } = require("../src/presentation/mcp/server.js");
    const pkg = require("../package.json");
    const c = createContainer({ projectRoot: process.cwd() });
    const server = createMcpServer({
      container: c,
      info: { name: pkg.name, version: pkg.version },
    });
    await startStdio(server);
    return;
  }
  console.error(`unknown command: ${cmd}`);
  printHelp();
  process.exit(2);
})();
