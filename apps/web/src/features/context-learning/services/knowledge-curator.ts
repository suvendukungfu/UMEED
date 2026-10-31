import crypto from "crypto";
import {
  IKnowledgeCurator,
  ProposedCuratedLesson,
} from "@/lib/ai/meko/agents";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { validateOperationalMemoryText } from "@/lib/ai/meko/schemas";
import { contextTraceService } from "./context-trace.service";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export interface KnowledgeCuratorOptions {
  mekoClient?: MekoHttpClient;
}

export class KnowledgeCurator implements IKnowledgeCurator {
  public readonly agentId = "umeed_knowledge_curator";
  private mekoClient: MekoHttpClient;
  private proposedLessons = new Map<string, ProposedCuratedLesson>();

  constructor(options: KnowledgeCuratorOptions = {}) {
    this.mekoClient = options.mekoClient || new MekoHttpClient();
  }

  /**
   * Proposes a clean, de-identified operational lesson candidate from a resolved case.
   * Strips all PII: phone numbers, emails, exact coordinates, tracking tokens, citizen identities.
   */
  public proposeLessonFromCase(caseOutcome: {
    publicCaseReference: string;
    category: string;
    interventionSummary: string;
    secondaryCycleSummary?: string;
  }): ProposedCuratedLesson {
    const proposalId = `prop_${crypto.randomUUID()}`;

    // Scrub identifying details
    let deidentified = caseOutcome.interventionSummary
      .replace(/(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g, "[PHONE_REDACTED]")
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]")
      .replace(/[-+]?([1-8]?\d(\.\d+)|90(\.0+)),\s*[-+]?(180(\.0+)|((1[0-7]\d)|([1-9]?\d))(\.\d+))/g, "[COORDINATES_REDACTED]")
      .replace(/trk_[a-zA-Z0-9]+/gi, "[TOKEN_REDACTED]")
      .replace(/(mko_tkn_|AIzaSy|AKIA)[a-zA-Z0-9_-]+/g, "[SECRET_REDACTED]");

    if (caseOutcome.secondaryCycleSummary) {
      deidentified += ` ${caseOutcome.secondaryCycleSummary.replace(/(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g, "[REDACTED]")}`;
    }

    // Run strict PII validator
    const piiValidation = validateOperationalMemoryText(deidentified);

    const proposal: ProposedCuratedLesson = {
      proposal_id: proposalId,
      source_case_reference: caseOutcome.publicCaseReference,
      category: caseOutcome.category,
      deidentified_lesson_text: deidentified,
      supporting_outcome_summary: `Derived from successfully resolved case ${caseOutcome.publicCaseReference}.`,
      pii_audit_passed: piiValidation.isValid,
      created_at: new Date().toISOString(),
      status: "DRAFT_PENDING_APPROVAL",
    };

    this.proposedLessons.set(proposalId, proposal);

    logger.info("Knowledge curator created lesson proposal", "KNOWLEDGE_CURATOR", {
      proposal_id: proposalId,
      case_reference: caseOutcome.publicCaseReference,
      pii_passed: piiValidation.isValid,
    });

    return proposal;
  }

  public getProposal(proposalId: string): ProposedCuratedLesson | undefined {
    return this.proposedLessons.get(proposalId);
  }

  public listProposals(): ProposedCuratedLesson[] {
    return Array.from(this.proposedLessons.values());
  }

  /**
   * Persists an approved lesson into private memory via Meko memory_add
   * ONLY after explicit coordinator sign-off and passing PII check.
   */
  public async persistApprovedLesson(
    lesson: ProposedCuratedLesson,
    coordinatorId: string
  ): Promise<{ memory_id: string; status: "SAVED" }> {
    if (!coordinatorId || coordinatorId.trim().length === 0) {
      throw ApiError.unauthorized("Only authenticated coordinators can approve and save operational lessons.");
    }

    if (!lesson.pii_audit_passed) {
      throw ApiError.badRequest("Cannot persist memory: PII audit failed. Identifying citizen details detected.");
    }

    if (!this.mekoClient.isConfigured()) {
      throw ApiError.badRequest("Meko memory client is unconfigured. Cannot persist memory to remote datapack.");
    }

    const startTime = Date.now();
    const result = await this.mekoClient.addMemory(lesson.deidentified_lesson_text, {
      agentId: this.agentId,
      datapackId: this.mekoClient.productDatapackId,
      metadata: {
        proposal_id: lesson.proposal_id,
        source_case: lesson.source_case_reference,
        category: lesson.category,
        approved_by: coordinatorId,
        visibility: "private_memory",
      },
    });

    // Update local proposal record
    lesson.status = "APPROVED_BY_COORDINATOR";
    this.proposedLessons.set(lesson.proposal_id, lesson);

    // Record trace
    contextTraceService.recordTrace({
      case_reference: lesson.source_case_reference,
      incident_reference: "curation_approval",
      agent_id: this.agentId,
      operation: "WRITE",
      datapack_id: this.mekoClient.productDatapackId || "umeed-product-context",
      datapack_name: "umeed-product-context",
      recalled_memory_id: result.id,
      memory_content: lesson.deidentified_lesson_text,
      influence_summary: `Coordinator '${coordinatorId}' approved and saved de-identified operational lesson.`,
      is_shared_knowledge: false,
      latency_ms: Date.now() - startTime,
    });

    return {
      memory_id: result.id,
      status: "SAVED",
    };
  }

  /**
   * Promotes private memory into shared knowledge via Meko memory_promote
   * after explicit user confirmation of shared visibility.
   */
  public async confirmAndPromoteLesson(
    memoryId: string,
    coordinatorId: string,
    confirmationNotes: string
  ): Promise<{ status: "PROMOTED"; promoted_ids: string[] }> {
    if (!coordinatorId || coordinatorId.trim().length === 0) {
      throw ApiError.unauthorized("Only authenticated coordinators can promote memories to shared knowledge.");
    }

    if (!confirmationNotes || confirmationNotes.trim().length < 10) {
      throw ApiError.badRequest(
        "Promotion requires explicit coordinator confirmation notes (minimum 10 characters) justifying shared visibility."
      );
    }

    if (!this.mekoClient.isConfigured()) {
      throw ApiError.badRequest("Meko memory client is unconfigured. Cannot promote memory in remote datapack.");
    }

    const startTime = Date.now();
    const promoteResult = await this.mekoClient.promoteMemories([memoryId], {
      agentId: this.agentId,
      datapackId: this.mekoClient.productDatapackId,
    });

    const promotedIds = [
      ...promoteResult.inserted_ids,
      ...promoteResult.updated_ids,
    ];
    const finalPromotedIds = promotedIds.length > 0 ? promotedIds : [memoryId];

    contextTraceService.recordTrace({
      case_reference: "shared_promotion",
      incident_reference: "promotion_event",
      agent_id: this.agentId,
      operation: "PROMOTE",
      datapack_id: this.mekoClient.productDatapackId || "umeed-product-context",
      datapack_name: "umeed-product-context",
      recalled_memory_id: memoryId,
      memory_content: `Promoted memory: ${memoryId}`,
      influence_summary: `Coordinator '${coordinatorId}' promoted memory to shared knowledge. Notes: "${confirmationNotes}".`,
      is_shared_knowledge: true,
      latency_ms: Date.now() - startTime,
    });

    return {
      status: "PROMOTED",
      promoted_ids: finalPromotedIds,
    };
  }
}
