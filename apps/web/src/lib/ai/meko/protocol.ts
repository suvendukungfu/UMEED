import crypto from "crypto";
import {
  MekoJsonRpcRequest,
  MekoJsonRpcResponse,
  MekoJsonRpcErrorResponse,
} from "./types";
import {
  MekoError,
  MekoAuthError,
  MekoForbiddenError,
  MekoNotFoundError,
  MekoRateLimitError,
  MekoValidationError,
  MekoPromotedError,
  MekoNetworkError,
} from "./errors";

/**
 * Builds a compliant JSON-RPC 2.0 MCP tools/call request.
 */
export function buildMekoToolCallRequest(
  toolName: string,
  args: Record<string, unknown>,
  correlationId?: string
): MekoJsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: correlationId ?? `req_${crypto.randomUUID()}`,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };
}

/**
 * Builds an initialize JSON-RPC 2.0 request.
 */
export function buildMekoInitializeRequest(
  correlationId?: string
): MekoJsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: correlationId ?? `init_${crypto.randomUUID()}`,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "umeed-coordination-engine",
        version: "1.0.0",
      },
    },
  };
}

/**
 * Parses and maps server response or error into typed UMEED error.
 */
export function extractMekoRpcError(response: MekoJsonRpcResponse): MekoError | null {
  if (!response.error) {
    return null;
  }

  const err = response.error;
  const msg = typeof err.message === "string" ? err.message : JSON.stringify(err);

  if (msg.includes("invalid_token") || msg.includes("Authentication failed") || err.code === 401) {
    return new MekoAuthError(msg, err.data);
  }

  if (msg.includes("permission_denied") || msg.includes("403") || err.code === 403) {
    return new MekoForbiddenError(msg, err.data);
  }

  if (msg.includes("not_found") || err.code === 404) {
    return new MekoNotFoundError("tool_target", msg);
  }

  if (msg.includes("free_tier_limit_reached") || msg.includes("rate_limit") || err.code === 429) {
    return new MekoRateLimitError(msg, err.data);
  }

  if (msg.includes("memory_is_promoted") || err.code === 409) {
    return new MekoPromotedError(msg);
  }

  if (err.code === -32602 || msg.includes("validation")) {
    return new MekoValidationError(msg, err.data);
  }

  return new MekoError(msg, "MEKO_RPC_ERROR", err.code, err.data);
}

/**
 * Extracts payload content from an MCP tools/call result block.
 * MCP servers return `{ content: [{ type: "text", text: "..." }] }` or direct JSON.
 */
export function parseMekoToolResult<T>(result: unknown): T {
  if (!result || typeof result !== "object") {
    return result as T;
  }

  const resObj = result as Record<string, unknown>;

  // Check MCP standard content wrapper
  if (Array.isArray(resObj.content) && resObj.content.length > 0) {
    const first = resObj.content[0];
    if (first && typeof first === "object" && "text" in first) {
      const textVal = (first as { text: unknown }).text;
      if (typeof textVal === "string") {
        try {
          return JSON.parse(textVal) as T;
        } catch {
          return textVal as unknown as T;
        }
      }
    }
  }

  return result as T;
}
