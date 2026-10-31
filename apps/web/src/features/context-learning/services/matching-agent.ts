import crypto from "crypto";
import {
  IMatchingAgent,
  MatchingAgentContextResult,
  MemoryInfluenceCitation,
} from "@/lib/ai/meko/agents";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { contextTraceService } from "./context-trace.service";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { GroundedMatchingResult } from "../types";
import { logger } from "@/lib/logging";

export interface MatchingAgentOptions {
  mekoClient?: MekoHttpClient;
  matchingService?: ExplainableMatchingService;
}

export class MatchingAgent implements IMatchingAgent {
  public readonly agentId = "umeed_matching_agent";
  private mekoClient: MekoHttpClient;
  private matchingService: ExplainableMatchingService;

  constructor(options: MatchingAgentOptions = {}) {
    this.mekoClient = options.mekoClient || new MekoHttpClient();
    this.matchingService = options.matchingService || new ExplainableMatchingService();
  }

  /**
   * Recalls relevant approved operational memories before deterministic matching.
   * If an approved lesson is recalled (e.g. distinguishing animal rescue/transport from veterinary surgery),
   * augments the required assistance categories with explicit citations and reasoning.
   */
  public async recallMatchingContext(
    incidentCategory: string,
    initialRequirements: string[],
    options?: { datapackId?: string; conversationId?: string; caseReference?: string; incidentReference?: string }
  ): Promise<MatchingAgentContextResult> {
    const startTime = Date.now();

    // Check if Meko is configured
    if (!this.mekoClient.isConfigured()) {
      return {
        has_recalled_context: false,
        retrieved_memories: [],
        modified_requirements: [...initialRequirements],
        influence_citations: [],
        explanation: "Meko contextual memory is unconfigured or inactive. Proceeding with baseline triage requirements.",
      };
    }

    try {
      const sanitizedCategory = incidentCategory.replace(/[^a-zA-Z0-9_\s]/g, "").trim();
      const sanitizedRequirements = initialRequirements.map((r) => r.replace(/[^a-zA-Z0-9_\s]/g, "").trim());

      const query = `operational lessons for ${sanitizedCategory} assistance: ${sanitizedRequirements.join(", ")}`;

      const retrieved = await this.mekoClient.searchMemories(query, {
        agentId: this.agentId,
        datapackId: options?.datapackId,
        conversationId: options?.conversationId,
        limit: 5,
      });

      if (!retrieved || retrieved.length === 0) {
        return {
          has_recalled_context: false,
          retrieved_memories: [],
          modified_requirements: [...initialRequirements],
          influence_citations: [],
          explanation: "No applicable prior lessons recalled from Meko product datapack. Baseline matching applied.",
        };
      }

      // Filter by relevance threshold (score >= 0.5)
      const relevant = retrieved.filter((m) => (m.score ?? 0) >= 0.5);

      if (relevant.length === 0) {
        return {
          has_recalled_context: false,
          retrieved_memories: retrieved.map((m) => ({ id: m.id, text: m.memory, score: m.score ?? 0 })),
          modified_requirements: [...initialRequirements],
          influence_citations: [],
          explanation: "Retrieved memories were below the relevance threshold (score < 0.50). Baseline requirements preserved.",
        };
      }

      const modifiedReqs = new Set<string>(initialRequirements);
      const citations: MemoryInfluenceCitation[] = [];

      for (const item of relevant) {
        const memText = item.memory.toLowerCase();

        // Specific pattern: Street animal rescue / trauma needing veterinary care or surgical follow-up
        if (
          sanitizedCategory.toLowerCase().includes("animal") ||
          sanitizedCategory.toLowerCase().includes("rescue")
        ) {
          const mentionsSurgeryOrVet =
            memText.includes("veterinary") ||
            memText.includes("surgery") ||
            memText.includes("trauma") ||
            memText.includes("inpatient");

          const mentionsSeparation =
            memText.includes("separate") ||
            memText.includes("distinct") ||
            memText.includes("follow-up") ||
            memText.includes("secondary") ||
            memText.includes("dual");

          if (mentionsSurgeryOrVet && mentionsSeparation) {
            const injected: string[] = [];
            if (!modifiedReqs.has("veterinary_care")) {
              modifiedReqs.add("veterinary_care");
              injected.push("veterinary_care");
            }

            citations.push({
              memory_id: item.id,
              source_quote: item.memory.substring(0, 150) + (item.memory.length > 150 ? "..." : ""),
              relevance_score: item.score ?? 0.8,
              reasoning:
                "Historical lesson demonstrates that physical rescue/transport must be paired with clinical veterinary assessment to prevent post-rescue mortality.",
              injected_requirements: injected,
            });
          }
        }
      }

      const finalRequirements = Array.from(modifiedReqs);
      const hasModification = citations.length > 0 && finalRequirements.length > initialRequirements.length;

      const explanation = hasModification
        ? `Retrieved ${relevant.length} approved lessons from Meko. Grounded context augmented requirements with [${citations
            .flatMap((c) => c.injected_requirements || [])
            .join(", ")}] based on historical operational evidence.`
        : `Retrieved ${relevant.length} relevant memories, but baseline requirements were already complete.`;

      // Record context trace for audit and UI inspector
      if (options?.caseReference || options?.incidentReference) {
        const topCitation = citations[0];
        contextTraceService.recordTrace({
          case_reference: options?.caseReference || "unassigned",
          incident_reference: options?.incidentReference || "unassigned",
          agent_id: this.agentId,
          operation: "READ",
          datapack_id: this.mekoClient.productDatapackId || "umeed-product-context",
          datapack_name: "umeed-product-context",
          recalled_memory_id: topCitation?.memory_id || relevant[0]?.id,
          memory_content: topCitation?.source_quote || relevant[0]?.memory,
          relevance_score: topCitation?.relevance_score || relevant[0]?.score,
          influence_summary: explanation,
          is_shared_knowledge: true,
          latency_ms: Date.now() - startTime,
        });
      }

      return {
        has_recalled_context: true,
        retrieved_memories: relevant.map((m) => ({ id: m.id, text: m.memory, score: m.score ?? 0 })),
        modified_requirements: finalRequirements,
        influence_citations: citations,
        explanation,
      };
    } catch (err) {
      logger.warn("Meko memory recall failed gracefully; falling back to baseline", "MATCHING_AGENT", {
        error: (err as Error)?.message,
      });

      return {
        has_recalled_context: false,
        retrieved_memories: [],
        modified_requirements: [...initialRequirements],
        influence_citations: [],
        explanation: `Memory retrieval error (${(err as Error)?.message}). Safely defaulted to baseline requirements without disruption.`,
      };
    }
  }

