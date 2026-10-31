import { describe, it, expect } from "vitest";
import { runA1Experiment } from "../a1-runner";
import { A1_APPROVED_LESSON } from "../synthetic-cases";

describe("Phase 6.2 Workstream C: A1 Controlled Meko ON/OFF Experiment", () => {
  it("executes repeatable A1 experiment and demonstrates genuine difference from retrieved memory", async () => {
    const result = await runA1Experiment();

    // 1. Integrity Verification
    expect(result.varianceAnalysis.integrityVerified).toBe(true);
    expect(result.controlRun.initialRequirements).toEqual(result.treatmentRun.initialRequirements);

    // 2. Control Run (OFF)
    expect(result.controlRun.mekoEnabled).toBe(false);
    expect(result.controlRun.recalledMemoryCitations).toHaveLength(0);
    expect(result.controlRun.groundedRequirements).toEqual(["field_ambulance", "fracture_stabilization"]);
    expect(result.controlRun.trace).toBeNull();

    // 3. Treatment Run (ON)
    expect(result.treatmentRun.mekoEnabled).toBe(true);
    expect(result.treatmentRun.recalledMemoryCitations).toHaveLength(1);
    expect(result.treatmentRun.recalledMemoryCitations[0].memory_id).toBe(A1_APPROVED_LESSON.memory_id);
    expect(result.treatmentRun.groundedRequirements).toContain("veterinary_care");

    // 4. Variance Attribution
    expect(result.varianceAnalysis.differenceDetected).toBe(true);
    expect(result.varianceAnalysis.requirementsDifference).toEqual(["veterinary_care"]);
    expect(result.varianceAnalysis.memoryAttribution).not.toBeNull();
    expect(result.varianceAnalysis.memoryAttribution?.memoryId).toBe(A1_APPROVED_LESSON.memory_id);
    expect(result.varianceAnalysis.clinicalImpactSummary).toContain("veterinary surgical admission");

    // 5. Audit Trace
    expect(result.treatmentRun.trace).not.toBeNull();
    expect(result.treatmentRun.trace?.agent_id).toBe("umeed_matching_agent");
    expect(result.treatmentRun.trace?.recalled_memory_id).toBe(A1_APPROVED_LESSON.memory_id);
  });
});
