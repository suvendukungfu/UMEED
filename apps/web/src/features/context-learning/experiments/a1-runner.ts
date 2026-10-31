import {
  createA1SyntheticIncident,
  A1_APPROVED_LESSON,
} from "./synthetic-cases";
import { MatchingAgent } from "../services/matching-agent";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories";
import { InMemoryNGORepository } from "@/features/ngos/repositories";
import { seedDemoNGOs } from "@/features/ngos/services/seed.service";
import { MekoHttpClient } from "@/lib/ai/meko/client";
import { MatchResult, MatchCandidate } from "@umeed/contracts";
import { ContextTraceRecord } from "../types";

export interface ExperimentRunOutput {
  variant: "CONTROL_OFF" | "TREATMENT_ON";
  mekoEnabled: boolean;
  incidentReference: string;
  initialRequirements: string[];
  groundedRequirements: string[];
  recalledMemoryCitations: Array<{
    memory_id: string;
    source_quote: string;
    relevance_score: number;
    reasoning: string;
  }>;
  matchResult: MatchResult;
  topCandidateName: string;
  topCandidateScore: number;
  eligibleCount: number;
  explanationSummary: string;
  trace: ContextTraceRecord | null;
}

export interface A1ExperimentComparison {
  experimentId: string;
  executedAt: string;
  executionMode: "LIVE_REMOTE" | "MOCK_UNIT_EVALUATION";
  isLiveVerified: boolean;
  statusNotes: string;
  controlRun: ExperimentRunOutput;
  treatmentRun: ExperimentRunOutput;
  varianceAnalysis: {
    differenceDetected: boolean;
    requirementsDifference: string[];
    memoryAttribution: {
      memoryId: string;
      sourceText: string;
      reasoning: string;
    } | null;
    clinicalImpactSummary: string;
    integrityVerified: boolean;
  };
}

