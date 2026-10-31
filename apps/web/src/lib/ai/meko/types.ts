/**
 * UMEED Meko MCP Integration Types
 * Strictly modeled after Meko's Streamable HTTP JSON-RPC 2.0 MCP interface
 * Reference: https://docs.mekodata.ai/reference/mcp-server/ and yugabyte/meko-skills
 */

export type MekoRole = "owner" | "maintainer" | "contributor" | "viewer";

export interface MekoDatapack {
  id: string;
  name: string;
  description?: string;
  role?: MekoRole;
  is_pinned?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MekoMemory {
  id: string;
  memory: string;
  score?: number;
  raw_similarity_score?: number;
  agent_id?: string;
  datapack_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MekoKnowledgeChunk {
  id: string;
  chunk_text: string;
  document_id: string;
  distance: number;
  match_type: "semantic" | "keyword" | "hybrid";
  metadata_filters?: Record<string, unknown>;
}

export interface MekoMemoryResult {
  id: string;
  memory: string;
  created?: boolean;
}

export interface MekoSearchResult {
  id: string;
  memory: string;
  score: number;
  raw_similarity_score?: number;
  agent_id?: string;
  datapack_id?: string;
}

export interface MekoJsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: {
    name?: string;
    arguments?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface MekoJsonRpcSuccessResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result: T;
  error?: never;
}

export interface MekoJsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: never;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type MekoJsonRpcResponse<T = unknown> =
  | MekoJsonRpcSuccessResponse<T>
  | MekoJsonRpcErrorResponse;

export interface MekoInteractionLogEntry {
  event_id: string;
  timestamp: string;
  agent_id: string;
  datapack_id: string;
  tool_name: string;
  operation: "READ" | "WRITE" | "UPDATE" | "DELETE" | "PROMOTE";
  status: "SUCCESS" | "FAILURE";
  returned_ids?: string[];
  duration_ms: number;
  error_message?: string;
  correlation_id: string;
}

export interface MekoToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MekoInitializeResult {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo: {
    name: string;
    version?: string;
  };
}

export interface CanaryResult {
  success: boolean;
  canary_id?: string;
  agent_id: string;
  conversation_id: string;
  duration_ms: number;
  error?: string;
  step_reached: "INITIALIZE" | "MEMORY_ADD" | "GET_BY_ID" | "CLEANUP" | "COMPLETE";
}