  /**
   * Orchestrates complete grounded matching: recalls approved context, validates relevance,
   * passes grounded requirements to deterministic matching engine, and returns explainable result.
   */
  public async executeGroundedMatching(params: {
    incidentReference: string;
    publicCaseReference?: string;
    incidentCategory: string;
    initialRequirements: string[];
    enableMeko?: boolean;
    conversationId?: string;
  }): Promise<GroundedMatchingResult> {
    const isMekoEnabled = params.enableMeko ?? true;

    let contextResult: MatchingAgentContextResult;
    if (isMekoEnabled) {
      contextResult = await this.recallMatchingContext(
        params.incidentCategory,
        params.initialRequirements,
        {
          conversationId: params.conversationId,
          caseReference: params.publicCaseReference,
          incidentReference: params.incidentReference,
        }
      );
    } else {
      contextResult = {
        has_recalled_context: false,
        retrieved_memories: [],
        modified_requirements: [...params.initialRequirements],
        influence_citations: [],
        explanation: "Meko contextual memory explicitly disabled (OFF run). Baseline matching applied.",
      };
    }

    // Run deterministic matching engine with grounded requirements
    const matchResult = await this.matchingService.matchIncident(
      params.incidentReference,
      undefined,
      contextResult.modified_requirements
    );

    const latestTrace = params.publicCaseReference
      ? contextTraceService.getTracesForCase(params.publicCaseReference).slice(-1)[0] || null
      : null;

    return {
      matchResult,
      contextResult,
      groundedRequirements: contextResult.modified_requirements,
      trace: latestTrace,
    };
  }
}
