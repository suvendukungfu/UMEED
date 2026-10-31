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
  MekoInitializeResult,
  MekoToolDefinition,
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
  validateToolArguments,
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
  buildMekoInitializedNotification,
  buildMekoToolsListRequest,
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
  private readonly userAgent: string;
  private readonly fetchFn: typeof fetch;
  private readonly interactionLogs: MekoInteractionLogEntry[] = [];
  private sessionId?: string;

  constructor(config: MekoClientConfig & { userAgent?: string } = {}) {
    let envApiKey: string | undefined;
    let envProductDp: string | undefined;
    let envBuildDp: string | undefined;

    try {
      const env = getServerEnv();
      envApiKey = env.MEKO_API_KEY;
      envProductDp = env.MEKO_PRODUCT_DATAPACK_ID || env.MEKO_DATAPACK_ID;
      envBuildDp = env.MEKO_BUILD_DATAPACK_ID || process.env.MEKO_BUILD_DATAPACK_ID;
    } catch {
      // In isolated tests without full environment
    }

    this.apiKey = config.apiKey || envApiKey;
    this.productDatapackId = config.productDatapackId || envProductDp;
    this.buildDatapackId = config.buildDatapackId || envBuildDp;
    this.endpoint = config.endpoint || "https://mcp.mekodata.ai/mcp";
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.userAgent = config.userAgent || "umeed/1.0";
    this.fetchFn = config.fetchFn ?? fetch;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes("<"));
  }

  public getSessionId(): string | undefined {
    return this.sessionId;
  }

  public getInteractionLogs(): MekoInteractionLogEntry[] {
    return [...this.interactionLogs];
  }

  public clearInteractionLogs(): void {
    this.interactionLogs.length = 0;
  }

  // ===========================================================================
  // MCP Streamable HTTP Lifecycle
  // ===========================================================================

  public async initializeSession(): Promise<MekoInitializeResult> {
    if (!this.isConfigured()) {
      throw new MekoAuthError("Meko API key is unconfigured. Set MEKO_API_KEY in .env.local.");
    }

    const correlationId = `init_${crypto.randomUUID()}`;
    const requestPayload = buildMekoInitializeRequest(correlationId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": this.userAgent,
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
        throw new MekoError(`HTTP ${response.status}: ${errorText}`, "MEKO_HTTP_ERROR", response.status);
      }

      const returnedSessionId = response.headers && typeof response.headers.get === "function"
        ? response.headers.get("mcp-session-id")
        : undefined;
      if (returnedSessionId) {
        this.sessionId = returnedSessionId;
      }

      const json = (await response.json()) as MekoJsonRpcResponse;
      const rpcError = extractMekoRpcError(json);
      if (rpcError) throw rpcError;

      // Send notifications/initialized per Streamable HTTP MCP spec
      const initNotification = buildMekoInitializedNotification();
      const notifHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": this.userAgent,
      };
      if (this.sessionId) {
        notifHeaders["Mcp-Session-Id"] = this.sessionId;
      }
      await this.fetchFn(this.endpoint, {
        method: "POST",
        headers: notifHeaders,
        body: JSON.stringify(initNotification),
      }).catch(() => {});

      return json.result as MekoInitializeResult;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof MekoError) throw err;
      throw new MekoNetworkError(sanitizeMekoMessage((err as Error)?.message ?? "Initialize failed"), err);
    }
  }

  public async listTools(): Promise<MekoToolDefinition[]> {
    if (!this.isConfigured()) {
      throw new MekoAuthError("Meko API key is unconfigured. Set MEKO_API_KEY in .env.local.");
    }

    const correlationId = `tools_${crypto.randomUUID()}`;
    const requestPayload = buildMekoToolsListRequest(correlationId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": this.userAgent,
      };
      if (this.sessionId) {
        headers["Mcp-Session-Id"] = this.sessionId;
      }

      const response = await this.fetchFn(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          throw new MekoAuthError(`HTTP 401 Unauthorized: ${errorText}`);
        }
        throw new MekoError(`HTTP ${response.status}: ${errorText}`, "MEKO_HTTP_ERROR", response.status);
      }

      const json = (await response.json()) as MekoJsonRpcResponse;
      const rpcError = extractMekoRpcError(json);
      if (rpcError) throw rpcError;

      const resObj = json.result as { tools?: MekoToolDefinition[] };
      return resObj?.tools ?? [];
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof MekoError) throw err;
      throw new MekoNetworkError(sanitizeMekoMessage((err as Error)?.message ?? "Tools list failed"), err);
    }
  }

  public async closeSession(): Promise<boolean> {
    if (!this.sessionId || !this.isConfigured()) {
      this.sessionId = undefined;
      return false;
    }

    try {
      await this.fetchFn(this.endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Mcp-Session-Id": this.sessionId,
          "User-Agent": this.userAgent,
        },
      });
      this.sessionId = undefined;
      return true;
    } catch {
      this.sessionId = undefined;
      return false;
    }
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
    const validatedArgs = validateToolArguments(toolName, sanitizedArgs);
    const requestPayload = buildMekoToolCallRequest(toolName, validatedArgs, correlationId);

    const maxRetries = 1;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": this.userAgent,
        };
        if (this.sessionId) {
          headers["Mcp-Session-Id"] = this.sessionId;
        }

        const response = await this.fetchFn(this.endpoint, {
          method: "POST",
          headers,
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
          if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < maxRetries) {
            attempt++;
            await new Promise((r) => setTimeout(r, 200 * attempt));
            continue;
          }
          throw new MekoError(`HTTP ${response.status}: ${errorText}`, "MEKO_HTTP_ERROR", response.status);
        }

        const returnedSessionId = response.headers && typeof response.headers.get === "function"
          ? response.headers.get("mcp-session-id")
          : undefined;
        if (returnedSessionId) {
          this.sessionId = returnedSessionId;
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
        lastError = err;
        // Only retry network errors if attempt < maxRetries and not an abort / auth error
        if (
          attempt < maxRetries &&
          !(err instanceof MekoAuthError) &&
          !(err instanceof MekoValidationError) &&
          ((err as Error)?.name !== "AbortError")
        ) {
          attempt++;
          await new Promise((r) => setTimeout(r, 200 * attempt));
          continue;
        }
        break;
      }
    }

    const isAbort = (lastError as Error)?.name === "AbortError";
    const mappedError = isAbort
      ? new MekoNetworkError(`Meko request timed out after ${this.timeoutMs}ms`)
      : lastError instanceof MekoError
      ? lastError
      : new MekoNetworkError(sanitizeMekoMessage((lastError as Error)?.message ?? "Connection failure"), lastError);

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
      // Step 0: initialize session
      try {
        await this.initializeSession();
      } catch {
        // Some servers or proxy bridges accept direct tool calls without explicit initialize
      }

      // Step 1: memory_add with specified harmless technical canary text
      const canaryText =
        "UMEED Phase 6.1 canary: memory persistence and retrieval verification. This is synthetic technical test data, not operational knowledge.";

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

      // Step 4: close session
      await this.closeSession().catch(() => {});

      return {
        success: true,
        canary_id: canaryId,
        agent_id: agentId,
        conversation_id: conversationId,
        duration_ms: Date.now() - startTime,
        step_reached: "COMPLETE",
      };
    } catch (err: unknown) {
      await this.closeSession().catch(() => {});
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
