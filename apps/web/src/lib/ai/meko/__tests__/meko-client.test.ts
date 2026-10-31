import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MekoHttpClient,
  MekoAuthError,
  MekoValidationError,
  MekoPromotedError,
  MekoRateLimitError,
  validateOperationalMemoryText,
  sanitizeMekoMessage,
} from "../index";

describe("Phase 6.0: Meko MCP Client & Protocol Architecture", () => {
  const dummyApiKey = "mko_tkn_testdummyvalidkey12345678";
  const dummyProductDatapack = "dp_prod_00000000-0000-0000-0000-000000000001";
  const dummyBuildDatapack = "dp_build_00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Configuration & Authentication Safety", () => {
    it("reports isConfigured false when API key is missing or blank", () => {
      const client = new MekoHttpClient({ apiKey: "" });
      expect(client.isConfigured()).toBe(false);
    });

    it("reports isConfigured false when API key contains placeholder brackets", () => {
      const client = new MekoHttpClient({ apiKey: "mko_tkn_<your_key_here>" });
      expect(client.isConfigured()).toBe(false);
    });

    it("reports isConfigured true when a valid key string is provided", () => {
      const client = new MekoHttpClient({ apiKey: dummyApiKey });
      expect(client.isConfigured()).toBe(true);
    });

    it("throws MekoAuthError when executing calls without configured credentials", async () => {
      const client = new MekoHttpClient({ apiKey: "" });
      await expect(client.searchMemories("canine")).rejects.toThrow(MekoAuthError);
    });

    it("sanitizes API keys and Bearer tokens from error strings", () => {
      const secret = "mko_tkn_verysecretalphanumeric12345";
      const raw = `Error: Request failed with header Authorization: Bearer ${secret}`;
      const sanitized = sanitizeMekoMessage(raw);
      expect(sanitized).not.toContain(secret);
      expect(sanitized).toContain("Bearer ***");
    });
  });

  describe("Privacy & PII Prevention Guardrails (A5 & Section 8)", () => {
    it("approves clean, de-identified operational lessons", () => {
      const validLesson =
        "Animal rescue and veterinary follow-up are separate assistance capabilities. For after-hours injury reports, coordinators should check whether a separate veterinary provider is required and revalidate current service availability.";
      const res = validateOperationalMemoryText(validLesson);
      expect(res.isValid).toBe(true);
      expect(res.violation).toBeUndefined();
    });

    it("rejects memory candidate containing email addresses", () => {
      const piiText = "Coordinator rahul.sharma@ngo-help.org agreed to take this case tomorrow morning.";
      const res = validateOperationalMemoryText(piiText);
      expect(res.isValid).toBe(false);
      expect(res.violation).toContain("email address");
    });

    it("rejects memory candidate containing phone numbers", () => {
      const piiText = "Direct ambulance driver contact is +91-9876543210 for emergency gate access.";
      const res = validateOperationalMemoryText(piiText);
      expect(res.isValid).toBe(false);
      expect(res.violation).toContain("phone number");
    });

    it("rejects memory candidate containing high-precision GPS coordinates", () => {
      const piiText = "Animal found bleeding at 28.613939, 77.209021 behind Metro Gate 4.";
      const res = validateOperationalMemoryText(piiText);
      expect(res.isValid).toBe(false);
      expect(res.violation).toContain("GPS coordinates");
    });

    it("rejects memory candidate containing secret citizen tracking tokens", () => {
      const piiText = "Verify case using tracking token trk_a1b2c3d4e5f6g7h8 to read citizen history.";
      const res = validateOperationalMemoryText(piiText);
      expect(res.isValid).toBe(false);
      expect(res.violation).toContain("tracking token");
    });

    it("rejects memory text exceeding 2000 characters", () => {
      const longText = "A".repeat(2005);
      const res = validateOperationalMemoryText(longText);
      expect(res.isValid).toBe(false);
      expect(res.violation).toContain("maximum length");
    });

    it("throws MekoValidationError when attempting to add PII to memory", async () => {
      const client = new MekoHttpClient({ apiKey: dummyApiKey });
      await expect(
        client.addMemory("Contact citizen directly at 9876543210 for gate key.")
      ).rejects.toThrow(MekoValidationError);
    });
  });

  describe("Tool Whitelist Enforcement", () => {
    it("rejects arbitrary or unsupported tool execution", async () => {
      const client = new MekoHttpClient({ apiKey: dummyApiKey });
      await expect(
        client.executeToolCall("unrestricted_shell_exec", { command: "ls" })
      ).rejects.toThrow(MekoValidationError);
    });

    it("rejects tool execution when obsolete 'scope' or unrecognized argument is passed", async () => {
      const client = new MekoHttpClient({ apiKey: dummyApiKey });
      await expect(
        client.executeToolCall("memory_search", {
          query: "animal rescue",
          conversation_id: "conv_test",
          scope: "global", // obsolete parameter!
        })
      ).rejects.toThrow(MekoValidationError);
    });
  });

  describe("Mocked Protocol & Tool Operations", () => {
    it("lists datapacks and preserves isolation metadata", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_1",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  datapacks: [
                    { id: dummyProductDatapack, name: "umeed-product-context", role: "maintainer" },
                    { id: dummyBuildDatapack, name: "umeed-build", role: "maintainer" },
                  ],
                }),
              },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        buildDatapackId: dummyBuildDatapack,
        fetchFn: mockFetch,
      });

      const datapacks = await client.listDatapacks();
      expect(datapacks).toHaveLength(2);
      expect(datapacks[0].name).toBe("umeed-product-context");
      expect(datapacks[1].name).toBe("umeed-build");

      // Verify request payload headers and structure
      expect(mockFetch).toHaveBeenCalledWith(
        "https://mcp.mekodata.ai/mcp",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${dummyApiKey}`,
            "User-Agent": "umeed/1.0",
          }),
        })
      );
    });

    it("stores a de-identified operational memory via memory_add", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_add",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  results: [{ id: "mem_canine_001", memory: "Animal rescue and vet follow-up are distinct." }],
                }),
              },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      const result = await client.addMemory(
        "Animal rescue and vet follow-up are distinct capabilities.",
        { agentId: "umeed_curator" }
      );

      expect(result.id).toBe("mem_canine_001");
      expect(client.getInteractionLogs()).toHaveLength(1);
      expect(client.getInteractionLogs()[0].tool_name).toBe("memory_add");
      expect(client.getInteractionLogs()[0].status).toBe("SUCCESS");
    });

    it("searches memories using hybrid retrieval scoring via memory_search", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_search",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  results: [
                    {
                      id: "mem_canine_001",
                      memory: "Animal rescue and vet follow-up are distinct capabilities.",
                      score: 0.89,
                      raw_similarity_score: 0.76,
                    },
                  ],
                }),
              },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      const hits = await client.searchMemories("animal rescue after hours", { limit: 5 });
      expect(hits).toHaveLength(1);
      expect(hits[0].id).toBe("mem_canine_001");
      expect(hits[0].score).toBe(0.89);
    });

    it("updates memory via memory_update and deletes via memory_delete_by_id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_op",
          result: { content: [{ type: "text", text: JSON.stringify({ success: true }) }] },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      const updated = await client.updateMemory(
        "mem_001",
        "Refined operational learning: Always confirm ambulance driver phone via official NGO line."
      );
      expect(updated).toBe(true);

      const deleted = await client.deleteMemoryById("mem_001");
      expect(deleted).toBe(true);
    });

    it("promotes memories into shared knowledge via memory_promote", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_promote",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  inserted_ids: ["mem_001"],
                  updated_ids: [],
                  not_found_ids: [],
                }),
              },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      const res = await client.promoteMemories(["mem_001"]);
      expect(res.inserted_ids).toContain("mem_001");
      expect(res.not_found_ids).toHaveLength(0);
    });

    it("handles promoted memory modification rejection (409)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_mod",
          error: {
            code: 409,
            message: "memory_is_promoted: Promoted memories cannot be edited or deleted via memory tools.",
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      await expect(
        client.updateMemory("mem_promoted_001", "Attempting update on promoted knowledge")
      ).rejects.toThrow(MekoPromotedError);
    });

    it("handles rate limiting (429)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_rate",
          error: {
            code: 429,
            message: "free_tier_limit_reached: Monthly memory search quota exhausted.",
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        fetchFn: mockFetch,
      });

      await expect(client.searchMemories("test query")).rejects.toThrow(MekoRateLimitError);
    });

    it("retries once on transient 503 HTTP error and succeeds on second attempt", async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 503,
            text: async () => "Service Unavailable",
          };
        }
        return {
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: "req_retry",
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    results: [{ id: "mem_retry_1", memory: "Success on retry" }],
                  }),
                },
              ],
            },
          }),
        };
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      const res = await client.searchMemories("retry test");
      expect(callCount).toBe(2);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("mem_retry_1");
    });
  });

  describe("MCP Streamable HTTP Protocol Lifecycle (Section 5)", () => {
    it("initializes session, captures Mcp-Session-Id header, and sends notifications/initialized", async () => {
      let initNotifSent = false;
      const dummySessionId = "sess_mock_uuid_12345";

      const mockFetch = vi.fn().mockImplementation(async (_, opts) => {
        const body = JSON.parse(opts.body);

        if (body.method === "initialize") {
          return {
            ok: true,
            headers: {
              get: (header: string) => (header.toLowerCase() === "mcp-session-id" ? dummySessionId : null),
            },
            json: async () => ({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                serverInfo: { name: "meko-server", version: "3.5.0" },
              },
            }),
          };
        }

        if (body.method === "notifications/initialized") {
          initNotifSent = true;
          return { ok: true, text: async () => "" };
        }

        throw new Error(`Unexpected request: ${body.method}`);
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        fetchFn: mockFetch,
      });

      const initRes = await client.initializeSession();
      expect(initRes.protocolVersion).toBe("2024-11-05");
      expect(initRes.serverInfo.name).toBe("meko-server");
      expect(client.getSessionId()).toBe(dummySessionId);
      expect(initNotifSent).toBe(true);
    });

    it("discovers tools using tools/list", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_tools",
          result: {
            tools: [
              { name: "memory_add", description: "Store a memory" },
              { name: "memory_search", description: "Search memories" },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        fetchFn: mockFetch,
      });

      const tools = await client.listTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe("memory_add");
    });

    it("terminates active session via DELETE request on closeSession", async () => {
      let deleteCalledWithSession = false;
      const dummySessionId = "sess_active_delete_999";

      const mockFetch = vi.fn().mockImplementation(async (_, opts) => {
        if (opts.method === "DELETE") {
          if (opts.headers["Mcp-Session-Id"] === dummySessionId) {
            deleteCalledWithSession = true;
          }
          return { ok: true };
        }
        if (opts.method === "POST") {
          return {
            ok: true,
            headers: {
              get: (header: string) => (header.toLowerCase() === "mcp-session-id" ? dummySessionId : null),
            },
            json: async () => ({
              jsonrpc: "2.0",
              id: 1,
              result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "test" } },
            }),
          };
        }
        throw new Error("Unexpected call");
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        fetchFn: mockFetch,
      });

      await client.initializeSession();
      expect(client.getSessionId()).toBe(dummySessionId);

      const closed = await client.closeSession();
      expect(closed).toBe(true);
      expect(deleteCalledWithSession).toBe(true);
      expect(client.getSessionId()).toBeUndefined();
    });
  });

  describe("Isolated Canary Verification Roundtrip", () => {
    it("successfully completes Canary lifecycle (add -> get_by_id -> delete)", async () => {
      const canaryId = "canary_mem_999";
      let isMemoryDeleted = false;

      const mockFetch = vi.fn().mockImplementation(async (_, opts) => {
        if (opts.method === "DELETE") {
          return { ok: true };
        }

        const body = JSON.parse(opts.body);
        const method = body.method;

        if (method === "initialize") {
          return {
            ok: true,
            headers: { get: () => "sess_canary_123" },
            json: async () => ({
              jsonrpc: "2.0",
              id: body.id,
              result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "meko" } },
            }),
          };
        }

        if (method === "notifications/initialized") {
          return { ok: true, text: async () => "" };
        }

        const toolName = body.params?.name;

        if (toolName === "memory_add") {
          return {
            ok: true,
            headers: { get: () => null },
            json: async () => ({
              jsonrpc: "2.0",
              id: body.id,
              result: { content: [{ type: "text", text: JSON.stringify({ results: [{ id: canaryId }] }) }] },
            }),
          };
        }

        if (toolName === "memory_get_by_id") {
          return {
            ok: true,
            headers: { get: () => null },
            json: async () => ({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      id: canaryId,
                      memory:
                        "UMEED Phase 6.1 canary: memory persistence and retrieval verification. This is synthetic technical test data, not operational knowledge.",
                    }),
                  },
                ],
              },
            }),
          };
        }

        if (toolName === "memory_delete_by_id") {
          isMemoryDeleted = true;
          return {
            ok: true,
            headers: { get: () => null },
            json: async () => ({
              jsonrpc: "2.0",
              id: body.id,
              result: { content: [{ type: "text", text: JSON.stringify({ success: true }) }] },
            }),
          };
        }

        throw new Error(`Unexpected mock tool call: ${toolName}`);
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDatapack,
        fetchFn: mockFetch,
      });

      const result = await client.runCanaryTest();
      expect(result.success).toBe(true);
      expect(result.canary_id).toBe(canaryId);
      expect(result.step_reached).toBe("COMPLETE");
      expect(isMemoryDeleted).toBe(true);
    });
  });
});
