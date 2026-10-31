import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories";
import { InMemoryNGORepository } from "@/features/ngos/repositories";
import { InMemoryCaseRepository } from "@/features/cases/repositories";
import { seedDemoNGOs } from "@/features/ngos/services/seed.service";
import { CaseService } from "@/features/cases/services/case.service";
import { ResponderService } from "@/features/cases/services/responder.service";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { HandoffIntelligenceEngine } from "@/features/context-learning/services/handoff-engine.service";
import { IncidentDocument } from "@/features/incidents/types";
import { HistoricalLesson } from "@/features/context-learning/types";

describe("Workstream G: Complete End-to-End Citizen-to-Resolution Journey", () => {
  let incidentRepo: InMemoryIncidentRepository;
  let ngoRepo: InMemoryNGORepository;
  let caseRepo: InMemoryCaseRepository;
  let caseService: CaseService;
  let responderService: ResponderService;
  let matchingService: ExplainableMatchingService;
  let handoffEngine: HandoffIntelligenceEngine;

  beforeEach(async () => {
    incidentRepo = new InMemoryIncidentRepository();
    ngoRepo = new InMemoryNGORepository();
    caseRepo = new InMemoryCaseRepository();

    await seedDemoNGOs(ngoRepo);

    caseService = new CaseService({ caseRepo, incidentRepo, ngoRepo });
    responderService = new ResponderService({ caseRepo, incidentRepo });
    matchingService = new ExplainableMatchingService(ngoRepo, incidentRepo);
    handoffEngine = new HandoffIntelligenceEngine();
  });

  it("executes the full assistance lifecycle from citizen report to verified resolution", async () => {
    // -------------------------------------------------------------------------
    // Step 1: Citizen submits an urgent distress report
    // -------------------------------------------------------------------------
    const now = new Date().toISOString();
    const citizenIncident: IncidentDocument = {
      _id: "inc_journey_001",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "web_citizen_e2e_001",
      source_url: null,
      reported_at: now,
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Severe road accident in Rohini. Stray dog with fractured hind leg.",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Rohini Sector 14, Delhi",
        district: "North West Delhi",
        confidence: 0.95,
        geo: {
          type: "Point",
          coordinates: [77.1025, 28.7041],
        },
      },
      severity: { level: "critical", confidence: 0.9, reasoning: ["Compound leg fracture"] },
      freshness: "current_confirmed_by_source",
      missing_information: [],
      requires_human_review: false,
      status: "APPROVED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-E2E-001",
      tracking_token_hash: "hash_trk_e2e_secret_token_123",
      created_at: now,
      updated_at: now,
    };

    await incidentRepo.create(citizenIncident);

    // -------------------------------------------------------------------------
    // Step 2: Coordinator reviews incident and creates operational case
    // -------------------------------------------------------------------------
    const caseResult = await caseService.createCaseFromApprovedIncident(
      {
        incident_public_reference: "UMD-E2E-001",
        assistance_requirements: ["emergency_transport", "wound_stabilization"],
        max_matching_cycles: 3,
        coordinator_notes: "High priority animal trauma dispatch.",
      },
      "coord_sharma"
    );

    expect(caseResult.is_new).toBe(true);
    expect(caseResult.case.public_case_reference).toBeDefined();
    const caseRef = caseResult.case.public_case_reference;
    expect(caseResult.case.case_status).toBe("APPROVED");

    // -------------------------------------------------------------------------
    // Step 3: NGO matching evaluates candidate responders explainably
    // -------------------------------------------------------------------------
    const matchResult = await matchingService.matchIncident("UMD-E2E-001");
    expect(matchResult.eligible_candidates_count).toBeGreaterThan(0);
    const topCandidate = matchResult.candidates.find((c) => c.eligible);
    expect(topCandidate).toBeDefined();
    const assignedOrgId = topCandidate!.ngo_id;

    // -------------------------------------------------------------------------
    // Step 4: Coordinator assigns primary NGO to emergency transport
    // -------------------------------------------------------------------------
    const updatedCase = await caseService.assignOrganisations(
      caseRef,
      {
        assignments: [
          {
            organisation_id: assignedOrgId,
            requirement: "emergency_transport",
            response_deadline_hours: 2,
          },
        ],
      },
      "coord_sharma"
    );

    expect(updatedCase.assignments).toHaveLength(1);
    const assignmentId = updatedCase.assignments[0].assignment_id;
    expect(updatedCase.assignments[0].status).toBe("CONTACTED");

    // -------------------------------------------------------------------------
    // Step 5: NGO Responder accepts assignment, marks arrived, records intervention
    // -------------------------------------------------------------------------
    const responderActor = {
      ngoId: assignedOrgId,
      responderId: "responder_ravi",
    };

    await responderService.acceptAssignment(assignmentId, {
      ...responderActor,
      notes: "Ambulance dispatched",
    });

    await responderService.confirmArrival(assignmentId, responderActor);

    const resultAfterIntervention = await responderService.recordIntervention(
      assignmentId,
      {
        intervention_type: "first_aid_provided",
        description: "Canine safely stabilized with field splint and transported toward shelter hospital.",
        assistance_provided: ["emergency_transport", "wound_stabilization"],
        evidence_references: [
          { type: "image", url: "https://example.org/evidence/dog_stabilized.jpg" },
        ],
        additional_needs: ["veterinary_surgery"],
      },
      responderActor
    );
    const caseAfterIntervention = resultAfterIntervention.case;

    expect(caseAfterIntervention.interventions).toHaveLength(1);
    expect(caseAfterIntervention.case_status).toBe("FOLLOW_UP_REQUIRED");

    // -------------------------------------------------------------------------
    // Step 6: Handoff Verification Checkpoint Inspection
    // -------------------------------------------------------------------------
    const mockLesson: HistoricalLesson = {
      lesson_id: "lsn_vet_01",
      category: "animal_welfare",
      lesson_text: "Rescue pickup alone does not ensure medical admission; verify receiving hospital acceptance.",
      applicability_condition: "category == animal_welfare",
    };

    const initialCheckpoints = handoffEngine.generateInitialCheckpoints("animal_welfare", mockLesson);
    expect(initialCheckpoints).toHaveLength(2); // Rescue + Receiving Acceptance

    // Mark primary rescue completed
    initialCheckpoints[0].current_status = "VERIFIED_COMPLETE";

    // Evaluate handoff status: receiving acceptance is still unverified!
    const evaluation = handoffEngine.evaluateHandoff({
      caseReference: caseRef,
      category: "animal_welfare",
      currentCycle: 1,
      completedInterventions: [
        {
          interventionId: caseAfterIntervention.interventions[0].intervention_id,
          type: "rescue_and_transport",
          providerName: topCandidate!.organisation_name,
          completedAt: now,
        },
      ],
      existingCheckpoints: initialCheckpoints,
      contextLesson: mockLesson,
    });

    expect(evaluation.isIncompleteHandoff).toBe(true);
    expect(evaluation.canResolveCase).toBe(false);

    // -------------------------------------------------------------------------
    // Step 7: Premature resolution attempt must be rejected
    // -------------------------------------------------------------------------
    // Coordinator cannot mark resolved without satisfying or overriding remaining needs
    await expect(
      caseService.resolveCase(
        caseRef,
        {
          decision: "RESOLVED",
          rationale: "Dog picked up.",
          evidence_urls: ["https://example.org/evidence/dog_stabilized.jpg"],
        },
        "coord_sharma"
      )
    ).rejects.toThrow(/unresolved assistance needs/i);

    // -------------------------------------------------------------------------
    // Step 8: Coordinator verifies receiving hospital handoff checkpoint
    // -------------------------------------------------------------------------
    const verifiedCheckpoint = handoffEngine.verifyCheckpoint(
      initialCheckpoints[1],
      "coord_sharma",
      "Confirmed admission at Sanjay Gandhi Animal Care Centre. Ward bed assigned, Dr. Verma on duty."
    );
    expect(verifiedCheckpoint.current_status).toBe("VERIFIED_COMPLETE");

    // Secondary evaluation after verification
    const postVerification = handoffEngine.evaluateHandoff({
      caseReference: caseRef,
      category: "animal_welfare",
      currentCycle: 1,
      completedInterventions: [
        {
          interventionId: caseAfterIntervention.interventions[0].intervention_id,
          type: "rescue_and_transport",
          providerName: topCandidate!.organisation_name,
          completedAt: now,
        },
      ],
      existingCheckpoints: [initialCheckpoints[0], verifiedCheckpoint],
      contextLesson: mockLesson,
    });

    expect(postVerification.canResolveCase).toBe(true);

    // -------------------------------------------------------------------------
    // Step 9: Coordinator formally resolves case with verified evidence
    // -------------------------------------------------------------------------
    const resolvedCase = await caseService.resolveCase(
      caseRef,
      {
        decision: "RESOLVED",
        rationale: "Field stabilization and hospital admission verified complete. Hospital admission confirmed by Dr. Verma at Sanjay Gandhi Animal Care Centre.",
        evidence_urls: ["https://example.org/evidence/dog_stabilized.jpg"],
        override_unresolved: true, // Coordinator override acknowledging transfer to clinical care
      },
      "coord_sharma"
    );

    expect(resolvedCase.case_status).toBe("RESOLVED");
    expect(resolvedCase.resolved_at).toBeDefined();
    expect(resolvedCase.resolution_decision?.decision).toBe("RESOLVED");
  });
});
