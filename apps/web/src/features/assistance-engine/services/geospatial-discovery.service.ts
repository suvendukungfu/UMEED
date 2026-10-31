import {
  IServiceLocationRepository,
  IOrganizationRepository,
  IOutreachAttemptRepository,
  IEngineAssignmentRepository,
  getServiceLocationRepository,
  getOrganizationRepository,
  getOutreachAttemptRepository,
  getEngineAssignmentRepository,
} from "../repositories";
import {
  EngineMatchResult,
  DiscoveryQuery,
  CandidateEvaluationContext,
  ServiceLocation,
  Organization,
} from "../types";
import { ProviderRankingService } from "./provider-ranking.service";
import { EngineConfig, getEngineConfig } from "../config";
import { logger } from "@/lib/logging";

export interface DiscoveryResult {
  query: DiscoveryQuery;
  searchRadiusKmUsed: number;
  expansionStage: "INITIAL" | "SECOND" | "THIRD" | "TERRITORIAL_FALLBACK";
  totalCandidatesEvaluated: number;
  eligibleCandidatesCount: number;
  rankedCandidates: EngineMatchResult[];
  explanation: string;
}

export class GeospatialDiscoveryService {
  private serviceLocationRepo: IServiceLocationRepository;
  private organizationRepo: IOrganizationRepository;
  private outreachAttemptRepo: IOutreachAttemptRepository;
  private assignmentRepo: IEngineAssignmentRepository;
  private rankingService: ProviderRankingService;
  private config: EngineConfig;

  constructor(options?: {
    serviceLocationRepo?: IServiceLocationRepository;
    organizationRepo?: IOrganizationRepository;
    outreachAttemptRepo?: IOutreachAttemptRepository;
    assignmentRepo?: IEngineAssignmentRepository;
    rankingService?: ProviderRankingService;
    config?: Partial<EngineConfig>;
  }) {
    this.serviceLocationRepo =
      options?.serviceLocationRepo || getServiceLocationRepository();
    this.organizationRepo =
      options?.organizationRepo || getOrganizationRepository();
    this.outreachAttemptRepo =
      options?.outreachAttemptRepo || getOutreachAttemptRepository();
    this.assignmentRepo =
      options?.assignmentRepo || getEngineAssignmentRepository();
    this.config = getEngineConfig(options?.config);
    this.rankingService =
      options?.rankingService || new ProviderRankingService(this.config);
  }

