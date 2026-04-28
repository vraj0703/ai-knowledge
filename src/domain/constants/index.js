module.exports = {
  // ─── Service ───
  KNOWLEDGE_PORT: 3489,
  DB_PATH: "knowledge/data/data_sources/local/knowledge.db",

  // ─── Tiers (matching v1 manifest values exactly) ───
  VALID_TIERS: ["T1-API", "T2-FETCH", "T3-MCP", "T4-CLI", "T5-BROWSER", "T6-REFERENCE"],
  TIER_ORDER: ["T1-API", "T2-FETCH", "T3-MCP", "T4-CLI", "T5-BROWSER", "T6-REFERENCE"],
  TIER_METHOD: {
    "T1-API": "api", "T2-FETCH": "fetch", "T3-MCP": "mcp",
    "T4-CLI": "cli", "T5-BROWSER": "browser", "T6-REFERENCE": "reference",
  },
  SKIP_TIER: "T6-REFERENCE",

  // ─── Statuses ───
  VALID_STATUSES: ["enabled", "disabled", "evaluated-candidate", "parked", "rejected"],

  // ─── Graph edge types ───
  VALID_EDGE_TYPES: ["consumer", "category", "co-usage", "lsd"],

  // ─── Hebbian learning ───
  HEBBIAN_REINFORCE_RATE: 0.1,
  HEBBIAN_NEW_EDGE_WEIGHT: 0.15,
  HEBBIAN_SPREAD_RATE: 0.02,
  CONSUMER_EDGE_WEIGHT: 0.3,
  CATEGORY_EDGE_WEIGHT: 0.2,
  DECAY_HALF_LIFE_DAYS: 30,
  DECAY_FLOOR: 0.01,

  // ─── LSD ───
  LSD_BATCH_SIZE: 20,
  LSD_BATCHES: 3,
  LSD_MIN_STRENGTH: 0.1,
  LSD_MAX_STRENGTH: 0.5,

  // ─── Search ───
  DEFAULT_NEIGHBOR_LIMIT: 10,
  DEFAULT_SEARCH_EXPAND: 5,

  // ─── Ollama ───
  OLLAMA_HOST: "http://localhost:11434",
  OLLAMA_MODEL: "gemma4:e4b",

  // ─── Langflow ───
  LANGFLOW_HOST: "http://100.108.180.118:7860",
  LANGFLOW_TIMEOUT_MS: 60000,
};
