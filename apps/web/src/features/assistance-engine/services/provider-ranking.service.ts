import {
  EngineMatchResult,
  ScoreBreakdown,
  CandidateEvaluationContext,
} from "../types";
import { EngineConfig, DEFAULT_ENGINE_CONFIG, getEngineConfig } from "../config";

export class ProviderRankingService {
  private config: EngineConfig;

  constructor(config?: Partial<EngineConfig>) {
    this.config = getEngineConfig(config);
  }

  /**
   * Calculates Normalized Score (0-100) and returns structured MatchResult with human explanation.
   */
  evaluateAndRank(
    caseId: string,
    requirementId: string,
    serviceType: string,
    ctx: CandidateEvaluationContext,
    isRound2 = false
  ): EngineMatchResult {
    const { organization, serviceLocation } = ctx;
    const exclusionReasons: string[] = [];
    const reasons: string[] = [];

    // =========================================================================
    // STAGE A: HARD ELIGIBILITY FILTERING (Phase 2 & Phase 3)
    // =========================================================================

    // 1. Service Category / Capability
    const supportsService =
      serviceLocation.supportedServices.includes(serviceType) ||
      organization.serviceCategories.includes(serviceType);

    if (!supportsService) {
      exclusionReasons.push(`Service '${serviceType}' is not supported by provider.`);
    }

    // 2. Coverage
    const isInsideCoverage =
      ctx.wardMatch ||
      ctx.districtMatch ||
      ctx.allDelhiMatch ||
      serviceLocation.serviceArea.coversAllDelhi ||
      serviceLocation.serviceArea.acceptsOutOfArea;

    if (!isInsideCoverage) {
      exclusionReasons.push(
        `Location is outside provider declared coverage area and out-of-area requests are not accepted.`
      );
    }

    // 3. Operational status
    if (
      organization.operationalStatus !== "ACTIVE" ||
      serviceLocation.operationalStatus !== "ACTIVE"
    ) {
      exclusionReasons.push(
        `Provider or facility is suspended or closed (${organization.operationalStatus} / ${serviceLocation.operationalStatus}).`
      );
    }

    if (
      organization.verificationStatus === "SUSPENDED" ||
      organization.verificationStatus === "INACTIVE"
    ) {
      exclusionReasons.push(
        `Organisation is under verification suspension (${organization.verificationStatus}).`
      );
    }

    // 4. Contact Channels
    const channels = organization.publicContactChannels;
    const hasValidContact = Boolean(
      (channels.phone && channels.phone.trim().length > 0) ||
      (channels.email && channels.email.trim().length > 0) ||
      (channels.emergencyPhone && channels.emergencyPhone.trim().length > 0)
    );

    if (!hasValidContact) {
      exclusionReasons.push(`Provider does not possess an operational contact channel.`);
    }

    // 5. Durable Rejection Exclusion
    if (ctx.isDurableRejection) {
      exclusionReasons.push(
        `Provider has a durable rejection on record for this specific requirement.`
      );
    }

    // 6. Capacity hard exclusion
    if (
      serviceLocation.availabilityStatus === "NO_CAPACITY" ||
      serviceLocation.availabilityStatus === "CLOSED_SUSPENDED"
    ) {
      exclusionReasons.push(
        `Provider facility has zero capacity or is suspended (${serviceLocation.availabilityStatus}).`
      );
    }

    const isEligible = exclusionReasons.length === 0;

    // =========================================================================
    // STAGE B: COMPONENT SCORING (Phase 3)
    // =========================================================================

    // A. Distance Score
    let distanceScore = 0;
    if (ctx.estimatedTravelMinutes !== null && ctx.estimatedTravelMinutes >= 0) {
      // 100 * exp(-travelTimeMinutes / 30)
      distanceScore =
        100 * Math.exp(-ctx.estimatedTravelMinutes / this.config.travelTimeDecayMinutes);
    } else if (ctx.estimatedDistanceKm !== null && ctx.estimatedDistanceKm >= 0) {
      // Haversine distance decay
      distanceScore =
        100 * Math.exp(-ctx.estimatedDistanceKm / this.config.distanceDecayConstantKm);
    } else {
      distanceScore = 50; // Neutral fallback when coordinates are missing
    }
    distanceScore = Math.max(0, Math.min(100, Math.round(distanceScore * 10) / 10));

    // B. Capability Score
    let capabilityScore = 0;
    if (serviceLocation.supportedServices.includes(serviceType)) {
      capabilityScore = 100; // Exact match
      reasons.push("Exact capability match for required assistance.");
    } else if (organization.serviceCategories.includes(serviceType)) {
      capabilityScore = 75; // Secondary supported service
      reasons.push("Secondary supported service match.");
    } else if (
      organization.serviceSubcategories &&
      organization.serviceSubcategories.some((sub) =>
        sub.toLowerCase().includes(serviceType.toLowerCase())
      )
    ) {
      capabilityScore = 40; // Referral-only
      reasons.push("Related referral capability available.");
    } else {
      capabilityScore = 0;
    }

    // C. Reliability Score (Bayesian Smoothing)
    // ReliabilityScore = 100 * (successfulResponses + alpha) / (eligibleResolvedAttempts + alpha + beta)
    const metrics = organization.reliabilityMetrics;
    const catMetric = metrics?.categoryMetrics?.[serviceType];
    const successes =
      catMetric?.successfulResponses ?? metrics?.successfulResponses ?? 0;
    const attempts =
      catMetric?.eligibleResolvedAttempts ?? metrics?.eligibleResolvedAttempts ?? 0;

    const alpha = this.config.bayesianPriorAlpha;
    const beta = this.config.bayesianPriorBeta;

    const reliabilityRatio = (successes + alpha) / (attempts + alpha + beta);
    const reliabilityScore = Math.round(reliabilityRatio * 100 * 10) / 10;

    if (attempts === 0) {
      reasons.push(
        "New organisation received calibrated neutral Bayesian reliability prior (50%)."
      );
    } else if (reliabilityScore >= 80) {
      reasons.push("Strong historical response and completion record.");
    }

    // D. Availability Score
    let availabilityScore = 40;
    switch (serviceLocation.availabilityStatus) {
      case "CONFIRMED_AVAILABLE":
        availabilityScore = 100;
        reasons.push("Confirmed available with verified active capacity.");
        break;
      case "LIMITED_CONFIRMED":
        availabilityScore = 70;
        reasons.push("Limited confirmed capacity available.");
        break;
      case "UNKNOWN":
        availabilityScore = 40;
        reasons.push("Unknown capacity status (requires confirmation outreach).");
        break;
      case "NO_CAPACITY":
      case "CLOSED_SUSPENDED":
        availabilityScore = 0;
        break;
    }

    // E. Coverage Score
    let coverageScore = 30;
    if (ctx.wardMatch) {
      coverageScore = 100;
      reasons.push("Explicit ward-level territorial coverage.");
    } else if (ctx.adjacentWardMatch) {
      coverageScore = 75;
      reasons.push("Adjacent ward-level territorial coverage.");
    } else if (ctx.allDelhiMatch || serviceLocation.serviceArea.coversAllDelhi) {
      coverageScore = 85;
      reasons.push("Confirmed Delhi-wide coverage mandate.");
    } else if (ctx.districtMatch) {
      coverageScore = 65;
      reasons.push("District-level geographic coverage.");
    } else {
      coverageScore = 30;
      reasons.push("Unknown or out-of-area coverage (requires confirmation).");
    }

    // F. Freshness Score
    // FreshnessScore = 100 * exp(-daysSinceVerification / 30)
    let freshnessScore = 50;
    const verifiedDateStr =
      serviceLocation.lastAvailabilityConfirmedAt ||
      serviceLocation.lastVerifiedAt ||
      organization.lastVerifiedAt;

    if (verifiedDateStr) {
      const daysSince = Math.max(
        0,
        (Date.now() - new Date(verifiedDateStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      freshnessScore =
        100 * Math.exp(-daysSince / this.config.freshnessDecayDays);
    } else {
      freshnessScore = 30; // Unverified / stale
    }
    freshnessScore = Math.max(0, Math.min(100, Math.round(freshnessScore * 10) / 10));

    if (freshnessScore >= 85) {
      reasons.push("Recently confirmed operational and availability data.");
    }

    // =========================================================================
    // BASE TOTAL SCORE
    // =========================================================================
    const w = this.config.scoringWeights;
    const baseTotal =
      w.distance * distanceScore +
      w.capability * capabilityScore +
      w.reliability * reliabilityScore +
      w.availability * availabilityScore +
      w.coverage * coverageScore +
      w.freshness * freshnessScore;

    let finalScore = isEligible ? baseTotal : 0;

    // =========================================================================
    // ROUND 2 PENALTIES (Phase 5)
    // Round2Score = BaseScore - RepeatPenalty - WorkloadPenalty
    // =========================================================================
    if (isRound2 && isEligible) {
      let penalty = 0;
      if (ctx.recentTimeoutForProvider) {
        penalty += this.config.penalties.recentTimeout;
        reasons.push(
          `Subtracted ${this.config.penalties.recentTimeout} point penalty due to recent outreach timeout.`
        );
      }

      // Workload penalty: min(30, 30 * activeCases / max(1, capacity))
      if (serviceLocation.capacity > 0) {
        const workloadRatio =
          ctx.activeCasesForProvider / Math.max(1, serviceLocation.capacity);
        const workloadPenalty = Math.min(
          this.config.penalties.maxWorkloadPenalty,
          Math.round(this.config.penalties.maxWorkloadPenalty * workloadRatio)
        );
        if (workloadPenalty > 0) {
          penalty += workloadPenalty;
          reasons.push(
            `Subtracted ${workloadPenalty} point workload penalty based on provider caseload.`
          );
        }
      }

      finalScore = Math.max(0, finalScore - penalty);
    }

    finalScore = Math.round(finalScore * 10) / 10;

    const breakdown: ScoreBreakdown = {
      distance: distanceScore,
      capability: capabilityScore,
      reliability: reliabilityScore,
      availability: availabilityScore,
      coverage: coverageScore,
      freshness: freshnessScore,
    };

    return {
      matchId: `match_${caseId}_${serviceLocation.serviceLocationId}`,
      caseId,
      requirementId,
      providerId: organization.organizationId,
      serviceLocationId: serviceLocation.serviceLocationId,
      providerName: organization.name,
      serviceLocationName: serviceLocation.name,
      totalScore: finalScore,
      scoreBreakdown: breakdown,
      reasons,
      estimatedDistanceKm:
        ctx.estimatedDistanceKm !== null
          ? Math.round(ctx.estimatedDistanceKm * 10) / 10
          : null,
      estimatedTravelMinutes:
        ctx.estimatedTravelMinutes !== null
          ? Math.round(ctx.estimatedTravelMinutes)
          : null,
      eligibilityStatus: isEligible ? "ELIGIBLE" : "INELIGIBLE",
      exclusionReasons,
      rankingVersion: "1.0.0",
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper to compute exact Haversine distance in km.
   */
  static calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const d = 2 * R * Math.asin(Math.sqrt(a));
    return d;
  }
}

