import crypto from "crypto";
import {
  IFollowUpAgent,
  FollowUpAgentContextResult,
  MemoryInfluenceCitation,
} from "@/lib/ai/meko/agents";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { contextTraceService } from "./context-trace.service";
import { GroundedFollowUpResult } from "../types";
import { logger } from "@/lib/logging";

export interface FollowUpAgentOptions {
  mekoClient?: MekoHttpClient;
}

export class FollowUpAgent implements IFollowUpAgent {
  public readonly agentId = "umeed_followup_agent";
  private mekoClient: MekoHttpClient;

  constructor(options: FollowUpAgentOptions = {}) {
    this.mekoClient = options.mekoClient || new MekoHttpClient();
  }

  /**
   * Reviews unfulfilled needs and recalls relevant operational procedures from Meko.
   * Recommends actions grounded in evidence while distinguishing historical patterns from current case facts.
   */
  public async recallFollowUpProcedures(
    category: string,
    unresolvedNeeds: string[],
    options?: { datapackId?: string; conversationId?: string; caseReference?: string }
  ): Promise<FollowUpAgentContextResult> {
    const startTime = Date.now();

    if (unresolvedNeeds.length === 0) {
      return {
        has_previous_lessons: false,
        unresolved_needs: [],
        suggested_action: "ESCALATE_COORDINATOR",
        applicable_procedures: [],
        memory_citations: [],
        rationale: "All primary assistance requirements resolved. Case is eligible for human coordinator resolution review.",
      };
    }

    if (!this.mekoClient.isConfigured()) {
      return {
        has_previous_lessons: false,
        unresolved_needs: [...unresolvedNeeds],
        suggested_action: "DISPATCH_SECONDARY",
        applicable_procedures: [
          `Initiate secondary matching cycle for remaining requirements: [${unresolvedNeeds.join(", ")}].`,
        ],
        memory_citations: [],
        rationale: "Meko memory offline. Standard baseline recursive coordination cycle recommended.",
      };
    }

    try {
      const query = `follow-up coordination protocols for ${category} with unresolved needs: ${unresolvedNeeds.join(", ")}`;
      const retrieved = await this.mekoClient.searchMemories(query, {
        agentId: this.agentId,
        datapackId: options?.datapackId,
        conversationId: options?.conversationId,
        limit: 5,
      });

      if (!retrieved || retrieved.length === 0) {
        return {
          has_previous_lessons: false,
          unresolved_needs: [...unresolvedNeeds],
          suggested_action: "DISPATCH_SECONDARY",
          applicable_procedures: [
            `Initiate secondary matching cycle for remaining needs: [${unresolvedNeeds.join(", ")}].`,
          ],
          memory_citations: [],
          rationale: "No specific prior operational lessons found in datapack. Defaulting to standard recursive matching cycle.",
        };
      }

      const citations: MemoryInfluenceCitation[] = [];
      const procedures: string[] = [];

      for (const item of retrieved) {
        if ((item.score ?? 0) < 0.5) continue;

        const text = item.memory.toLowerCase();

        // Pattern: Animal rescue completed, post-rescue medical triage/quarantine needed
        if (text.includes("inpatient") || text.includes("quarantine") || text.includes("veterinary") || text.includes("hospital")) {
          procedures.push(
            "Protocol: Fast-track direct hospital transfer with diagnostic x-ray and post-operative monitoring ward booking."
          );
          citations.push({
            memory_id: item.id,
            source_quote: item.memory.substring(0, 150),
            relevance_score: item.score ?? 0.85,
            reasoning:
              "Previous multi-stage intervention data confirms that traumatic injuries require immediate hospital bed allocation rather than open-air holding.",
          });
        }
      }

      const hasLessons = citations.length > 0;
      const suggestedAction: FollowUpAgentContextResult["suggested_action"] = "DISPATCH_SECONDARY";
      const rationale = hasLessons
        ? `Recalled ${citations.length} prior coordination protocols from Meko. Historical evidence recommends structured secondary dispatch with verified medical capabilities.`
        : `Evaluated ${retrieved.length} records. Standard secondary cycle appropriate.`;

      if (options?.caseReference) {
        contextTraceService.recordTrace({
          case_reference: options.caseReference,
          incident_reference: "recursive_cycle",
          agent_id: this.agentId,
          operation: "READ",
          datapack_id: this.mekoClient.productDatapackId || "umeed-product-context",
          datapack_name: "umeed-product-context",
          recalled_memory_id: citations[0]?.memory_id,
          memory_content: citations[0]?.source_quote,
          relevance_score: citations[0]?.relevance_score,
          influence_summary: rationale,
          is_shared_knowledge: true,
          latency_ms: Date.now() - startTime,
        });
      }

      return {
        has_previous_lessons: hasLessons,
        unresolved_needs: [...unresolvedNeeds],
        suggested_action: suggestedAction,
        applicable_procedures: procedures.length > 0 ? procedures : [`Dispatch secondary responder for [${unresolvedNeeds.join(", ")}]`],
        memory_citations: citations,
        rationale,
      };
    } catch (err) {
      logger.warn("FollowUpAgent recall failed gracefully", "FOLLOWUP_AGENT", {
        error: (err as Error)?.message,
      });

      return {
        has_previous_lessons: false,
        unresolved_needs: [...unresolvedNeeds],
        suggested_action: "DISPATCH_SECONDARY",
        applicable_procedures: [
          `Initiate secondary matching cycle for remaining requirements: [${unresolvedNeeds.join(", ")}].`,
        ],
        memory_citations: [],
        rationale: `Context recall error (${(err as Error)?.message}). Safely falling back to baseline recursive cycle.`,
      };
    }
  }

  /**
   * Evaluates case follow-up with grounded recommendations.
   */
  public async evaluateFollowUp(params: {
    caseReference: string;
    category: string;
    unresolvedNeeds: string[];
    enableMeko?: boolean;
    conversationId?: string;
  }): Promise<GroundedFollowUpResult> {
    const isMekoEnabled = params.enableMeko ?? true;

    let res: FollowUpAgentContextResult;
    if (isMekoEnabled) {
      res = await this.recallFollowUpProcedures(
        params.category,
        params.unresolvedNeeds,
        {
          caseReference: params.caseReference,
          conversationId: params.conversationId,
        }
      );
    } else {
      res = {
        has_previous_lessons: false,
        unresolved_needs: [...params.unresolvedNeeds],
        suggested_action: "DISPATCH_SECONDARY",
        applicable_procedures: [`Standard baseline secondary matching for [${params.unresolvedNeeds.join(", ")}]`],
        memory_citations: [],
        rationale: "Meko contextual memory explicitly disabled (OFF run). Standard workflow executed.",
      };
    }

    const latestTrace = contextTraceService.getTracesForCase(params.caseReference).slice(-1)[0] || null;

    return {
      suggestedAction: res.suggested_action,
      applicableProcedures: res.applicable_procedures,
      unresolvedNeeds: res.unresolved_needs,
      rationale: res.rationale,
      citations: res.memory_citations,
      trace: latestTrace,
    };
  }
}

