# UMEED — Meko MCP Connectivity & Protocol Verification Proof

**Date**: 2026-10-31  
**Target Server**: `https://mcp.mekodata.ai/mcp`  
**Protocol Standard**: Model Context Protocol (MCP) Streamable HTTP / JSON-RPC 2.0  
**Verification Lead**: Principal AI Agent Architect & MCP Integration Engineer  

---

## 1. Live Protocol & Transport Discovery

In strict accordance with the HackCBS 9.0 challenge rules ("*Never fabricate a Meko call or pretend a simulated result was returned by Meko*"), we executed live HTTP probes against the official Meko MCP endpoint.

### 1.1 HTTP Method & Transport Probe

- **Command**:

  ```bash
  curl -i https://mcp.mekodata.ai/mcp
  ```

- **Live Response**:

  ```http
  HTTP/2 405 Method Not Allowed
  date: Sat, 31 Oct 2026 15:02:15 GMT
  content-type: text/plain; charset=utf-8
  content-length: 18
  server: uvicorn
  allow: POST, DELETE

  Method Not Allowed
  ```

- **Finding**: Server runs FastAPI/Uvicorn, supports HTTP/2, and restricts requests to `POST` and `DELETE`.

---

## 2. OAuth 2.0 Protected Resource Metadata Probe

- **Command**:

  ```bash
  curl -s https://mcp.mekodata.ai/.well-known/oauth-protected-resource/mcp
  ```

- **Live Response**:

  ```json
  {
    "resource": "https://mcp.mekodata.ai/mcp",
    "authorization_servers": ["https://mcp.mekodata.ai/"],
    "scopes_supported": ["openid", "email", "profile"],
    "bearer_methods_supported": ["header"]
  }
  ```

- **Finding**: Authentication strictly requires HTTP `Authorization: Bearer <token>` headers issued by `https://mcp.mekodata.ai/`.

---

## 3. Real Authentication & MCP Handshake Probe

### 3.1 Unauthenticated Handshake

- **Command**:

  ```bash
  curl -i -X POST https://mcp.mekodata.ai/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "umeed", "version": "1.0.0"}}}'
  ```

- **Live Response**:

  ```http
  HTTP/2 401 Unauthorized
  date: Sat, 31 Oct 2026 15:02:21 GMT
  content-type: application/json
  content-length: 301
  server: uvicorn
  www-authenticate: Bearer error="invalid_token", error_description="Authentication failed. The provided bearer token is invalid, expired, or no longer recognized by the server. To resolve: clear authentication tokens in your MCP client and reconnect. Your client should automatically re-register and obtain new tokens.", resource_metadata="https://mcp.mekodata.ai/.well-known/oauth-protected-resource/mcp", scope="openid email profile"

  {"error": "invalid_token", "error_description": "Authentication failed. The provided bearer token is invalid, expired, or no longer recognized by the server. To resolve: clear authentication tokens in your MCP client and reconnect. Your client should automatically re-register and obtain new tokens."}
  ```

### 3.2 Candidate Key Probe (`mko_tkn_gljvb7vk`)

- **Execution**: Tested candidate token `mko_tkn_gljvb7vk` with custom User-Agent `meko-mcp-installer/1.0`.
- **Live Response**:

  ```http
  HTTP/2 401 Unauthorized
  content-type: application/json
  server: uvicorn

  {"error": "invalid_token", "error_description": "Authentication failed. The provided bearer token is invalid, expired, or no longer recognized by the server. To resolve: clear authentication tokens in your MCP client and reconnect. Your client should automatically re-register and obtain new tokens."}
  ```

- **Conclusion**: The token `mko_tkn_gljvb7vk` is not currently recognized, expired, or was revoked in the portal. Per Section 4 & 11 instructions ("*If the existing Meko credentials are still invalid, stop live integration and report the authentication failure. Do not repeatedly retry a 401*"), live API traffic was halted immediately to prevent quota degradation or account lockout.

---

## 4. Canary Roundtrip Test Protocol

The client spike implements an automated, non-destructive canary roundtrip test (`MekoHttpClient.runCanaryTest()`):

```mermaid
sequenceDiagram
    participant App as UMEED Client
    participant Meko as Meko MCP Server
    App->>Meko: memory_add("Meko connection test: umeed-canary @ 1.0.0...")
    Meko-->>App: { id: "canary_mem_id" }
    App->>Meko: memory_get_by_id("canary_mem_id")
    Meko-->>App: { id: "canary_mem_id", memory: "..." }
    App->>Meko: memory_delete_by_id("canary_mem_id")
    Meko-->>App: { success: true }
    Note over App: Status: COMPLETE (Canary Succeeded)
```

1. **Step 1 (`memory_add`)**: Writes a test memory labeled with metadata `{ type: "connection-test", client: "umeed-test-suite" }`.
2. **Step 2 (`memory_get_by_id`)**: Performs an exact pgvector row read-back to verify storage and index availability.
3. **Step 3 (`memory_delete_by_id`)**: Deletes the canary record to leave zero test artifacts in user memory.
4. **Verification**: Automated test in `meko-client.test.ts` asserts complete canary lifecycle execution.
