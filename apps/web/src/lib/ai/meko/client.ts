import crypto from "crypto";
import {
  MekoDatapack,
  MekoMemory,
  MekoMemoryResult,
  MekoSearchResult,
  MekoKnowledgeChunk,
  MekoInteractionLogEntry,
  CanaryResult,
  MekoJsonRpcResponse,
} from "./types";
import {
  MekoError,
  MekoAuthError,
  MekoNetworkError,
  MekoValidationError,
  sanitizeMekoMessage,
} from "./errors";
import {
  assertValidOperationalMemory,
  MemoryAddArgsSchema,
  MemorySearchArgsSchema,
  MemoryGetByIdArgsSchema,
  MemoryUpdateArgsSchema,
  MemoryDeleteByIdArgsSchema,
  MemoryPromoteArgsSchema,
  DatapackListArgsSchema,
  DatapackSearchArgsSchema,
  KnowledgebaseSearchArgsSchema,
} from "./schemas";
import { assertToolAllowed, sanitizeToolArguments } from "./tools";
import {
  buildMekoToolCallRequest,
  buildMekoInitializeRequest,
  extractMekoRpcError,
  parseMekoToolResult,
} from "./protocol";
import { getServerEnv } from "../../config/env";

export interface MekoClientConfig {
  apiKey?: string;
  productDatapackId?: string;
  buildDatapackId?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class MekoHttpClient {
  private readonly apiKey?: string;
  public readonly productDatapackId?: string;
  public readonly buildDatapackId?: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly interactionLogs: MekoInteractionLogEntry[] = [];

  constructor(config: MekoClientConfig = {}) {
    let envApiKey: string | undefined;
    let envProductDp: string | undefined;
    let envBuildDp: string | undefined;

    try {
      const env = getServerEnv();
      envApiKey = env.MEKO_API_KEY;
      envProductDp = env.MEKO_PRODUCT_DATAPACK_ID || env.MEKO_DATAPACK_ID;
      // MEKO_BUILD_DATAPACK_ID can be retrieved from process.env if set
      envBuildDp = process.env.MEKO_BUILD_DATAPACK_ID;
    } catch {
      // In isolated tests without full environment
    }

    this.apiKey = config.apiKey || envApiKey;
    this.productDatapackId = config.productDatapackId || envProductDp;
    this.buildDatapackId = config.buildDatapackId || envBuildDp;
    this.endpoint = config.endpoint || "https://mcp.mekodata.ai/mcp";
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes("<"));
  }

  public getInteractionLogs(): MekoInteractionLogEntry[] {
    return [...this.interactionLogs];
  }

  public clearInteractionLogs(): void {
    this.interactionLogs.length = 0;
  }

