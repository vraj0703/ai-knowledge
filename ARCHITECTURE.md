# ARCHITECTURE.md

How ai-knowledge is structured, where capability lookups + Hebbian strengthening + LSD discovery flow.

For the why, start with [README.md](README.md).

---

## 1. Clean architecture layering

```mermaid
flowchart TB
    subgraph Presentation
        HTTP[HTTP server]
        MCP[MCP server<br/>4 tools]
        CLI[CLI dispatcher]
    end
    subgraph DI
        Container[di/container.js<br/>mock-default + KNOWLEDGE_USE_REAL]
    end
    subgraph Domain
        UseCases[Use cases<br/>search / lookup / register / use /<br/>discover_lsd / decay]
        Interfaces[5 interfaces<br/>i_graph_store, i_manifest_store,<br/>i_credential_store, i_adapter_runner,<br/>i_lsd_provider]
        Entities[Entities<br/>Capability, Edge, Manifest]
        Constants[Constants<br/>env-var fallback]
    end
    subgraph Data
        Real[Real adapters<br/>SQLiteGraphStore, TOMLManifestStore,<br/>FileCredentialStore, NodeAdapterRunner,<br/>LangflowLSDProvider, DirectLSDProvider]
        Mocks[Mocks<br/>InMemoryGraphStore, InMemoryManifestStore,<br/>StubCredentialStore, StubAdapterRunner,<br/>StubLSDProvider]
    end

    HTTP --> Container
    MCP --> Container
    CLI --> Container
    Container --> UseCases
    UseCases --> Interfaces
    UseCases --> Entities
    UseCases --> Constants
    Container --> Real
    Container --> Mocks
    Real -.implements.-> Interfaces
    Mocks -.implements.-> Interfaces
```

---

## 2. Capability lookup flow

```mermaid
sequenceDiagram
    participant Caller
    participant UC as search use case
    participant MS as i_manifest_store
    participant GS as i_graph_store

    Caller->>UC: search(query, topK=10)
    UC->>MS: search(query)
    MS-->>UC: matches[] (text match by name/description/categories)
    UC->>GS: neighbors(top match, limit=5)
    GS-->>UC: relatedCapabilities[]
    UC-->>Caller: { primary: matches, related: relatedCapabilities }
```

The graph augments the search: text-matching the manifest store gives the obvious hits, but the Hebbian-strengthened graph surfaces capabilities that *go with* the obvious ones. Over time the graph carries the bulk of the search quality.

---

## 3. Hebbian strengthening

```mermaid
sequenceDiagram
    participant Agent
    participant UC as use use case
    participant GS as i_graph_store

    Agent->>UC: use(from=A, to=B, type=co-usage)
    UC->>GS: getEdge(A, B, co-usage)
    alt edge exists
        GS-->>UC: edge
    else no edge
        UC->>GS: upsertEdge(A, B, co-usage, weight=0.15)
    end
    UC->>GS: reinforce(A, B, co-usage, +0.1)
    GS-->>UC: edge with bumped weight
    UC-->>Agent: ack
```

**The rule:** every time the agent uses A and B together, the A↔B edge gets +`HEBBIAN_REINFORCE_RATE` (default 0.1, capped at 1.0). Edges that go a long time without use decay toward `DECAY_FLOOR` (default 0.01). Result: the graph self-organizes around actual usage patterns.

The decay job runs separately — usually nightly via cron. Not strictly required for the system to work; without it weights only ever go up.

---

## 4. LSD (Latent Semantic Discovery)

```mermaid
flowchart LR
    Nodes[All capability nodes]
    LSD[LSD provider<br/>i_lsd_provider]
    LLM[LLM<br/>real: Langflow/Ollama<br/>mock: shared-categories]
    Suggestions[New edges<br/>type=lsd, strength 0.1-0.5]
    Graph[i_graph_store]

    Nodes --> LSD
    LSD --> LLM
    LLM --> Suggestions
    Suggestions --> Graph
```

The LLM looks at the full set of capabilities and proposes edges between nodes that aren't yet linked but probably should be — based on what the descriptions suggest semantically.

Real path: a Langflow flow (or direct Ollama call) sends batches of nodes to a model and asks "given these capabilities, which pairs should be linked." Returns suggested edges with a strength score 0.1-0.5.

Mock path: deterministic stub. Pairs nodes that share at least one category, weights by overlap count. Reproducible, zero LLM calls — useful for tests and for showing the system working without an Ollama install.

---

## 5. Mock vs real swap

```mermaid
flowchart LR
    Env[KNOWLEDGE_USE_REAL env var<br/>"" / "graph,manifests" / "all"]
    Container[createContainer]
    Decide{For each integration<br/>in KNOWN_KEYS:<br/>is it in useReal?}
    Real[Real adapter<br/>SQLite, Langflow, file system]
    Mock[Stub<br/>Map-backed, deterministic]
    Bundle[Container bundle<br/>{graphStore, manifestStore,<br/>credentialStore, adapterRunner,<br/>lsdProvider}]

    Env --> Container
    Container --> Decide
    Decide -- "yes" --> Real
    Decide -- "no (default)" --> Mock
    Real --> Bundle
    Mock --> Bundle
```

Five swap keys: `graph`, `manifests`, `credentials`, `adapters`, `lsd`. Default → all five mocked. raj-sadan in production runs `KNOWLEDGE_USE_REAL=all`.

---

## 6. MCP tool surface

```mermaid
flowchart TB
    subgraph MCP[MCP server]
        Search[knowledge_search<br/>by query]
        Lookup[knowledge_lookup<br/>by id]
        Register[knowledge_register<br/>add manifest]
        Use[knowledge_use<br/>Hebbian reinforce]
    end
    subgraph Container[DI container]
        MS[manifestStore]
        GS[graphStore]
    end

    Search --> MS
    Lookup --> MS
    Register --> MS
    Use --> GS
```

Four tools. Each one wraps a container method. Add a tool: register it in `src/presentation/mcp/server.js`.

---

## What's deliberately not here

- **Vector similarity search.** v0.1.0 does text matching on manifests. Adding an embedder + vector index (could share `ai-memory`'s) is a v0.2 follow-up.
- **Cross-organ orchestration.** ai-knowledge tells the agent *what* tools exist and how often pairs go together. It doesn't decide *whether* to invoke them — that's the cognitive layer.
- **Trust scoring.** A capability with weight 0.9 is "frequently used together" — not "high quality" or "secure." Quality and security live elsewhere (immunity, ministry-review).

---

## See also

- [README.md](README.md)
- [CHANGELOG.md](CHANGELOG.md)
- [`src/di/container.js`](src/di/container.js)
- [`src/presentation/mcp/server.js`](src/presentation/mcp/server.js)