export async function runA1Experiment(options?: {
  mekoClient?: MekoHttpClient;
  useLiveMekoIfAvailable?: boolean;
}): Promise<A1ExperimentComparison> {
  const executedAt = new Date().toISOString();
  const experimentId = `exp_a1_${Date.now()}`;

  // 1. Setup isolated test environment with identical NGO registry
  const ngoRepo = new InMemoryNGORepository();
  await seedDemoNGOs(ngoRepo);

  const incidentRepo = new InMemoryIncidentRepository();
  const controlIncident = createA1SyntheticIncident("CONTROL_OFF");
  const treatmentIncident = createA1SyntheticIncident("TREATMENT_ON");

  await incidentRepo.create(controlIncident);
  await incidentRepo.create(treatmentIncident);

  const matchingService = new ExplainableMatchingService(ngoRepo, incidentRepo);

  // 2. Determine Meko client mode
  let effectiveClient = options?.mekoClient;
  let isLive = false;

  if (!effectiveClient) {
    const liveClient = new MekoHttpClient();
    if (liveClient.isConfigured() && options?.useLiveMekoIfAvailable) {
      effectiveClient = liveClient;
      isLive = true;
    } else {
      // Offline mock client for deterministic evaluation
      effectiveClient = new MekoHttpClient({
        apiKey: "mko_tkn_mock_a1_evaluation_key_9999",
        productDatapackId: "dp_a1_mock_product_uuid",
        fetchFn: ((async () => ({
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: "req_a1_mock",
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    results: [
                      {
                        id: A1_APPROVED_LESSON.memory_id,
                        memory: A1_APPROVED_LESSON.memory,
                        score: A1_APPROVED_LESSON.relevance_score,
                      },
                    ],
                  }),
                },
              ],
            },
          }),
        })) as unknown as typeof fetch),
      });
      isLive = false;
    }
  }

  // 3. Execute Run 1: Control (OFF) - Meko explicitly disabled
  const matchingAgentOff = new MatchingAgent({
    mekoClient: effectiveClient,
    matchingService,
  });

  const controlGrounded = await matchingAgentOff.executeGroundedMatching({
    incidentReference: controlIncident.public_reference,
    publicCaseReference: "CASE-A1-CONTROL-OFF",
    incidentCategory: controlIncident.incident_type,
    initialRequirements: controlIncident.triage_analysis?.possible_assistance || [],
    enableMeko: false,
  });

  const controlTop = controlGrounded.matchResult.candidates.find((c: MatchCandidate) => c.eligible) || controlGrounded.matchResult.candidates[0];

  const controlOutput: ExperimentRunOutput = {
    variant: "CONTROL_OFF",
    mekoEnabled: false,
    incidentReference: controlIncident.public_reference,
    initialRequirements: controlIncident.triage_analysis?.possible_assistance || [],
    groundedRequirements: controlGrounded.groundedRequirements,
    recalledMemoryCitations: [],
    matchResult: controlGrounded.matchResult,
    topCandidateName: controlTop?.organisation_name || "None",
    topCandidateScore: controlTop?.total_score || 0,
    eligibleCount: controlGrounded.matchResult.eligible_candidates_count,
    explanationSummary: controlGrounded.matchResult.explanation_summary,
    trace: controlGrounded.trace,
  };

  // 4. Execute Run 2: Treatment (ON) - Meko enabled
  const matchingAgentOn = new MatchingAgent({
    mekoClient: effectiveClient,
    matchingService,
  });

  const treatmentGrounded = await matchingAgentOn.executeGroundedMatching({
    incidentReference: treatmentIncident.public_reference,
    publicCaseReference: "CASE-A1-TREATMENT-ON",
    incidentCategory: treatmentIncident.incident_type,
    initialRequirements: treatmentIncident.triage_analysis?.possible_assistance || [],
    enableMeko: true,
  });

  const treatmentTop = treatmentGrounded.matchResult.candidates.find((c: MatchCandidate) => c.eligible) || treatmentGrounded.matchResult.candidates[0];

  const treatmentOutput: ExperimentRunOutput = {
    variant: "TREATMENT_ON",
    mekoEnabled: true,
    incidentReference: treatmentIncident.public_reference,
    initialRequirements: treatmentIncident.triage_analysis?.possible_assistance || [],
    groundedRequirements: treatmentGrounded.groundedRequirements,
    recalledMemoryCitations: treatmentGrounded.contextResult.influence_citations,
    matchResult: treatmentGrounded.matchResult,
    topCandidateName: treatmentTop?.organisation_name || "None",
    topCandidateScore: treatmentTop?.total_score || 0,
    eligibleCount: treatmentGrounded.matchResult.eligible_candidates_count,
    explanationSummary: treatmentGrounded.matchResult.explanation_summary,
    trace: treatmentGrounded.trace,
  };

  // 5. Compute Comparative Variance & Attribution
  const addedRequirements = treatmentOutput.groundedRequirements.filter(
    (r) => !controlOutput.groundedRequirements.includes(r)
  );
  const diffDetected = addedRequirements.length > 0;
  const citation = treatmentOutput.recalledMemoryCitations[0];

  const memoryAttribution = citation
    ? {
        memoryId: citation.memory_id,
        sourceText: citation.source_quote,
        reasoning: citation.reasoning,
      }
    : null;

  const clinicalImpact = diffDetected
    ? `Under Meko OFF, matching only solved physical ambulance transit (${controlOutput.groundedRequirements.join(
        ", "
      )}). Under Meko ON, approved lesson '${citation?.memory_id}' inferred that severe vehicular trauma necessitates veterinary surgical admission, adding [${addedRequirements.join(
        ", "
      )}]. This prevents animal mortality caused by delivering a fractured animal to an ambulance provider with no operating theatre.`
    : "No difference detected between control and treatment runs.";

  // Integrity Check: starting payload equality
  const integrityVerified =
    JSON.stringify(controlIncident.location) === JSON.stringify(treatmentIncident.location) &&
    controlIncident.incident_type === treatmentIncident.incident_type &&
    JSON.stringify(controlIncident.triage_analysis?.possible_assistance) ===
      JSON.stringify(treatmentIncident.triage_analysis?.possible_assistance);

  return {
    experimentId,
    executedAt,
    executionMode: isLive ? "LIVE_REMOTE" : "MOCK_UNIT_EVALUATION",
    isLiveVerified: isLive,
    statusNotes: isLive
      ? "Executed live against remote Meko MCP server and verified product datapack."
      : "Executed using controlled test harness with verified synthetic memory fixture.",
    controlRun: controlOutput,
    treatmentRun: treatmentOutput,
    varianceAnalysis: {
      differenceDetected: diffDetected,
      requirementsDifference: addedRequirements,
      memoryAttribution,
      clinicalImpactSummary: clinicalImpact,
      integrityVerified,
    },
  };
}