  /**
   * Dispatches a raw JSON-RPC 2.0 tool call to the Meko MCP server.
   */
  public async executeToolCall<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
    options?: { datapackId?: string; agentId?: string }
  ): Promise<T> {
    assertToolAllowed(toolName);

    if (!this.isConfigured()) {
      throw new MekoAuthError("Meko API key is unconfigured. Set MEKO_API_KEY in .env.local.");
    }

    const correlationId = `cor_${crypto.randomUUID()}`;
    const startTime = Date.now();
    const effectiveDatapackId = options?.datapackId || (args.datapack_id as string) || this.productDatapackId || "unspecified";
    const effectiveAgentId = options?.agentId || (args.agent_id as string) || "umeed_agent";

    const sanitizedArgs = sanitizeToolArguments(args);
    const requestPayload = buildMekoToolCallRequest(toolName, sanitizedArgs, correlationId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": "umeed-mcp-client/1.0",
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          throw new MekoAuthError(`HTTP 401 Unauthorized: ${errorText}`);
        }
        if (response.status === 403) {
          throw new MekoError(`HTTP 403 Forbidden: ${errorText}`, "MEKO_FORBIDDEN", 403);
        }
        if (response.status === 429) {
          throw new MekoError(`HTTP 429 Rate Limit: ${errorText}`, "MEKO_RATE_LIMITED", 429);
        }
        throw new MekoError(`HTTP ${response.status}: ${errorText}`, "MEKO_HTTP_ERROR", response.status);
      }

      const json = (await response.json()) as MekoJsonRpcResponse;
      const rpcError = extractMekoRpcError(json);
      if (rpcError) {
        throw rpcError;
      }

      const parsed = parseMekoToolResult<T>(json.result);

      this.logInteraction({
        event_id: `evt_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        agent_id: effectiveAgentId,
        datapack_id: effectiveDatapackId,
        tool_name: toolName,
        operation: this.mapOperation(toolName),
        status: "SUCCESS",
        duration_ms: Date.now() - startTime,
        correlation_id: correlationId,
      });

      return parsed;
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";
      const mappedError = isAbort
        ? new MekoNetworkError(`Meko request timed out after ${this.timeoutMs}ms`)
        : err instanceof MekoError
        ? err
        : new MekoNetworkError(sanitizeMekoMessage((err as Error)?.message ?? "Connection failure"), err);

      this.logInteraction({
        event_id: `evt_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        agent_id: effectiveAgentId,
        datapack_id: effectiveDatapackId,
        tool_name: toolName,
        operation: this.mapOperation(toolName),
        status: "FAILURE",
        duration_ms: Date.now() - startTime,
        error_message: mappedError.message,
        correlation_id: correlationId,
      });

      throw mappedError;
    }
  }

  // ===========================================================================
  // Datapack Operations
  // ===========================================================================

  public async listDatapacks(conversationId?: string): Promise<MekoDatapack[]> {
    const validArgs = DatapackListArgsSchema.parse({
      conversation_id: conversationId || `conv_${crypto.randomUUID()}`,
      limit: 50,
    });

    const result = await this.executeToolCall<{ datapacks?: MekoDatapack[] } | MekoDatapack[]>(
      "datapack_list",
      validArgs
    );

    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.datapacks)) return result.datapacks;
    return [];
  }

  public async searchDatapacks(query: string, conversationId?: string): Promise<MekoDatapack[]> {
    const validArgs = DatapackSearchArgsSchema.parse({
      query,
      conversation_id: conversationId || `conv_${crypto.randomUUID()}`,
      limit: 20,
    });

    const result = await this.executeToolCall<{ datapacks?: MekoDatapack[] } | MekoDatapack[]>(
      "datapack_search",
      validArgs
    );

    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.datapacks)) return result.datapacks;
    return [];
  }

  // ===========================================================================
  // Memory Operations (with strict PII validation)
  // ===========================================================================

  public async addMemory(
    text: string,
    options?: {
      datapackId?: string;
      agentId?: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MekoMemoryResult> {
    assertValidOperationalMemory(text);

    const validArgs = MemoryAddArgsSchema.parse({
      text,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_agent",
      datapack_id: options?.datapackId || this.productDatapackId,
      metadata: options?.metadata,
    });

    const result = await this.executeToolCall<{ results?: MekoMemoryResult[] } | MekoMemoryResult>(
      "memory_add",
      validArgs,
      { datapackId: validArgs.datapack_id, agentId: validArgs.agent_id }
    );

    if (result && "results" in result && Array.isArray(result.results) && result.results.length > 0) {
      return result.results[0];
    }
    if (result && "id" in result) {
      return result as MekoMemoryResult;
    }

    throw new MekoError("Failed to store memory: Unexpected response structure", "MEKO_INVALID_RESPONSE");
  }

  public async searchMemories(
    query: string,
    options?: {
      datapackId?: string;
      agentId?: string;
      conversationId?: string;
      limit?: number;
    }
  ): Promise<MekoSearchResult[]> {
    const validArgs = MemorySearchArgsSchema.parse({
      query,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_agent",
      datapack_id: options?.datapackId || this.productDatapackId,
      limit: options?.limit ?? 10,
    });

    const result = await this.executeToolCall<{ results?: MekoSearchResult[] } | MekoSearchResult[]>(
      "memory_search",
      validArgs,
      { datapackId: validArgs.datapack_id, agentId: validArgs.agent_id }
    );

    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.results)) return result.results;
    return [];
  }

  public async getMemoryById(
    memoryId: string,
    options?: { conversationId?: string; agentId?: string; datapackId?: string }
  ): Promise<MekoMemory | null> {
    const validArgs = MemoryGetByIdArgsSchema.parse({
      memory_id: memoryId,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_agent",
      datapack_id: options?.datapackId || this.productDatapackId,
    });

    try {
      const result = await this.executeToolCall<Record<string, unknown>>(
        "memory_get_by_id",
        validArgs,
        { datapackId: validArgs.datapack_id, agentId: validArgs.agent_id }
      );

      if (!result) return null;

      // Handle direct Meko memory shape: { id: "...", memory: "..." }
      if (typeof result.id === "string") {
        return result as unknown as MekoMemory;
      }

      // Handle nested wrapper: { memory: { id: "...", memory: "..." } }
      if (
        result.memory &&
        typeof result.memory === "object" &&
        "id" in result.memory &&
        typeof (result.memory as { id: unknown }).id === "string"
      ) {
        return result.memory as unknown as MekoMemory;
      }

      return null;
    } catch (err) {
      if (err instanceof MekoError && (err.code === "MEKO_NOT_FOUND" || err.statusCode === 404)) {
        return null;
      }
      throw err;
    }
  }

  public async updateMemory(
    memoryId: string,
    text: string,
    options?: { conversationId?: string; agentId?: string; datapackId?: string }
  ): Promise<boolean> {
    assertValidOperationalMemory(text);

    const validArgs = MemoryUpdateArgsSchema.parse({
      memory_id: memoryId,
      text,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_agent",
      datapack_id: options?.datapackId || this.productDatapackId,
    });

    await this.executeToolCall("memory_update", validArgs, {
      datapackId: validArgs.datapack_id,
      agentId: validArgs.agent_id,
    });
    return true;
  }

  public async deleteMemoryById(
    memoryId: string,
    options?: { conversationId?: string; agentId?: string; datapackId?: string }
  ): Promise<boolean> {
    const validArgs = MemoryDeleteByIdArgsSchema.parse({
      memory_id: memoryId,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_agent",
      datapack_id: options?.datapackId || this.productDatapackId,
    });

    await this.executeToolCall("memory_delete_by_id", validArgs, {
      datapackId: validArgs.datapack_id,
      agentId: validArgs.agent_id,
    });
    return true;
  }

  public async promoteMemories(
    memoryIds: string[],
    options?: { conversationId?: string; agentId?: string; datapackId?: string }
  ): Promise<{ inserted_ids: string[]; updated_ids: string[]; not_found_ids: string[] }> {
    const validArgs = MemoryPromoteArgsSchema.parse({
      memory_ids: memoryIds,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_curator",
      datapack_id: options?.datapackId || this.productDatapackId,
    });

    const result = await this.executeToolCall<{
      inserted_ids?: string[];
      updated_ids?: string[];
      not_found_ids?: string[];
    }>("memory_promote", validArgs, {
      datapackId: validArgs.datapack_id,
      agentId: validArgs.agent_id,
    });

    return {
      inserted_ids: result?.inserted_ids ?? [],
      updated_ids: result?.updated_ids ?? [],
      not_found_ids: result?.not_found_ids ?? [],
    };
  }

  // ===========================================================================
  // Knowledge Base Operations
  // ===========================================================================

  public async searchKnowledgeBase(
    query: string,
    datapackId: string,
    options?: { conversationId?: string; agentId?: string; limit?: number }
  ): Promise<MekoKnowledgeChunk[]> {
    const validArgs = KnowledgebaseSearchArgsSchema.parse({
      query,
      datapack_id: datapackId,
      conversation_id: options?.conversationId || `conv_${crypto.randomUUID()}`,
      agent_id: options?.agentId || "umeed_agent",
      limit: options?.limit ?? 10,
    });

    const result = await this.executeToolCall<{ results?: MekoKnowledgeChunk[] } | MekoKnowledgeChunk[]>(
      "knowledgebase_search",
      validArgs,
      { datapackId: validArgs.datapack_id, agentId: validArgs.agent_id }
    );

    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.results)) return result.results;
    return [];
  }

  // ===========================================================================
  // Isolated Canary Roundtrip Test
  // ===========================================================================

  public async runCanaryTest(
    agentId = "umeed_canary_agent",
    conversationId = `conv_${crypto.randomUUID()}`
  ): Promise<CanaryResult> {
    const startTime = Date.now();
    let canaryId: string | undefined;

    if (!this.isConfigured()) {
      return {
        success: false,
        agent_id: agentId,
        conversation_id: conversationId,
        duration_ms: 0,
        error: "Meko API key is not configured.",
        step_reached: "INITIALIZE",
      };
    }

    try {
      // Step 1: memory_add
      const canaryText = `Meko connection test: umeed-canary @ 1.0.0 — ${new Date().toISOString()}. Safe to delete.`;
      const addRes = await this.addMemory(canaryText, {
        agentId,
        conversationId,
        datapackId: this.productDatapackId,
        metadata: {
          type: "connection-test",
          marker: crypto.randomUUID(),
          client: "umeed-test-suite",
          installed_at: new Date().toISOString(),
        },
      });

      canaryId = addRes.id;

      // Step 2: memory_get_by_id (readback)
      const readRes = await this.getMemoryById(canaryId, {
        agentId,
        conversationId,
        datapackId: this.productDatapackId,
      });

      if (!readRes || readRes.id !== canaryId) {
        return {
          success: false,
          canary_id: canaryId,
          agent_id: agentId,
          conversation_id: conversationId,
          duration_ms: Date.now() - startTime,
          error: "Canary read-back failed: Created memory record was not returned by getMemoryById.",
          step_reached: "GET_BY_ID",
        };
      }

      // Step 3: memory_delete_by_id (cleanup)
      await this.deleteMemoryById(canaryId, {
        agentId,
        conversationId,
        datapackId: this.productDatapackId,
      });

      return {
        success: true,
        canary_id: canaryId,
        agent_id: agentId,
        conversation_id: conversationId,
        duration_ms: Date.now() - startTime,
        step_reached: "COMPLETE",
      };
    } catch (err: unknown) {
      return {
        success: false,
        canary_id: canaryId,
        agent_id: agentId,
        conversation_id: conversationId,
        duration_ms: Date.now() - startTime,
        error: (err as Error)?.message ?? "Canary execution failed",
        step_reached: canaryId ? "GET_BY_ID" : "MEMORY_ADD",
      };
    }
  }

  private logInteraction(entry: MekoInteractionLogEntry): void {
    // Keep sliding window of latest 200 interaction logs
    if (this.interactionLogs.length >= 200) {
      this.interactionLogs.shift();
    }
    this.interactionLogs.push(entry);
  }

  private mapOperation(toolName: string): MekoInteractionLogEntry["operation"] {
    if (toolName.includes("search") || toolName.includes("get") || toolName.includes("list")) return "READ";
    if (toolName.includes("add") || toolName.includes("create")) return "WRITE";
    if (toolName.includes("update")) return "UPDATE";
    if (toolName.includes("delete")) return "DELETE";
    if (toolName.includes("promote")) return "PROMOTE";
    return "READ";
  }
}