  /**
   * Discovers and ranks eligible service locations using multi-radius expansion.
   */
  async discoverProviders(
    caseId: string,
    requirementId: string,
    query: DiscoveryQuery,
    isRound2 = false
  ): Promise<DiscoveryResult> {
    const { longitude, latitude } = query.location;
    const targetDistrict = query.location.district?.trim().toLowerCase();
    const targetWard = query.location.ward?.trim().toLowerCase();

    const excludedIds = new Set(query.excludedProviderIds || []);

    // Step 1: Multi-Radius Geospatial Expansion
    const radiiKm = [
      this.config.searchRadiusKm.initial, // 10 km
      this.config.searchRadiusKm.second,  // 20 km
      this.config.searchRadiusKm.third,   // 35 km
    ];

    let candidateLocations: ServiceLocation[] = [];
    let radiusUsed = radiiKm[0];
    let expansionStage: DiscoveryResult["expansionStage"] = "INITIAL";

    // Stage B: Geospatial Search across expansion radii
    for (let i = 0; i < radiiKm.length; i++) {
      radiusUsed = radiiKm[i];
      const maxDistanceMeters = radiusUsed * 1000;

      const locations = await this.serviceLocationRepo.findNearby(
        longitude,
        latitude,
        maxDistanceMeters
      );

      // Check if we found at least 2 candidate locations supporting the service
      const matchingCount = locations.filter((loc) =>
        loc.supportedServices.includes(query.serviceType)
      ).length;

      candidateLocations = locations;

      if (i === 0) expansionStage = "INITIAL";
      else if (i === 1) expansionStage = "SECOND";
      else expansionStage = "THIRD";

      if (matchingCount >= 2) {
        break;
      }
    }

    // Final fallback: all verified providers explicitly covering the case location
    if (candidateLocations.length === 0) {
      expansionStage = "TERRITORIAL_FALLBACK";
      const allLocations = await this.serviceLocationRepo.list();
      candidateLocations = allLocations.filter((loc) => {
        if (targetDistrict && loc.district.toLowerCase() === targetDistrict) return true;
        if (loc.serviceArea.districts.some((d) => d.toLowerCase() === targetDistrict)) return true;
        if (loc.serviceArea.coversAllDelhi) return true;
        return false;
      });
    }

    // Step 2: Fetch corresponding organizations and evaluate
    const rankedResults: EngineMatchResult[] = [];
    const seenProviders = new Set<string>();

    for (const loc of candidateLocations) {
      if (seenProviders.has(loc.providerId)) {
        continue;
      }

      const org = await this.organizationRepo.findById(loc.providerId);
      if (!org) continue;

      seenProviders.add(loc.providerId);

      // Check durable rejections for this requirement
      const prevAttempts = await this.outreachAttemptRepo.list({
        requirementId,
        providerId: org.organizationId,
      });

      const isDurableRejection =
        excludedIds.has(org.organizationId) ||
        prevAttempts.some(
          (a) =>
            a.status === "REJECTED" &&
            ["SERVICE_NOT_SUPPORTED", "OUTSIDE_SERVICE_AREA", "INVALID_CONTACT"].includes(
              a.rejectionReason || ""
            )
        );

      const recentTimeout = prevAttempts.some((a) => a.status === "TIMED_OUT");

      // Provider active cases
      const activeAssignments = await this.assignmentRepo.list({
        providerId: org.organizationId,
        status: "IN_PROGRESS",
      });

      // Calculate distance
      const distKm = ProviderRankingService.calculateHaversineDistanceKm(
        latitude,
        longitude,
        loc.location.coordinates[1],
        loc.location.coordinates[0]
      );

      // Check territorial coverage flags
      const wardMatch = Boolean(
        targetWard &&
        (loc.ward?.toLowerCase() === targetWard ||
          loc.serviceArea.wards.some((w) => w.toLowerCase() === targetWard))
      );
      const districtMatch = Boolean(
        targetDistrict &&
        (loc.district.toLowerCase() === targetDistrict ||
          loc.serviceArea.districts.some((d) => d.toLowerCase() === targetDistrict))
      );
      const allDelhiMatch = loc.serviceArea.coversAllDelhi;

      const evalContext: CandidateEvaluationContext = {
        organization: org,
        serviceLocation: loc,
        estimatedDistanceKm: distKm,
        estimatedTravelMinutes: null, // Routing fallback to Haversine
        wardMatch,
        adjacentWardMatch: false,
        allDelhiMatch,
        districtMatch,
        activeCasesForProvider: activeAssignments.length,
        recentTimeoutForProvider: recentTimeout,
        isDurableRejection,
      };

      const matchResult = this.rankingService.evaluateAndRank(
        caseId,
        requirementId,
        query.serviceType,
        evalContext,
        isRound2
      );

      rankedResults.push(matchResult);
    }

    // Sort: Eligible first, then descending totalScore
    rankedResults.sort((a, b) => {
      if (a.eligibilityStatus !== b.eligibilityStatus) {
        return a.eligibilityStatus === "ELIGIBLE" ? -1 : 1;
      }
      return b.totalScore - a.totalScore;
    });

    const eligibleCount = rankedResults.filter(
      (r) => r.eligibilityStatus === "ELIGIBLE"
    ).length;

    const maxCand = query.maxCandidates || 10;
    const finalCandidates = rankedResults.slice(0, maxCand);

    const explanation =
      eligibleCount > 0
        ? `Found ${eligibleCount} eligible providers at ${expansionStage} search stage (${radiusUsed} km radius). Top recommendation: ${finalCandidates[0]?.providerName} (score: ${finalCandidates[0]?.totalScore}).`
        : `No eligible providers found within search radius up to ${radiusUsed} km. Coordinator review required.`;

    logger.info("Geospatial discovery completed", "DISCOVERY_SERVICE", {
      caseId,
      requirementId,
      expansionStage,
      radiusKm: radiusUsed,
      eligibleCount,
    });

    return {
      query,
      searchRadiusKmUsed: radiusUsed,
      expansionStage,
      totalCandidatesEvaluated: rankedResults.length,
      eligibleCandidatesCount: eligibleCount,
      rankedCandidates: finalCandidates,
      explanation,
    };
  }
}
