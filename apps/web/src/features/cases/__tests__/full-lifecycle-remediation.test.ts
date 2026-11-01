import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "@/features/incidents/services/incident.service";
import { InMemoryIncidentRepository } from "@/features/incidents/repositories";
import { InMemoryNGORepository } from "@/features/ngos/repositories";
import { InMemoryCaseRepository } from "@/features/cases/repositories";
import { seedDemoNGOs } from "@/features/ngos/services/seed.service";
import { CaseService } from "@/features/cases/services/case.service";
import { ResponderService } from "@/features/cases/services/responder.service";
import { ExplainableMatchingService } from "@/features/matching/services/matching.service";
import { GeminiTriageService } from "@/lib/ai/gemini/triage.service";
import {
  OutreachService,
  CaseLifecycleService,
  AssistanceMetricsService,
  InMemoryServiceLocationRepository,
  InMemoryOrganizationRepository,
  InMemoryAssistanceRequirementRepository,
  InMemoryOutreachAttemptRepository,
  InMemoryEngineAssignmentRepository,
  InMemoryNotificationOutboxRepository,
  InMemoryEngineCaseEventRepository,
  seedEngineFixtures,
} from "@/features/assistance-engine";
import { GeospatialDiscoveryService } from "@/features/assistance-engine/services/geospatial-discovery.service";
import { NotificationOutboxService } from "@/features/assistance-engine/services/notification-outbox.service";

