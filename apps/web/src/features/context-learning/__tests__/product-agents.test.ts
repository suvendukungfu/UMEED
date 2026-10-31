import { describe, it, expect, vi, beforeEach } from "vitest";
import { MatchingAgent } from "../services/matching-agent";
import { FollowUpAgent } from "../services/followup-agent";
import { KnowledgeCurator } from "../services/knowledge-curator";
import { contextTraceService } from "../services/context-trace.service";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { ApiError } from "@/lib/errors";

describe("Phase 6.2 Workstream B: Product Agent Orchestration", () => {
  const dummyApiKey = "mko_tkn_mock_valid_agent_key_12345";
  const dummyProductDp = "dp_prod_uuid_mock_9999";

  beforeEach(() => {
    contextTraceService.clear();
  });

  describe("B1: Matching Agent", () => {
    it("safely falls back to baseline requirements when Meko is unconfigured", async () => {
      const client = new MekoHttpClient({ apiKey: "" }); // unconfigured
      const agent = new MatchingAgent({ mekoClient: client });

      const res = await agent.recallMatchingContext("ANIMAL_RESCUE", ["transport", "first_aid"]);
      expect(res.has_recalled_context).toBe(false);
      expect(res.modified_requirements).toEqual(["transport", "first_aid"]);
      expect(res.influence_citations).toHaveLength(0);
      expect(res.explanation).toContain("unconfigured or inactive");
    });

    it("recalls approved lesson and augments requirements with veterinary care and citations", async () => {
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
                      id: "mem_lesson_vet_001",
                      memory:
                        "Approved lesson: When responding to injured street animals, distinguish physical capture/transport from secondary veterinary surgery and hospital admission.",
                      score: 0.92,
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
        productDatapackId: dummyProductDp,
        fetchFn: mockFetch,
      });

      const agent = new MatchingAgent({ mekoClient: client });

      const res = await agent.recallMatchingContext(
        "ANIMAL_RESCUE",
        ["transport"],
        { caseReference: "CASE-VET-001" }
      );

      expect(res.has_recalled_context).toBe(true);
      expect(res.modified_requirements).toContain("veterinary_care");
      expect(res.influence_citations).toHaveLength(1);
      expect(res.influence_citations[0].memory_id).toBe("mem_lesson_vet_001");
      expect(res.influence_citations[0].injected_requirements).toEqual(["veterinary_care"]);

      // Verify Context Trace recorded for UI Inspector
      const traces = contextTraceService.getTracesForCase("CASE-VET-001");
      expect(traces).toHaveLength(1);
      expect(traces[0].agent_id).toBe("umeed_matching_agent");
      expect(traces[0].recalled_memory_id).toBe("mem_lesson_vet_001");
      expect(traces[0].operation).toBe("READ");
    });

    it("runs grounded matching through deterministic matching service preserving capability exclusions", async () => {
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
                      id: "mem_lesson_vet_002",
                      memory: "Separate animal rescue transport from secondary veterinary care and surgery.",
                      score: 0.88,
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
        productDatapackId: dummyProductDp,
        fetchFn: mockFetch,
      });

      const mockMatchingService = {
        matchIncident: vi.fn().mockResolvedValue({
          incident_reference: "UMD-TEST-001",
          candidates: [
            { ngo_id: "NGO-VET-001", organisation_name: "Delhi Animal Hospital", eligible: true, total_score: 0.9 },
          ],
          eligible_candidates_count: 1,
        }),
      } as unknown as ExplainableMatchingService;

      const agent = new MatchingAgent({
        mekoClient: client,
        matchingService: mockMatchingService,
      });

      const result = await agent.executeGroundedMatching({
        incidentReference: "UMD-TEST-001",
        publicCaseReference: "CASE-001",
        incidentCategory: "ANIMAL_RESCUE",
        initialRequirements: ["transport"],
        enableMeko: true,
      });

      expect(result.groundedRequirements).toContain("veterinary_care");
      expect(mockMatchingService.matchIncident).toHaveBeenCalledWith(
        "UMD-TEST-001",
        undefined,
        expect.arrayContaining(["transport", "veterinary_care"])
      );
    });
  });

  describe("B2: Follow-Up Agent", () => {
    it("suggests resolution review when all needs are resolved", async () => {
      const agent = new FollowUpAgent();
      const res = await agent.recallFollowUpProcedures("ANIMAL_RESCUE", []);
      expect(res.suggested_action).toBe("ESCALATE_COORDINATOR");
      expect(res.rationale).toContain("eligible for human coordinator resolution review");
    });

    it("recalls procedural lessons from Meko when unresolved needs exist", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: "req_followup",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  results: [
                    {
                      id: "mem_proc_001",
                      memory:
                        "Procedure note: For canine trauma, immediate inpatient hospital transfer with x-ray is essential.",
                      score: 0.89,
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
        productDatapackId: dummyProductDp,
        fetchFn: mockFetch,
      });

      const agent = new FollowUpAgent({ mekoClient: client });
      const res = await agent.recallFollowUpProcedures("ANIMAL_RESCUE", ["veterinary_care"], {
        caseReference: "CASE-REC-001",
      });

      expect(res.has_previous_lessons).toBe(true);
      expect(res.suggested_action).toBe("DISPATCH_SECONDARY");
      expect(res.applicable_procedures[0]).toContain("hospital transfer");
      expect(res.memory_citations).toHaveLength(1);
    });
  });

  describe("B3: Knowledge Curator", () => {
    it("proposes de-identified operational lesson and strips PII from case summary", () => {
      const curator = new KnowledgeCurator();
      const proposal = curator.proposeLessonFromCase({
        publicCaseReference: "CASE-PII-001",
        category: "ANIMAL_RESCUE",
        interventionSummary:
          "Successful rescue coordinated at 28.6139, 77.2090. Citizen contact 9876543210 and volunteer email test@example.com handled handover for canine surgery.",
      });

      expect(proposal.pii_audit_passed).toBe(true);
      expect(proposal.status).toBe("DRAFT_PENDING_APPROVAL");
      expect(proposal.deidentified_lesson_text).not.toContain("9876543210");
      expect(proposal.deidentified_lesson_text).not.toContain("test@example.com");
      expect(proposal.deidentified_lesson_text).not.toContain("28.6139");
      expect(proposal.deidentified_lesson_text).toContain("[PHONE_REDACTED]");
    });

    it("requires authenticated coordinator to persist approved lesson", async () => {
      const curator = new KnowledgeCurator();
      const proposal = curator.proposeLessonFromCase({
        publicCaseReference: "CASE-002",
        category: "ANIMAL_RESCUE",
        interventionSummary: "Clean operational procedure for dual ambulance dispatch.",
      });

      await expect(
        curator.persistApprovedLesson(proposal, "")
      ).rejects.toThrow(ApiError);
    });

    it("persists approved lesson to Meko via memory_add and logs trace", async () => {
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
                  results: [{ id: "mem_curated_001", memory: "Clean operational procedure." }],
                }),
              },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDp,
        fetchFn: mockFetch,
      });

      const curator = new KnowledgeCurator({ mekoClient: client });
      const proposal = curator.proposeLessonFromCase({
        publicCaseReference: "CASE-003",
        category: "ANIMAL_RESCUE",
        interventionSummary: "Clean operational procedure for dual ambulance dispatch.",
      });

      const saveRes = await curator.persistApprovedLesson(proposal, "coord_sharma");
      expect(saveRes.status).toBe("SAVED");
      expect(saveRes.memory_id).toBe("mem_curated_001");
      expect(proposal.status).toBe("APPROVED_BY_COORDINATOR");

      const traces = contextTraceService.getTracesForCase("CASE-003");
      expect(traces).toHaveLength(1);
      expect(traces[0].operation).toBe("WRITE");
      expect(traces[0].is_shared_knowledge).toBe(false);
    });

    it("requires explicit coordinator confirmation notes to promote to shared knowledge", async () => {
      const curator = new KnowledgeCurator();
      await expect(
        curator.confirmAndPromoteLesson("mem_curated_001", "coord_sharma", "short")
      ).rejects.toThrow(ApiError);
    });

    it("promotes approved memory to shared knowledge via memory_promote", async () => {
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
                  promoted_ids: ["mem_curated_001"],
                }),
              },
            ],
          },
        }),
      });

      const client = new MekoHttpClient({
        apiKey: dummyApiKey,
        productDatapackId: dummyProductDp,
        fetchFn: mockFetch,
      });

      const curator = new KnowledgeCurator({ mekoClient: client });
      const promoteRes = await curator.confirmAndPromoteLesson(
        "mem_curated_001",
        "coord_sharma",
        "Verified high quality de-identified operational protocol for city-wide canine rescue."
      );

      expect(promoteRes.status).toBe("PROMOTED");
      expect(promoteRes.promoted_ids).toEqual(["mem_curated_001"]);

      const traces = contextTraceService.getAllTraces(1);
      expect(traces[0].operation).toBe("PROMOTE");
      expect(traces[0].is_shared_knowledge).toBe(true);
    });
  });
});
