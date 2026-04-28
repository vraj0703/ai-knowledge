/**
 * MCP server — exposes ai-knowledge primitives as MCP tools.
 *
 * Four tools:
 *   knowledge_search     — find relevant capabilities by query
 *   knowledge_lookup     — get one capability by id
 *   knowledge_register   — add a new capability manifest
 *   knowledge_use        — record a capability invocation (Hebbian reinforce)
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const { HEBBIAN_REINFORCE_RATE } = require("../../domain/constants");

function createMcpServer({ container, info = {} }) {
  const server = new McpServer({
    name: info.name || "ai-knowledge",
    version: info.version || "0.1.0",
  });

  // ── knowledge_search ─────────────────────────────────────────
  server.registerTool(
    "knowledge_search",
    {
      title: "Search the capability registry",
      description:
        "Find capabilities matching a query. Searches manifest names, descriptions, ids, and categories. Returns the best matches.",
      inputSchema: {
        query: z.string().describe("Search terms"),
        limit: z.number().int().positive().optional().describe("Max results (default 10)"),
      },
    },
    async (args) => {
      const matches = await container.manifestStore.search(args.query);
      const limit = args.limit || 10;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ count: matches.length, results: matches.slice(0, limit) }, null, 2),
        }],
      };
    },
  );

  // ── knowledge_lookup ─────────────────────────────────────────
  server.registerTool(
    "knowledge_lookup",
    {
      title: "Look up a capability by id",
      description:
        "Fetch a single capability manifest by its id. Returns null if unknown.",
      inputSchema: {
        id: z.string().describe("Capability id, e.g. 'http-fetch'"),
      },
    },
    async (args) => {
      const item = await container.manifestStore.get(args.id);
      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    },
  );

  // ── knowledge_register ───────────────────────────────────────
  server.registerTool(
    "knowledge_register",
    {
      title: "Register a new capability",
      description:
        "Add a new capability manifest. Existing manifest with the same id is replaced.",
      inputSchema: {
        id: z.string().describe("Stable id (kebab-case)"),
        name: z.string().describe("Human-readable name"),
        description: z.string().describe("One-sentence summary of what it does"),
        kind: z.string().optional().describe("Kind tag (io, ai, system, transform, ...)"),
        tier: z.string().optional().describe("Tier (T1-API, T2-FETCH, T3-MCP, T4-CLI, T5-BROWSER, T6-REFERENCE)"),
        categories: z.array(z.string()).optional().describe("Free-form category tags"),
      },
    },
    async (args) => {
      const id = await container.manifestStore.upsert({
        id: args.id,
        name: args.name,
        description: args.description,
        kind: args.kind || "tool",
        tier: args.tier || "T6-REFERENCE",
        status: "enabled",
        categories: args.categories || [],
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ id, registered: true }, null, 2) }],
      };
    },
  );

  // ── knowledge_use ────────────────────────────────────────────
  server.registerTool(
    "knowledge_use",
    {
      title: "Record a capability use (Hebbian reinforce)",
      description:
        "Tell the graph that capability A was used together with capability B. Reinforces the edge between them so future searches surface the pair.",
      inputSchema: {
        from: z.string().describe("First capability id"),
        to: z.string().describe("Second capability id"),
        type: z.string().optional().describe("Edge type (default 'co-usage')"),
      },
    },
    async (args) => {
      const type = args.type || "co-usage";
      const existing = await container.graphStore.getEdge(args.from, args.to, type);
      if (!existing) {
        await container.graphStore.upsertEdge({
          from: args.from,
          to: args.to,
          type,
          weight: 0.15,
          last_used: new Date().toISOString(),
        });
      }
      const e = await container.graphStore.reinforce(args.from, args.to, type, HEBBIAN_REINFORCE_RATE);
      return {
        content: [{ type: "text", text: JSON.stringify({ edge: e, reinforced: true }, null, 2) }],
      };
    },
  );

  return server;
}

async function startStdio(server) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

module.exports = { createMcpServer, startStdio };