describe("Phase 9 & 10 Remediation: 15-Step Full Lifecycle Integration Verification", () => {
  let incidentRepo: InMemoryIncidentRepository;
  let ngoRepo: InMemoryNGORepository;
  let caseRepo: InMemoryCaseRepository;

  let incidentService: IncidentService;
  let caseService: CaseService;
  let responderService: ResponderService;
  let matchingService: ExplainableMatchingService;
  let triageService: GeminiTriageService;

  // Engine repositories
  let locRepo: InMemoryServiceLocationRepository;
  let orgRepo: InMemoryOrganizationRepository;
  let reqRepo: InMemoryAssistanceRequirementRepository;
  let attemptRepo: InMemoryOutreachAttemptRepository;
  let asgnRepo: InMemoryEngineAssignmentRepository;
  let outboxRepo: InMemoryNotificationOutboxRepository;
  let eventRepo: InMemoryEngineCaseEventRepository;

  let outreachService: OutreachService;
  let lifecycleService: CaseLifecycleService;
  let metricsService: AssistanceMetricsService;

  beforeEach(async () => {
    incidentRepo = new InMemoryIncidentRepository();
    ngoRepo = new InMemoryNGORepository();
    caseRepo = new InMemoryCaseRepository();

    await seedDemoNGOs(ngoRepo);

    incidentService = new IncidentService(incidentRepo);
    caseService = new CaseService({ caseRepo, incidentRepo, ngoRepo });
    responderService = new ResponderService({ caseRepo, incidentRepo });
    matchingService = new ExplainableMatchingService(ngoRepo, incidentRepo);
    triageService = new GeminiTriageService();

    locRepo = new InMemoryServiceLocationRepository();
    orgRepo = new InMemoryOrganizationRepository();
    reqRepo = new InMemoryAssistanceRequirementRepository();
    attemptRepo = new InMemoryOutreachAttemptRepository();
    asgnRepo = new InMemoryEngineAssignmentRepository();
    outboxRepo = new InMemoryNotificationOutboxRepository();
    eventRepo = new InMemoryEngineCaseEventRepository();

    await seedEngineFixtures(orgRepo, locRepo);

    const discoveryService = new GeospatialDiscoveryService({
      serviceLocationRepo: locRepo,
      organizationRepo: orgRepo,
      outreachAttemptRepo: attemptRepo,
      assignmentRepo: asgnRepo,
    });

    const outboxService = new NotificationOutboxService({ outboxRepo });

    outreachService = new OutreachService({
      reqRepo,
      attemptRepo,
      assignmentRepo: asgnRepo,
      eventRepo,
      orgRepo,
      discoveryService,
      outboxService,
    });

    lifecycleService = new CaseLifecycleService({
      reqRepo,
      assignmentRepo: asgnRepo,
      eventRepo,
      caseRepo,
    });

    metricsService = new AssistanceMetricsService({
      reqRepo,
      attemptRepo,
      assignmentRepo: asgnRepo,
      eventRepo,
      orgRepo,
    });
  });

  it("successfully passes all 15 lifecycle gates from citizen intake to verified resolution", async () => {
    // -------------------------------------------------------------------------
    // Gate 1: Submit a citizen report
    // -------------------------------------------------------------------------
    const ingestResult = await incidentService.ingestIncident({
      source_type: "citizen_report",
      source_reference: "intake_e2e_remediation_001",
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      location: {
        address: "District Centre, Pitampura, Delhi",
        district: "North West Delhi",
        latitude: 28.6972,
        longitude: 77.135,
      },
      description: "Injured canine with deep paw laceration and dehydration.",
    });

    expect(ingestResult.incident.status).toBe("REPORTED");
    expect(ingestResult.public_reference).toMatch(/^UMD-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(ingestResult.tracking_token).toBeDefined();

    // -------------------------------------------------------------------------
    // Gate 2: Retrieve the report securely
    // -------------------------------------------------------------------------
    const retrievedIncident = await incidentRepo.findByPublicReference(
      ingestResult.public_reference
    );
    expect(retrievedIncident).toBeDefined();
    expect(retrievedIncident?.incident_type).toBe("injured_animal");
    expect(retrievedIncident?.status).toBe("REPORTED");

    // -------------------------------------------------------------------------
    // Gate 3: Run AI triage or manual fallback
    // -------------------------------------------------------------------------
    const triageResult = await incidentService.triageIncident(
      ingestResult.public_reference,
      {
        apiKey: "", // test environment uses safe unconfigured fallback
      }
    );

    expect(triageResult).toBeDefined();
    expect(triageResult.triage_classification).toBe("MANUAL_FALLBACK");
    expect(triageResult.confidence).toBe(0.0); // Never display fabricated confidence

    // -------------------------------------------------------------------------
    // Gate 4: Verify human approval is required
    // -------------------------------------------------------------------------
    expect(triageResult.urgency.requires_human_review).toBe(true);
    expect(triageResult.human_review_status).toBe("PENDING");

    // Invariant: Unapproved incident CANNOT be converted into a case
    await expect(
      caseService.createCaseFromApprovedIncident(
        {
          incident_public_reference: ingestResult.public_reference,
          assistance_requirements: ["veterinary_first_aid"],
        },
        "coordinator_ananya"
      )
    ).rejects.toThrow(/Only verified and APPROVED incidents/i);

    // -------------------------------------------------------------------------
    // Gate 5: Coordinator approves the incident
    // -------------------------------------------------------------------------
    const reviewedIncident = await incidentService.recordReviewDecision(
      ingestResult.public_reference,
      "coordinator_ananya",
      {
        decision: "CONFIRM",
        reason: "Visual and location confirmation verified by phone check.",
      }
    );

    expect(reviewedIncident.status).toBe("APPROVED");
    expect(reviewedIncident.triage_analysis?.human_review_status).toBe("CONFIRMED");

    // -------------------------------------------------------------------------
    // Gate 6: Convert approved incident into a canonical case
    // -------------------------------------------------------------------------
    const caseResult = await caseService.createCaseFromApprovedIncident(
      {
        incident_public_reference: ingestResult.public_reference,
        assistance_requirements: ["veterinary_first_aid"],
        coordinator_notes: "Dispatched for urgent canine wound dressing.",
      },
      "coordinator_ananya"
    );

    expect(caseResult.is_new).toBe(true);
    expect(caseResult.case.case_status).toBe("APPROVED");
    const publicCaseRef = caseResult.case.public_case_reference;

    // -------------------------------------------------------------------------
    // Gate 7: Match eligible NGOs explainably
    // -------------------------------------------------------------------------
    const matchOutcome = await matchingService.matchIncident(
      ingestResult.public_reference
    );
    expect(matchOutcome.eligible_candidates_count).toBeGreaterThan(0);
    const primaryNgo = matchOutcome.candidates.find((c) => c.eligible)!;
    expect(primaryNgo).toBeDefined();
    expect(primaryNgo.explanation).toBeDefined();

    // -------------------------------------------------------------------------
    // Gate 8: Initiate outreach wave
    // -------------------------------------------------------------------------
    const requirement = await reqRepo.create({
      requirementId: `req_${publicCaseRef}_01`,
      caseId: caseResult.case.case_id,
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "high",
      description: "Emergency animal medical stabilization",
      location: {
        latitude: 28.6972,
        longitude: 77.135,
        district: "North West Delhi",
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      lastMeaningfulActivityAt: new Date().toISOString(),
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const wave = await outreachService.initiateFirstWave(requirement.requirementId);
    expect(wave.attempts.length).toBeGreaterThan(0);
    const chosenAttempt = wave.attempts[0];

    // -------------------------------------------------------------------------
    // Gate 9: Accept an NGO offer
    // -------------------------------------------------------------------------
    const acceptedOutcome = await outreachService.recordAcceptance(
      chosenAttempt.attemptId,
      chosenAttempt.providerId
    );

    expect(acceptedOutcome.assignment.status).toBe("ACCEPTED");
    expect(acceptedOutcome.attempt.status).toBe("ACCEPTED");

    // -------------------------------------------------------------------------
    // Gate 10: Verify competing offers are superseded
    // -------------------------------------------------------------------------
    const allAttempts = await attemptRepo.findByRequirementId(requirement.requirementId);
    for (const att of allAttempts) {
      if (att.attemptId !== chosenAttempt.attemptId) {
        expect(att.status).toBe("SUPERSEDED");
      }
    }

    // Concurrent acceptance guard: Second provider cannot accept same requirement
    if (allAttempts.length > 1) {
      const competing = allAttempts.find((a) => a.attemptId !== chosenAttempt.attemptId)!;
      await expect(
        outreachService.recordAcceptance(competing.attemptId, competing.providerId)
      ).rejects.toThrow();
    }

    // -------------------------------------------------------------------------
    // Gate 11: Update responder status (ACCEPTED -> WORK_STARTED -> IN_PROGRESS)
    // -------------------------------------------------------------------------
    const started = await lifecycleService.startWork(
      acceptedOutcome.assignment.assignmentId,
      chosenAttempt.providerId
    );
    expect(started.status).toBe("WORK_STARTED");

    const inProgress = await lifecycleService.recordProgress(
      acceptedOutcome.assignment.assignmentId,
      "Vehicle arrived on scene, field dressings applied, canine resting comfortably.",
      chosenAttempt.providerId
    );
    expect(inProgress.status).toBe("IN_PROGRESS");

    // -------------------------------------------------------------------------
    // Gate 12: Resolve the requirement and case
    // -------------------------------------------------------------------------
    const resolvedResult = await lifecycleService.resolveRequirement(
      requirement.requirementId,
      {
        outcomeStatus: "SUCCESSFUL",
        notes: "Antiseptic dressing and pain relief administered successfully.",
        evidenceUrls: ["https://evidence.umeed.org/dog_treated.jpg"],
      },
      "coordinator_ananya"
    );

    expect(resolvedResult.requirement.status).toBe("RESOLVED");
    expect(resolvedResult.assignment?.status).toBe("RESOLVED");

    // Stale modification guard: Cannot record progress after resolution
    await expect(
      lifecycleService.recordProgress(
        acceptedOutcome.assignment.assignmentId,
        "Attempt late update",
        chosenAttempt.providerId
      )
    ).rejects.toThrow(/Cannot record progress on assignment/i);

    // -------------------------------------------------------------------------
    // Gate 13: Verify audit history
    // -------------------------------------------------------------------------
    const events = await eventRepo.findByCaseId(caseResult.case.case_id);
    expect(events.length).toBeGreaterThan(0);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain("OUTREACH_WAVE_INITIATED");
    expect(eventTypes).toContain("WORK_STARTED");
    expect(eventTypes).toContain("PROGRESS_RECORDED");
    expect(eventTypes).toContain("REQUIREMENT_RESOLVED");

    // -------------------------------------------------------------------------
    // Gate 14: Verify analytics
    // -------------------------------------------------------------------------
    const metrics = await metricsService.getEngineMetrics();
    expect(metrics.totalRequirements).toBeGreaterThan(0);
    expect(metrics.resolvedRequirements).toBeGreaterThan(0);
    expect(metrics.verifiedResolutionRate).toBe(100);

    // -------------------------------------------------------------------------
    // Gate 15: Verify persistence integrity
    // -------------------------------------------------------------------------
    const persistedReq = await reqRepo.findById(requirement.requirementId);
    expect(persistedReq).toBeDefined();
    expect(persistedReq?.status).toBe("RESOLVED");
  });
});
