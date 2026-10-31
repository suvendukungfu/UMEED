import { describe, it, expect } from "vitest";
import { HandoffIntelligenceEngine } from "../services/handoff-engine.service";
import { HistoricalLesson } from "../types";

describe("Workstream B: Handoff Intelligence Domain Engine", () => {
  const engine = new HandoffIntelligenceEngine();

  const mockAnimalHandoffLesson: HistoricalLesson = {
    lesson_id: "lsn_vet_handoff_001",
    memory_id: "mem_vet_handoff_8912",
    category: "animal_welfare",
    lesson_text:
      "Rescue transport completion does not establish receiving-provider acceptance. For cases requiring clinical assessment, verify the receiving provider's acceptance before considering the handoff complete.",
    applicability_condition: "incident_type == animal_welfare && requires_clinical_triage",
    evidence: {
      memory_id: "mem_vet_handoff_8912",
      datapack_id: "umeed-product-context",
      source_quote: "verify the receiving provider's acceptance before considering the handoff complete",
      relevance_score: 0.94,
      retrieved_at: "2026-10-31T22:00:00.000Z",
      is_promoted: true,
      reasoning: "Prior incident showed patient stranded when receiving shelter lacked medical personnel.",
    },
  };

  it("generates baseline single-stage checkpoint without Meko context", () => {
    const checkpoints = engine.generateInitialCheckpoints("animal_welfare", null);
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].checkpoint_id).toBe("chk_rescue_transport");
    expect(checkpoints[0].is_context_injected).toBe(false);
  });

  it("augments checkpoints with 'Receiving Provider Acceptance' when Meko context is provided", () => {
    const checkpoints = engine.generateInitialCheckpoints("animal_welfare", mockAnimalHandoffLesson);
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0].checkpoint_id).toBe("chk_rescue_transport");
    expect(checkpoints[1].checkpoint_id).toBe("chk_receiving_acceptance");
    expect(checkpoints[1].is_context_injected).toBe(true);
    expect(checkpoints[1].injected_by_memory_id).toBe("mem_vet_handoff_8912");
    expect(checkpoints[1].current_status).toBe("RECOMMENDED");
  });

  it("detects incomplete handoff when rescue is completed but receiving provider acceptance is unverified", () => {
    const initialCheckpoints = engine.generateInitialCheckpoints("animal_welfare", mockAnimalHandoffLesson);

    const evalResult = engine.evaluateHandoff({
      caseReference: "CASE-ANIMAL-001",
      category: "animal_welfare",
      currentCycle: 1,
      completedInterventions: [
        {
          interventionId: "int_rescue_001",
          type: "animal_rescue_transport",
          providerName: "Paws Rescue Delhi",
          completedAt: "2026-10-31T21:45:00.000Z",
          notes: "Animal secured and brought to South Delhi vet facility",
        },
      ],
      existingCheckpoints: initialCheckpoints,
      contextLesson: mockAnimalHandoffLesson,
    });

    expect(evalResult.isIncompleteHandoff).toBe(true);
    expect(evalResult.canResolveCase).toBe(false);
    expect(evalResult.recommendation.suggested_action).toBe("ASSIGN_RECEIVING_PROVIDER");
    expect(evalResult.recommendation.unverified_checkpoints).toContain("Receiving Provider Acceptance");
    expect(evalResult.recommendation.historical_context_used?.memory_id).toBe("mem_vet_handoff_8912");

    const receivingChk = evalResult.updatedCheckpoints.find((c) => c.checkpoint_id === "chk_receiving_acceptance");
    expect(receivingChk?.current_status).toBe("AWAITING_PROVIDER_ACCEPTANCE");
  });

  it("human coordinator can verify checkpoint with substantive evidence notes", () => {
    const initialCheckpoints = engine.generateInitialCheckpoints("animal_welfare", mockAnimalHandoffLesson);
    const receivingChk = initialCheckpoints.find((c) => c.checkpoint_id === "chk_receiving_acceptance")!;

    const verifiedChk = engine.verifyCheckpoint(
      receivingChk,
      "coord_dr_sharma",
      "Confirmed bed admission at Holy Family Vet Clinic, Dr. Verma signed admission slip #4912"
    );

    expect(verifiedChk.current_status).toBe("VERIFIED_COMPLETE");
    expect(verifiedChk.verified_by_coordinator_id).toBe("coord_dr_sharma");
    expect(verifiedChk.evidence_of_completion).toContain("Holy Family Vet Clinic");
    expect(verifiedChk.verification_timestamp).toBeDefined();
  });

  it("rejects verification if human evidence notes are empty or trivial", () => {
    const initialCheckpoints = engine.generateInitialCheckpoints("animal_welfare", mockAnimalHandoffLesson);
    const receivingChk = initialCheckpoints.find((c) => c.checkpoint_id === "chk_receiving_acceptance")!;

    expect(() => engine.verifyCheckpoint(receivingChk, "coord_dr_sharma", "ok")).toThrow(
      /minimum 5 characters/
    );
  });

  it("permits case resolution only after all checkpoints are verified complete", () => {
    const initialCheckpoints = engine.generateInitialCheckpoints("animal_welfare", mockAnimalHandoffLesson);

    const verifiedCheckpoints = initialCheckpoints.map((chk) =>
      engine.verifyCheckpoint(chk, "coord_dr_sharma", "Verified all stage deliverables received and signed off.")
    );

    const evalResult = engine.evaluateHandoff({
      caseReference: "CASE-ANIMAL-001",
      category: "animal_welfare",
      currentCycle: 2,
      completedInterventions: [
        {
          interventionId: "int_rescue_001",
          type: "animal_rescue_transport",
          providerName: "Paws Rescue Delhi",
          completedAt: "2026-10-31T21:45:00.000Z",
        },
        {
          interventionId: "int_vet_002",
          type: "veterinary_treatment",
          providerName: "Holy Family Vet Clinic",
          completedAt: "2026-10-31T22:15:00.000Z",
        },
      ],
      existingCheckpoints: verifiedCheckpoints,
      contextLesson: mockAnimalHandoffLesson,
    });

    expect(evalResult.isIncompleteHandoff).toBe(false);
    expect(evalResult.canResolveCase).toBe(true);
    expect(evalResult.recommendation.suggested_action).toBe("RESOLVE_ASSISTANCE_JOURNEY");
    expect(evalResult.recommendation.is_terminal).toBe(true);
  });

  it("prevents infinite loops by escalating to coordinator when max cycles are reached", () => {
    const initialCheckpoints = engine.generateInitialCheckpoints("animal_welfare", mockAnimalHandoffLesson);

    const evalResult = engine.evaluateHandoff({
      caseReference: "CASE-ANIMAL-001",
      category: "animal_welfare",
      currentCycle: 3, // Max reached
      completedInterventions: [],
      existingCheckpoints: initialCheckpoints,
      contextLesson: mockAnimalHandoffLesson,
      maxCycles: 3,
    });

    expect(evalResult.recommendation.suggested_action).toBe("ESCALATE_TO_COORDINATOR");
    expect(evalResult.recommendation.is_terminal).toBe(true);
    expect(evalResult.canResolveCase).toBe(false);
  });
});
