/**
 * routes.js — HTTP route definitions for Knowledge v2.
 *
 * Maps API endpoints to KnowledgeController methods.
 * Matches v1 Knowledge service API where possible.
 */

/**
 * @param {import('express').Application} app
 * @param {object} deps
 * @param {import('../presentation/state_management/controllers/knowledge_controller').KnowledgeController} deps.knowledge
 */
function registerRoutes(app, { knowledge }) {

  // ─── Health ───

  app.get("/health", async (req, res) => {
    try {
      const stats = await knowledge.getStats();
      res.json({
        status: "running",
        service: "knowledge-v2",
        version: "2.0.0",
        capabilities: stats.registry.total,
        edges: stats.graph.totalEdges,
      });
    } catch (err) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // ─── Capabilities CRUD ───

  app.get("/capabilities", async (req, res) => {
    try {
      const filters = {};
      if (req.query.tier) filters.tier = req.query.tier;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.consumer) filters.consumer = req.query.consumer;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.method) filters.method = req.query.method;
      if (req.query.search || req.query.q) filters.search = req.query.search || req.query.q;
      const caps = await knowledge.listCapabilities(filters);
      res.json({ count: caps.length, capabilities: caps.map(c => c.toSummary()) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/capabilities/:id", async (req, res) => {
    try {
      const cap = await knowledge.getCapability(req.params.id);
      if (!cap) return res.status(404).json({ error: "not found" });
      res.json(cap.toSummary());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/capabilities", async (req, res) => {
    try {
      const { url, title, tier, category, description, consumers } = req.body;
      if (!url) return res.status(400).json({ error: "url is required" });
      const result = await knowledge.addCapability(url, title, { tier, category, description, consumers });
      res.status(201).json(result);
    } catch (err) {
      if (err.code === "MANIFEST_EXISTS") return res.status(409).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/capabilities/:id", async (req, res) => {
    try {
      const result = await knowledge.updateCapability(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      if (err.code === "MANIFEST_NOT_FOUND") return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/capabilities/:id", async (req, res) => {
    try {
      const result = await knowledge.removeCapability(req.params.id);
      res.json(result);
    } catch (err) {
      if (err.code === "MANIFEST_NOT_FOUND") return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/capabilities/bulk", async (req, res) => {
    try {
      const { links } = req.body;
      if (!Array.isArray(links)) return res.status(400).json({ error: "links array is required" });
      const result = await knowledge.bulkImport(links);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Enable / Disable ───

  app.post("/enable/:id", async (req, res) => {
    try {
      const cap = await knowledge.enableCapability(req.params.id);
      res.json({ id: cap.id, status: cap.status });
    } catch (err) {
      if (err.code === "MANIFEST_NOT_FOUND") return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/disable/:id", async (req, res) => {
    try {
      const cap = await knowledge.disableCapability(req.params.id);
      res.json({ id: cap.id, status: cap.status });
    } catch (err) {
      if (err.code === "MANIFEST_NOT_FOUND") return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Consumer ───

  app.get("/for/:consumer", async (req, res) => {
    try {
      const caps = await knowledge.getForConsumer(req.params.consumer);
      res.json({ consumer: req.params.consumer, count: caps.length, capabilities: caps.map(c => c.toSummary()) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Search ───

  app.get("/search", async (req, res) => {
    try {
      const q = req.query.q || req.query.query || "";
      if (!q) return res.status(400).json({ error: "q parameter required" });
      const result = await knowledge.textSearch(q);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/semantic-search", async (req, res) => {
    try {
      const q = req.query.q || req.query.query || "";
      if (!q) return res.status(400).json({ error: "q parameter required" });
      const result = await knowledge.semanticSearch(q);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/related/:id", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await knowledge.relatedTo(req.params.id, limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/suggest", async (req, res) => {
    try {
      const task = req.query.task || req.query.q || "";
      if (!task) return res.status(400).json({ error: "task parameter required" });
      const result = await knowledge.suggest(task);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Graph ───

  app.get("/graph/stats", async (req, res) => {
    try {
      const stats = await knowledge.graphStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/graph/edges/:id", async (req, res) => {
    try {
      const edges = await knowledge.graphEdges(req.params.id);
      res.json({ node: req.params.id, edges: edges.map(e => ({
        source: e.source, target: e.target, type: e.type, weight: e.weight,
      }))});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/co-activate", async (req, res) => {
    try {
      const nodeIds = req.body.nodeIds || req.body.nodes; // v2 uses nodeIds, v1 used nodes
      if (!Array.isArray(nodeIds) || nodeIds.length < 2) {
        return res.status(400).json({ error: "nodeIds (or nodes) array with min 2 IDs required" });
      }
      const result = await knowledge.coActivate(nodeIds);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/decay", async (req, res) => {
    try {
      const halfLifeDays = req.body.halfLifeDays || 30;
      const result = await knowledge.decay(halfLifeDays);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/graph/rebuild", async (req, res) => {
    try {
      const result = await knowledge.buildFromRegistry();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── LSD ───

  app.post("/lsd", async (req, res) => {
    try {
      const result = await knowledge.runLSD();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Stats ───

  app.get("/stats", async (req, res) => {
    try {
      const stats = await knowledge.getStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Adapter Invocation ───

  app.post("/invoke/:id", async (req, res) => {
    try {
      const result = await knowledge.invokeAdapter(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      if (err.code === "MANIFEST_NOT_FOUND" || err.code === "ADAPTER_NOT_FOUND") {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/adapter/:id/describe", async (req, res) => {
    try {
      const result = await knowledge.describeAdapter(req.params.id);
      if (!result) return res.status(404).json({ error: "no description available" });
      res.json(result);
    } catch (err) {
      if (err.code === "MANIFEST_NOT_FOUND" || err.code === "ADAPTER_NOT_FOUND") {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/recommend", async (req, res) => {
    try {
      const task = req.query.task || req.query.q || "";
      if (!task) return res.status(400).json({ error: "task parameter required" });
      const result = await knowledge.suggest(task);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerRoutes };
