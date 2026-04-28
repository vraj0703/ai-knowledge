#!/usr/bin/env node
/**
 * import_graph_from_json.js — one-time migration from v1 graph-state.json to SQLite.
 *
 * Reads: I:/raj_sadan/memory/knowledge/graph-state.json
 * Writes: knowledge/data/data_sources/local/knowledge.db
 *
 * Usage: node knowledge/data/migrations/import_graph_from_json.js
 */

const fs = require("fs");
const path = require("path");
const { SQLiteGraphStore } = require("../data_sources/local/sqlite_graph_store");
const { GraphEdge } = require("../../domain/entities/graph_edge");

const V1_PATH = path.resolve("I:/raj_sadan/memory/knowledge/graph-state.json");

/**
 * Normalize v1 timestamp — could be epoch ms (number) or ISO string.
 * @param {number|string|null} val
 * @returns {string} ISO string
 */
function normalizeTimestamp(val) {
  if (!val) return new Date().toISOString();
  if (typeof val === "number") return new Date(val).toISOString();
  return String(val);
}

async function main() {
  console.log(`[migration] Reading v1 graph from: ${V1_PATH}`);

  if (!fs.existsSync(V1_PATH)) {
    console.error(`[migration] File not found: ${V1_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(V1_PATH, "utf-8"));
  console.log(`[migration] Found ${raw.length} edges in v1 JSON`);

  const store = new SQLiteGraphStore();
  let imported = 0;
  let skipped = 0;

  for (const entry of raw) {
    try {
      const edge = new GraphEdge({
        source: entry.source,
        target: entry.target,
        type: entry.type,
        weight: typeof entry.weight === "number" ? entry.weight : 0.1,
        createdAt: normalizeTimestamp(entry.created),
        lastActivated: normalizeTimestamp(entry.last_activated),
        reason: entry.reason || null,
      });
      await store.addEdge(edge);
      imported++;
    } catch (err) {
      skipped++;
      if (skipped <= 10) {
        console.warn(`[migration] Skipped edge ${entry.source} -> ${entry.target}: ${err.message}`);
      }
    }

    if (imported % 500 === 0 && imported > 0) {
      console.log(`[migration] ... ${imported} edges imported`);
    }
  }

  const stats = await store.stats();
  store.close();

  console.log(`[migration] Complete.`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total in DB: ${stats.totalEdges}`);
  console.log(`  By type:`, stats.byType);
  console.log(`  Avg weight: ${stats.avgWeight.toFixed(4)}`);
}

main().catch(err => {
  console.error(`[migration] Fatal error:`, err);
  process.exit(1);
});
