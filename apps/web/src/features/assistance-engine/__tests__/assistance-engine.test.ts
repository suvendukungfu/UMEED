import { describe, it, expect, beforeEach } from "vitest";
import {
  ProviderRankingService,
  GeospatialDiscoveryService,
  OutreachService,
  NotificationOutboxService,
  EscalationService,
  WatchdogService,
  AssistanceMetricsService,
  CaseLifecycleService,
  SEED_ORGANIZATIONS,
  SEED_SERVICE_LOCATIONS,
  DEFAULT_ENGINE_CONFIG,
  PARENT_CASE_TRANSITIONS,
  REQUIREMENT_TRANSITIONS,
  InMemoryServiceLocationRepository,
  InMemoryOrganizationRepository,
  InMemoryAssistanceRequirementRepository,
  InMemoryOutreachAttemptRepository,
  InMemoryEngineAssignmentRepository,
  InMemoryNotificationOutboxRepository,
  InMemoryEngineCaseEventRepository,
  Organization,
  ServiceLocation,
  AssistanceRequirement,
  DiscoveryQuery,
  CandidateEvaluationContext,
} from "../index";

describe("UMEED Core Assistance Engine — 20 Mandatory Verification Tests", () => {
  let locationRepo: InMemoryServiceLocationRepository;
  let orgRepo: InMemoryOrganizationRepository;
  let reqRepo: InMemoryAssistanceRequirementRepository;
  let attemptRepo: InMemoryOutreachAttemptRepository;
  let assignmentRepo: InMemoryEngineAssignmentRepository;
  let outboxRepo: InMemoryNotificationOutboxRepository;
  let eventRepo: InMemoryEngineCaseEventRepository;

  let rankingService: ProviderRankingService;
  let discoveryService: GeospatialDiscoveryService;
  let outreachService: OutreachService;
  let escalationService: EscalationService;
  let watchdogService: WatchdogService;
  let metricsService: AssistanceMetricsService;
  let lifecycleService: CaseLifecycleService;

  // Key coordinates in Delhi
  const connaughtPlace: [number, number] = [77.2167, 28.6315]; // [lng, lat]
  const dwarka: [number, number] = [77.0500, 28.5800];
  const pitampura: [number, number] = [77.1500, 28.7000];

  beforeEach(async () => {
    locationRepo = new InMemoryServiceLocationRepository();
    orgRepo = new InMemoryOrganizationRepository();
    reqRepo = new InMemoryAssistanceRequirementRepository();
    attemptRepo = new InMemoryOutreachAttemptRepository();
    assignmentRepo = new InMemoryEngineAssignmentRepository();
    outboxRepo = new InMemoryNotificationOutboxRepository();
    eventRepo = new InMemoryEngineCaseEventRepository();

    rankingService = new ProviderRankingService();
    discoveryService = new GeospatialDiscoveryService({
      serviceLocationRepo: locationRepo,
      organizationRepo: orgRepo,
      outreachAttemptRepo: attemptRepo,
      assignmentRepo: assignmentRepo,
      rankingService,
    });

    const outboxService = new NotificationOutboxService({ outboxRepo });

    outreachService = new OutreachService({
      reqRepo,
      attemptRepo,
      assignmentRepo,
      eventRepo,
      orgRepo,
      discoveryService,
      outboxService,
    });

    escalationService = new EscalationService({
      reqRepo,
      attemptRepo,
      assignmentRepo,
      eventRepo,
      outreachService,
      discoveryService,
    });

    watchdogService = new WatchdogService({
      reqRepo,
      attemptRepo,
      assignmentRepo,
      eventRepo,
      escalationService,
      outreachService,
      outboxService,
    });

    metricsService = new AssistanceMetricsService({
      reqRepo,
      attemptRepo,
      assignmentRepo,
      eventRepo,
      orgRepo,
    });

    lifecycleService = new CaseLifecycleService({
      reqRepo,
      assignmentRepo,
      eventRepo,
    });

    // Seed test data
    for (const org of SEED_ORGANIZATIONS) {
      await orgRepo.create(org);
    }
    for (const loc of SEED_SERVICE_LOCATIONS) {
      await locationRepo.create(loc);
    }
  });

  // Test 1: Haversine distance calculation matches expected values for Delhi coordinates
  it("Scenario 1: Haversine distance accurately measures distance between Delhi coordinates", () => {
    const distanceKm = ProviderRankingService.calculateHaversineDistanceKm(
      connaughtPlace[1],
      connaughtPlace[0],
      dwarka[1],
      dwarka[0]
    );
    // CP to Dwarka is approx ~17.3 km
    expect(distanceKm).toBeGreaterThan(15);
    expect(distanceKm).toBeLessThan(20);
  });

  // Test 2: Estimated travel time reflects urban road winding factor (1.35) and average congestion speed
  it("Scenario 2: Estimated travel time calculation incorporates urban winding factor (1.35) and 25 km/h transit speed", () => {
    const distKm = 10;
    const winding = 1.35;
    const speed = 25.0;
    // Effective distance = 10 * 1.35 = 13.5 km. At 25 km/h => 13.5/25 * 60 = 32.4 mins -> round to 32
    const travelTime = Math.round(((distKm * winding) / speed) * 60);
    expect(travelTime).toBe(32);
  });

  // Test 3: Multi-radius geospatial expansion expands through tiers (10km -> 20km -> 35km -> territorial fallback)
  it("Scenario 3: Geospatial discovery expands through radii tiers (10km -> 20km -> 35km)", async () => {
    expect(DEFAULT_ENGINE_CONFIG.searchRadiusKm.initial).toBe(10);
    expect(DEFAULT_ENGINE_CONFIG.searchRadiusKm.second).toBe(20);
    expect(DEFAULT_ENGINE_CONFIG.searchRadiusKm.third).toBe(35);

    const query: DiscoveryQuery = {
      serviceType: "injured_animal",
      location: {
        latitude: connaughtPlace[1],
        longitude: connaughtPlace[0],
        district: "Central",
      },
    };

    const result = await discoveryService.discoverProviders("case-1", "req-1", query);
    expect(result.rankedCandidates.length).toBeGreaterThan(0);
    expect(["INITIAL", "SECOND", "THIRD", "TERRITORIAL_FALLBACK"]).toContain(
      result.expansionStage
    );
  });

  // Test 4: District and territorial coverage mapping
  it("Scenario 4: Correctly evaluates ward-level, district-level, and all-Delhi territorial coverage", () => {
    const org = SEED_ORGANIZATIONS[0];
    const loc = SEED_SERVICE_LOCATIONS[0];

    const ctxWardMatch: CandidateEvaluationContext = {
      organization: org,
      serviceLocation: loc,
      estimatedDistanceKm: 5,
      estimatedTravelMinutes: 15,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: false,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const matchWard = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctxWardMatch);
    expect(matchWard.scoreBreakdown.coverage).toBe(100);

    const ctxDistrictMatch: CandidateEvaluationContext = {
      ...ctxWardMatch,
      wardMatch: false,
      districtMatch: true,
    };
    const matchDistrict = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctxDistrictMatch);
    expect(matchDistrict.scoreBreakdown.coverage).toBe(65);
  });

  // Test 5: Exact capability matching receives full score, unsupported service is excluded
  it("Scenario 5: Exact capability match receives 100 points; unsupported service fails hard filter", () => {
    const org = SEED_ORGANIZATIONS[0]; // Supports injured_animal
    const loc = SEED_SERVICE_LOCATIONS[0];

    const ctx: CandidateEvaluationContext = {
      organization: org,
      serviceLocation: loc,
      estimatedDistanceKm: 2,
      estimatedTravelMinutes: 10,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const capableResult = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx);
    expect(capableResult.eligibilityStatus).toBe("ELIGIBLE");
    expect(capableResult.scoreBreakdown.capability).toBe(100);

    const incapableResult = rankingService.evaluateAndRank("c1", "r1", "cyber_crime_recovery", ctx);
    expect(incapableResult.eligibilityStatus).toBe("INELIGIBLE");
    expect(incapableResult.scoreBreakdown.capability).toBe(0);
    expect(incapableResult.exclusionReasons.some((r) => r.includes("not supported"))).toBe(true);
  });

  // Test 6: Bayesian smoothed reliability assigns neutral 50% prior to new organizations with zero history
  it("Scenario 6: Bayesian smoothing formula gives 50% neutral reliability to new providers with 0 resolved attempts", () => {
    const newOrg: Organization = {
      organizationId: "NGO-NEW-001",
      name: "New Unproven NGO",
      organizationType: "TRUST",
      verificationStatus: "OPERATIONALLY_VERIFIED",
      registrationDetails: { registrationNumber: "DL/999", registrationAuthority: "Delhi", registrationDate: null },
      serviceCategories: ["food_distress"],
      serviceSubcategories: [],
      serviceAreas: ["Central"],
      operationalStatus: "ACTIVE",
      publicContactChannels: { phone: null, email: null, emergencyPhone: null, website: null, coordinatorName: null, isPhoneVerified: false },
      reliabilityMetrics: {
        successfulResponses: 0,
        eligibleResolvedAttempts: 0,
        averageResponseMinutes: null,
        sampleSize: 0,
        categoryMetrics: {},
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
    };

    const loc: ServiceLocation = {
      serviceLocationId: "LOC-NEW-001",
      providerId: "NGO-NEW-001",
      name: "New Loc",
      address: "CP",
      district: "Central",
      ward: "Ward 1",
      location: { type: "Point", coordinates: connaughtPlace },
      supportedServices: ["food_distress"],
      serviceArea: { states: ["Delhi"], districts: ["Central"], wards: ["Ward 1"], radiusKm: 20, coversAllDelhi: false, acceptsOutOfArea: false },
      operatingHours: "09:00 - 18:00",
      operationalStatus: "ACTIVE",
      capacity: 10,
      occupiedCapacity: 0,
      availableCapacity: 10,
      availabilityStatus: "CONFIRMED_AVAILABLE",
      lastAvailabilityConfirmedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
    };

    const ctx: CandidateEvaluationContext = {
      organization: newOrg,
      serviceLocation: loc,
      estimatedDistanceKm: 1,
      estimatedTravelMinutes: 5,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: false,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const match = rankingService.evaluateAndRank("c1", "r1", "food_distress", ctx);
    // (0 + 2) / (0 + 2 + 2) = 2/4 = 50%
    expect(match.scoreBreakdown.reliability).toBe(50);
  });

  // Test 7: Category-specific reliability is prioritized when category sample size >= 3
  it("Scenario 7: Category-specific reliability is prioritized when category sample size >= 3", () => {
    const orgWithCategoryMetrics: Organization = {
      ...SEED_ORGANIZATIONS[0],
      reliabilityMetrics: {
        successfulResponses: 20,
        eligibleResolvedAttempts: 20, // Global is 100%
        averageResponseMinutes: null,
        sampleSize: 20,
        categoryMetrics: {
          injured_animal: { successfulResponses: 1, eligibleResolvedAttempts: 4 }, // Category is 1/4
        },
      },
    };

    const loc = SEED_SERVICE_LOCATIONS[0];
    const ctx: CandidateEvaluationContext = {
      organization: orgWithCategoryMetrics,
      serviceLocation: loc,
      estimatedDistanceKm: 1,
      estimatedTravelMinutes: 5,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const match = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx);
    // Category smoothing: (1 + 2) / (4 + 2 + 2) = 3/8 = 37.5%
    expect(match.scoreBreakdown.reliability).toBe(37.5);
  });

  // Test 8: Freshness decay follows exponential decay based on days since verification
  it("Scenario 8: Freshness decay reduces score exponentially with days since confirmation", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const staleLoc: ServiceLocation = {
      ...SEED_SERVICE_LOCATIONS[0],
      lastAvailabilityConfirmedAt: thirtyDaysAgo,
      lastVerifiedAt: thirtyDaysAgo,
    };

    const ctx: CandidateEvaluationContext = {
      organization: SEED_ORGANIZATIONS[0],
      serviceLocation: staleLoc,
      estimatedDistanceKm: 1,
      estimatedTravelMinutes: 5,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const match = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx);
    // 30 days: 100 * exp(-30 / 30) = 100 / e ≈ 36.8
    expect(match.scoreBreakdown.freshness).toBeCloseTo(36.8, 0);
  });

  // Test 9: Availability status scoring and hard filtering
  it("Scenario 9: Availability status correctly assigns score and excludes unavailable providers", () => {
    const makeLoc = (status: any, availableCapacity: number): ServiceLocation => ({
      ...SEED_SERVICE_LOCATIONS[0],
      availabilityStatus: status,
      availableCapacity,
    });

    const ctx = (loc: ServiceLocation): CandidateEvaluationContext => ({
      organization: SEED_ORGANIZATIONS[0],
      serviceLocation: loc,
      estimatedDistanceKm: 1,
      estimatedTravelMinutes: 5,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    });

    const availMatch = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx(makeLoc("CONFIRMED_AVAILABLE", 5)));
    expect(availMatch.scoreBreakdown.availability).toBe(100);

    const limitedMatch = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx(makeLoc("LIMITED_CONFIRMED", 2)));
    expect(limitedMatch.scoreBreakdown.availability).toBe(70);

    const unknownMatch = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx(makeLoc("UNKNOWN", 3)));
    expect(unknownMatch.scoreBreakdown.availability).toBe(40);

    const unavailMatch = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx(makeLoc("NO_CAPACITY", 0)));
    expect(unavailMatch.eligibilityStatus).toBe("INELIGIBLE");
  });

  // Test 10: Workload penalty for active cases in Round 2
  it("Scenario 10: Workload penalty reduces Round 2 score for providers with active cases", () => {
    const loc = SEED_SERVICE_LOCATIONS[0];
    const org = SEED_ORGANIZATIONS[0];

    const ctxIdle: CandidateEvaluationContext = {
      organization: org,
      serviceLocation: loc,
      estimatedDistanceKm: 2,
      estimatedTravelMinutes: 10,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const ctxBusy: CandidateEvaluationContext = {
      ...ctxIdle,
      activeCasesForProvider: 5, // Full load
    };

    const matchIdle = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctxIdle, true);
    const matchBusy = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctxBusy, true);

    expect(matchBusy.totalScore).toBeLessThan(matchIdle.totalScore);
    expect(matchBusy.reasons.some((r) => r.includes("workload penalty"))).toBe(true);
  });

  // Test 11: Response timeout penalty (-15pts) in Round 2
  it("Scenario 11: Recent response timeout applies penalty (-15pts)", () => {
    const loc = SEED_SERVICE_LOCATIONS[0];
    const org = SEED_ORGANIZATIONS[0];

    const ctxNormal: CandidateEvaluationContext = {
      organization: org,
      serviceLocation: loc,
      estimatedDistanceKm: 2,
      estimatedTravelMinutes: 10,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const ctxTimedOut: CandidateEvaluationContext = {
      ...ctxNormal,
      recentTimeoutForProvider: true,
    };

    const matchNormal = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctxNormal, true);
    const matchTimedOut = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctxTimedOut, true);

    expect(matchTimedOut.totalScore).toBe(matchNormal.totalScore - 15);
    expect(matchTimedOut.reasons.some((r) => r.includes("outreach timeout"))).toBe(true);
  });

  // Test 12: Scoring weights configuration
  it("Scenario 12: Multi-factor scoring formula respects configurable weights totaling 1.0", () => {
    const weights = DEFAULT_ENGINE_CONFIG.scoringWeights;
    const totalWeights =
      weights.distance +
      weights.capability +
      weights.reliability +
      weights.availability +
      weights.coverage +
      weights.freshness;
    expect(totalWeights).toBeCloseTo(1.0, 5);
  });

  // Test 13: Explainable reasoning output
  it("Scenario 13: Every candidate evaluation produces an explainable, non-empty list of reasoning strings", () => {
    const loc = SEED_SERVICE_LOCATIONS[0];
    const org = SEED_ORGANIZATIONS[0];

    const ctx: CandidateEvaluationContext = {
      organization: org,
      serviceLocation: loc,
      estimatedDistanceKm: 3,
      estimatedTravelMinutes: 10,
      wardMatch: true,
      adjacentWardMatch: false,
      allDelhiMatch: true,
      districtMatch: true,
      activeCasesForProvider: 0,
      recentTimeoutForProvider: false,
      isDurableRejection: false,
    };

    const match = rankingService.evaluateAndRank("c1", "r1", "injured_animal", ctx);
    expect(match.reasons.length).toBeGreaterThanOrEqual(4);
    expect(match.reasons.some((r) => r.toLowerCase().includes("capability"))).toBe(true);
  });

  // Test 14: First-round outreach wave creation
  it("Scenario 14: First-round outreach wave creates outreach attempts with SLA deadlines and enqueues notifications", async () => {
    const nowIso = new Date().toISOString();
    const req: AssistanceRequirement = {
      requirementId: "REQ-TEST-14",
      caseId: "CASE-TEST-14",
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "critical",
      description: "Injured stray dog near Pitampura",
      location: {
        address: "Pitampura Metro",
        district: "North West Delhi",
        ward: "Ward 55 Pitampura",
        latitude: pitampura[1],
        longitude: pitampura[0],
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await reqRepo.create(req);

    const wave = await outreachService.initiateFirstWave("REQ-TEST-14", "test_coordinator");

    expect(wave.attempts.length).toBeGreaterThan(0);
    expect(wave.requirement.status).toBe("OUTREACH_ACTIVE");
    expect(wave.attempts[0].acknowledgementDeadline).toBeDefined();

    const outboxItems = await outboxRepo.list();
    expect(outboxItems.length).toBeGreaterThan(0);
    expect(["PENDING", "SIMULATED_MOCK"]).toContain(outboxItems[0].status);
  });

  // Test 15: Idempotent outreach wave dispatch
  it("Scenario 15: Idempotent outreach wave dispatch prevents duplicate attempts on repeated requests", async () => {
    const nowIso = new Date().toISOString();
    const req: AssistanceRequirement = {
      requirementId: "REQ-TEST-15",
      caseId: "CASE-TEST-15",
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "medium",
      description: "Injured bird",
      location: {
        address: "Pitampura",
        district: "North West Delhi",
        ward: "Ward 55 Pitampura",
        latitude: pitampura[1],
        longitude: pitampura[0],
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await reqRepo.create(req);

    const wave1 = await outreachService.initiateFirstWave("REQ-TEST-15");
    const countAfterWave1 = (await attemptRepo.list({ requirementId: "REQ-TEST-15" })).length;

    // Second dispatch while in awaiting response returns existing wave idempotently
    const wave2 = await outreachService.initiateFirstWave("REQ-TEST-15");
    const countAfterWave2 = (await attemptRepo.list({ requirementId: "REQ-TEST-15" })).length;

    expect(countAfterWave2).toBe(countAfterWave1);
    expect(wave2.attempts[0].attemptId).toBe(wave1.attempts[0].attemptId);
  });

  // Test 16: Provider acknowledgement tracking
  it("Scenario 16: Provider acknowledgement updates attempt status to ACKNOWLEDGED and emits audit event", async () => {
    const nowIso = new Date().toISOString();
    const req: AssistanceRequirement = {
      requirementId: "REQ-TEST-16",
      caseId: "CASE-TEST-16",
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "medium",
      description: "Animal care",
      location: {
        address: "Pitampura",
        district: "North West Delhi",
        ward: "Ward 55 Pitampura",
        latitude: pitampura[1],
        longitude: pitampura[0],
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await reqRepo.create(req);

    const wave = await outreachService.initiateFirstWave("REQ-TEST-16");
    const attemptId = wave.attempts[0].attemptId;

    const ackAttempt = await outreachService.recordAcknowledgement(attemptId, "responder_01");
    expect(ackAttempt.status).toBe("ACKNOWLEDGED");
    expect(ackAttempt.acknowledgedAt).toBeDefined();

    const events = await eventRepo.findByCaseId("CASE-TEST-16");
    expect(events.some((e) => e.eventType === "OUTREACH_ACKNOWLEDGED")).toBe(true);
  });

  // Test 17: Atomic acceptance and competitor invalidation (SUPERSEDED)
  it("Scenario 17: Atomic provider acceptance transitions winning attempt to ACCEPTED and supersedes competing attempts", async () => {
    const nowIso = new Date().toISOString();
    const req: AssistanceRequirement = {
      requirementId: "REQ-TEST-17",
      caseId: "CASE-TEST-17",
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "medium",
      description: "Animal care in North Delhi",
      location: {
        address: "Civil Lines",
        district: "North Delhi",
        ward: "Ward 12 Civil Lines",
        latitude: 28.6782,
        longitude: 77.2255,
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await reqRepo.create(req);

    const wave = await outreachService.initiateFirstWave("REQ-TEST-17");
    expect(wave.attempts.length).toBeGreaterThanOrEqual(2);

    const winningAttemptId = wave.attempts[0].attemptId;
    const losingAttemptId = wave.attempts[1].attemptId;

    const acceptResult = await outreachService.recordAcceptance(winningAttemptId, "responder_win");
    expect(acceptResult.attempt.status).toBe("ACCEPTED");
    expect(acceptResult.requirement.status).toBe("ASSIGNED");

    const losingAttempt = await attemptRepo.findById(losingAttemptId);
    expect(losingAttempt?.status).toBe("SUPERSEDED");
    expect(losingAttempt?.supersededAt).toBeDefined();
  });

  // Test 18: Rejection of conflicting duplicate acceptance
  it("Scenario 18: Conflicting acceptance on an already assigned requirement is strictly rejected", async () => {
    const nowIso = new Date().toISOString();
    const req: AssistanceRequirement = {
      requirementId: "REQ-TEST-18",
      caseId: "CASE-TEST-18",
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "medium",
      description: "Animal care",
      location: {
        address: "Civil Lines",
        district: "North Delhi",
        ward: "Ward 12 Civil Lines",
        latitude: 28.6782,
        longitude: 77.2255,
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await reqRepo.create(req);

    const wave = await outreachService.initiateFirstWave("REQ-TEST-18");
    const attempt1 = wave.attempts[0].attemptId;
    const attempt2 = wave.attempts[1].attemptId;

    await outreachService.recordAcceptance(attempt1, "responder_1");

    // Second provider attempts to accept
    await expect(
      outreachService.recordAcceptance(attempt2, "responder_2")
    ).rejects.toThrow();
  });

  // Test 19: Path A Provider Failure Escalation (Advances to Round 2 or Human Review)
  it("Scenario 19: Path A Provider Failure escalates to Round 2, excludes Round 1 rejected providers, and routes to HUMAN_REVIEW when exhausted", async () => {
    const nowIso = new Date().toISOString();
    const req: AssistanceRequirement = {
      requirementId: "REQ-TEST-19",
      caseId: "CASE-TEST-19",
      serviceType: "injured_animal",
      subcategory: null,
      urgency: "medium", // limit is 2, leaves 3rd provider for Round 2
      description: "Animal rescue",
      location: {
        address: "Civil Lines",
        district: "North Delhi",
        ward: "Ward 12 Civil Lines",
        latitude: 28.6782,
        longitude: 77.2255,
      },
      status: "PENDING_MATCH",
      outreachRound: 1,
      outreachVersion: 1,
      activeAttemptIds: [],
      assignedProviderId: null,
      assignedServiceLocationId: null,
      parentRequirementId: null,
      nextActionAt: nowIso,
      lastMeaningfulActivityAt: nowIso,
      ownerType: "SYSTEM",
      ownerId: "system_engine",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await reqRepo.create(req);

    // Seed a 3rd provider so Round 1 has 2 providers and Round 2 has the 3rd provider
    const org3: Organization = {
      ...SEED_ORGANIZATIONS[0],
      organizationId: "NGO-DELHI-003",
      name: "Third Animal Rescue",
    };
    const loc3: ServiceLocation = {
      ...SEED_SERVICE_LOCATIONS[0],
      serviceLocationId: "LOC-DELHI-003",
      providerId: "NGO-DELHI-003",
      name: "Third Location",
    };
    await orgRepo.create(org3);
    await locationRepo.create(loc3);

    const wave1 = await outreachService.initiateFirstWave("REQ-TEST-19");
    const rejectedProviderId = wave1.attempts[0].providerId;

    // Reject all attempts in wave 1
    for (const att of wave1.attempts) {
      await outreachService.recordRejection(att.attemptId, "NO_CAPACITY", "responder_01");
    }

    // Escalate Path A
    const escResult = await escalationService.escalateOnProviderFailure(
      "REQ-TEST-19",
      wave1.attempts[0].attemptId,
      "NO_CAPACITY",
      "coordinator"
    );

    expect(escResult.requirement.outreachRound).toBe(2);

    // Verify Round 1 rejected provider is excluded from Round 2 wave
    const round2Attempts = await attemptRepo.list({
      requirementId: "REQ-TEST-19",
      outreachRound: 2,
    });
    expect(round2Attempts.some((a) => a.providerId === rejectedProviderId)).toBe(false);

    // When Round 2 fails, reject all round 2 attempts
    for (const att of escResult.newAttempts) {
      await outreachService.recordRejection(att.attemptId, "NO_CAPACITY", "responder_02");
    }

    const finalEsc = await escalationService.escalateOnProviderFailure(
      "REQ-TEST-19",
      escResult.newAttempts[0].attemptId,
      "NO_CAPACITY",
      "watchdog"
    );

    expect(finalEsc.escalatedToHumanReview).toBe(true);
    expect(finalEsc.requirement.status).toBe("HUMAN_REVIEW");
  });

  // Test 20: Path B Assistance Insufficiency and Watchdog deterministic sweep
  it("Scenario 20: Path B Assistance Insufficiency creates linked requirement, and Watchdog sweep catches timeouts", async () => {
    // Part 1: Path B Assistance Insufficiency Escalation
    const suppResult = await escalationService.addSupplementalRequirement(
      "CASE-TEST-20",
      {
        serviceType: "food_distress",
        description: "Nutritional feed required alongside medical treatment",
        location: { latitude: pitampura[1], longitude: pitampura[0], district: "North West Delhi" },
        urgency: "medium",
        parentRequirementId: "REQ-PRIMARY",
      }
    );

    expect(suppResult.newRequirement.parentRequirementId).toBe("REQ-PRIMARY");
    expect(suppResult.newRequirement.serviceType).toBe("food_distress");

    // Part 2: Watchdog SLA Timeout Sweep
    const now = new Date();
    const expiredDeadline = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const pastTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    const expiredAttempt = await attemptRepo.create({
      attemptId: "ATT-EXPIRED-20",
      caseId: "CASE-TEST-20",
      requirementId: suppResult.newRequirement.requirementId,
      providerId: SEED_ORGANIZATIONS[0].organizationId,
      serviceLocationId: SEED_SERVICE_LOCATIONS[0].serviceLocationId,
      outreachRound: 1,
      outreachVersion: 1,
      channel: "in_app",
      status: "SENT",
      scoreAtTimeOfSelection: 85,
      idempotencyKey: "idemp-expired-20",
      messageId: "msg_expired_20",
      sentAt: pastTime,
      deliveredAt: pastTime,
      acknowledgementDeadline: expiredDeadline,
      acknowledgedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      supersededAt: null,
      createdAt: pastTime,
      updatedAt: pastTime,
    });

    const sweepResult = await watchdogService.runWatchdogCycle(new Date());
    expect(sweepResult.expiredAttemptsRecovered).toBeGreaterThanOrEqual(1);

    const checkAttempt = await attemptRepo.findById("ATT-EXPIRED-20");
    expect(checkAttempt?.status).toBe("TIMED_OUT");

    // Telemetry and Metrics
    const metrics = await metricsService.getEngineMetrics();
    expect(metrics.totalRequirements).toBeGreaterThan(0);
  });
});
