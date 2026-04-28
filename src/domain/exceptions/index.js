class KnowledgeError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "KnowledgeError";
    this.code = code;
  }
}

class ManifestNotFoundError extends KnowledgeError {
  constructor(id) {
    super(`Capability "${id}" not found`, "MANIFEST_NOT_FOUND");
    this.capabilityId = id;
  }
}

class ManifestExistsError extends KnowledgeError {
  constructor(id) {
    super(`Capability "${id}" already exists`, "MANIFEST_EXISTS");
    this.capabilityId = id;
  }
}

class AdapterNotFoundError extends KnowledgeError {
  constructor(id) {
    super(`Adapter for "${id}" not found`, "ADAPTER_NOT_FOUND");
    this.capabilityId = id;
  }
}

class AdapterInvokeError extends KnowledgeError {
  constructor(id, detail) {
    super(`Adapter "${id}" failed: ${detail}`, "ADAPTER_INVOKE_FAILED");
    this.capabilityId = id;
  }
}

class PathTraversalError extends KnowledgeError {
  constructor(filePath, baseDir) {
    super(`Path traversal blocked: ${filePath} escapes ${baseDir}`, "PATH_TRAVERSAL");
  }
}

class GraphEdgeError extends KnowledgeError {
  constructor(detail) {
    super(`Graph error: ${detail}`, "GRAPH_ERROR");
  }
}

class LSDError extends KnowledgeError {
  constructor(detail) {
    super(`LSD discovery failed: ${detail}`, "LSD_FAILED");
  }
}

module.exports = {
  KnowledgeError,
  ManifestNotFoundError,
  ManifestExistsError,
  AdapterNotFoundError,
  AdapterInvokeError,
  PathTraversalError,
  GraphEdgeError,
  LSDError,
};
