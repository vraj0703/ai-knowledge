/**
 * server.js — Express HTTP server for Knowledge v2.
 */

const express = require("express");
const { registerRoutes } = require("../../navigation/routes");

/**
 * @param {object} deps
 * @param {import('../../presentation/state_management/controllers/knowledge_controller').KnowledgeController} deps.knowledge
 * @param {number} deps.port
 */
function createServer({ knowledge, port }) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  // Request logging (skip /health)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path !== "/health") {
        console.log(`[http] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  registerRoutes(app, { knowledge });

  return {
    app,
    listen: () => new Promise((resolve) => {
      const server = app.listen(port, "127.0.0.1", () => {
        console.log(`[knowledge-v2] listening on http://127.0.0.1:${port}`);
        resolve(server);
      });
    }),
  };
}

module.exports = { createServer };
