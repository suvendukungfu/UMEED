import {
  IncidentDocument,
} from "@/features/incidents/types";
import {
  NGODocument,
} from "@/features/ngos/types";
import {
  MatchCandidate,
  MatchResult,
  MatchWeights,
  MatchWeightsSchema,
} from "@umeed/contracts";
import { INGORepository, getNGORepository } from "@/features/ngos/repositories";
import { IIncidentRepository, getIncidentRepository } from "@/features/incidents/repositories";
import { ApiError } from "@/lib/errors";

const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  capability: 0.4,
  geographic_coverage: 0.25,
  distance: 0.15,
  availability: 0.1,
  capacity: 0.1,
};

export class ExplainableMatchingService {
  private ngoRepo: INGORepository;
  private incidentRepo: IIncidentRepository;

  constructor(ngoRepo?: INGORepository, incidentRepo?: IIncidentRepository) {
    this.ngoRepo = ngoRepo || getNGORepository();
    this.incidentRepo = incidentRepo || getIncidentRepository();
  }

  /**
   * Generates explainable, capability-aware NGO match recommendations for an incident.
   */
  async matchIncident(
    publicReference: string,
    customWeights?: Partial<MatchWeights>
  ): Promise<MatchResult> {
    const incident = await this.incidentRepo.findByPublicReference(publicReference);
    if (!incident) {
      throw ApiError.notFound(`Incident ${publicReference} not found`);
    }

    const weights: MatchWeights = {
      ...DEFAULT_MATCH_WEIGHTS,
      ...(customWeights || {}),
    };
    MatchWeightsSchema.parse(weights);

    // Retrieve all active NGO organisations
    const { ngos: allNgos } = await this.ngoRepo.list({ limit: 200 });

    const candidates: MatchCandidate[] = [];
    let eligibleCount = 0;

    for (const ngo of allNgos) {
      const candidate = this.evaluateCandidate(incident, ngo, weights);
      candidates.push(candidate);
      if (candidate.eligible) {
        eligibleCount++;
      }
    }

    // Sort: Eligible candidates first, descending by total_score
    candidates.sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1;
      }
      return b.total_score - a.total_score;
    });

    const coordinates =
      incident.location.longitude !== null && incident.location.latitude !== null
        ? ([incident.location.longitude, incident.location.latitude] as [number, number])
        : null;

    const summary = this.buildOverallSummary(incident, candidates);

    return {
      incident_reference: incident.public_reference,
      incident_category: incident.incident_type,
      subject_type: incident.subject_type,
      incident_district: incident.location.district,
      incident_coordinates: coordinates,
      total_candidates_evaluated: allNgos.length,
      eligible_candidates_count: eligibleCount,
      candidates,
      weights_used: weights,
      generated_at: new Date().toISOString(),
      explanation_summary: summary,
    };
  }

  /**
   * Evaluates an individual candidate NGO against an incident.
   */
  evaluateCandidate(
    incident: IncidentDocument,
    ngo: NGODocument,
    weights: MatchWeights
  ): MatchCandidate {
    const missingInfo: string[] = [];

    // 1. Ineligibility Hard Checks
    if (ngo.verification_status === "SUSPENDED") {
      return this.buildIneligibleCandidate(
        ngo,
        "Organisation is currently under regulatory suspension.",
        missingInfo
      );
    }
    if (ngo.verification_status === "INACTIVE") {
      return this.buildIneligibleCandidate(
        ngo,
        "Organisation operations are currently inactive.",
        missingInfo
      );
    }

    // 2. Hard Capability Check: Subject Type & Incident Category
    const supportsSubject = ngo.supported_subject_types.includes(incident.subject_type);
    const supportsCategory = ngo.service_categories.includes(incident.incident_type);

    if (!supportsSubject || !supportsCategory) {
      const reason = !supportsCategory
        ? `Does not support incident category '${incident.incident_type}'. Supports: [${ngo.service_categories.join(", ")}].`
        : `Does not support subject type '${incident.subject_type}'. Supports: [${ngo.supported_subject_types.join(", ")}].`;

      return this.buildIneligibleCandidate(
        ngo,
        `Capability mismatch: ${reason}`,
        missingInfo
      );
    }

    // Determine matched assistance capabilities
    const requiredAssistance = incident.triage_analysis?.possible_assistance || [];
    const matchedCaps = ngo.assistance_capabilities.filter((cap) =>
      requiredAssistance.some((req) => req.toLowerCase().includes(cap.toLowerCase()) || cap.toLowerCase().includes(req.toLowerCase()))
    );

    // Capability Score: Base 0.8 for category match + 0.2 for specific assistance capability matches
    let capabilityScore = 0.8;
    if (matchedCaps.length > 0) {
      capabilityScore = Math.min(1.0, 0.8 + 0.1 * matchedCaps.length);
    }

    // 3. Geographic Coverage Scoring (25%)
    let coverageScore = 0.0;
    let geographicReasoning = "";
    const incidentDistrict = incident.location.district?.toLowerCase() || "";

    if (incidentDistrict) {
      const matchesDistrict = ngo.operational_districts.some(
        (d) => d.toLowerCase() === incidentDistrict
      );
      if (matchesDistrict) {
        coverageScore = 1.0;
        geographicReasoning = `Direct operational coverage in ${incident.location.district}.`;
      } else {
        // Check state-level or adjacent coverage
        const hasStateCoverage = ngo.operational_states.some((s) => s.toLowerCase() === "delhi");
        if (hasStateCoverage) {
          coverageScore = 0.4;
          geographicReasoning = `Operates in Delhi but not explicitly registered in ${incident.location.district}.`;
        } else {
          coverageScore = 0.0;
          geographicReasoning = `No operational coverage in ${incident.location.district}.`;
        }
      }
    } else {
      coverageScore = 0.5;
      geographicReasoning = "Incident district unknown; neutral regional coverage applied.";
      missingInfo.push("Incident district unspecified; geographic precision reduced");
    }

    // 4. Distance Calculation & Scoring (15%)
    let distanceScore = 0.0;
    let distanceKm: number | null = null;

    const hasIncidentCoords =
      incident.location.latitude !== null &&
      incident.location.longitude !== null &&
      (incident.location.confidence >= 0.5);

    const hasNgoCoords =
      ngo.headquarters_location.latitude !== null &&
      ngo.headquarters_location.longitude !== null;

    if (hasIncidentCoords && hasNgoCoords) {
      distanceKm = this.calculateHaversineDistanceKm(
        incident.location.latitude!,
        incident.location.longitude!,
        ngo.headquarters_location.latitude!,
        ngo.headquarters_location.longitude!
      );

      const radius = ngo.service_radius_km || 20;
      if (distanceKm <= radius) {
        // Linear decay within radius: 0km = 1.0, radius = 0.2
        distanceScore = Math.max(0.2, 1.0 - (distanceKm / radius) * 0.8);
      } else {
        // Outside service radius
        distanceScore = Math.max(0.05, 0.2 - ((distanceKm - radius) / radius) * 0.15);
      }
    } else {
      // Safe fallback when coordinates are missing or low-confidence
      distanceScore = coverageScore > 0 ? 0.5 : 0.0;
      if (!hasIncidentCoords) {
        missingInfo.push(
          "Reliable incident GPS coordinates unavailable; matching based on district coverage without distance penalty"
        );
      }
      if (!hasNgoCoords) {
        missingInfo.push("NGO headquarters GPS coordinates unavailable on file");
      }
    }

    // 5. Current Availability Scoring (10%)
    let availabilityScore = 0.3; // Default baseline
    let availabilityEvidence = "";

    switch (ngo.availability_status) {
      case "AVAILABLE":
        availabilityScore = ngo.accepting_assignments ? 1.0 : 0.5;
        availabilityEvidence = ngo.accepting_assignments
          ? "Currently active and accepting assignments."
          : "Available but temporarily not accepting new assignments.";
        break;
      case "LIMITED":
        availabilityScore = 0.6;
        availabilityEvidence = "Limited shift availability or volunteer constraints reported.";
        break;
      case "UNKNOWN":
        availabilityScore = 0.3;
        availabilityEvidence = "Real-time availability is unrecorded. Verification recommended.";
        missingInfo.push("Current live availability status is UNKNOWN");
        break;
      case "UNAVAILABLE":
        availabilityScore = 0.0;
        availabilityEvidence = "Organisation reported UNAVAILABLE.";
        break;
    }

    // 6. Reported Capacity Scoring (10%)
    let capacityScore = 0.4;
    let capacityEvidence = "";

    if (ngo.max_concurrent_cases > 0) {
      const active = ngo.active_cases || 0;
      const max = ngo.max_concurrent_cases;
      const remainingRatio = Math.max(0, (max - active) / max);

      capacityScore = Math.round(remainingRatio * 100) / 100;
      capacityEvidence = `${active}/${max} active cases (${Math.round((1 - remainingRatio) * 100)}% utilized).`;
    } else {
      switch (ngo.capacity_status) {
        case "HIGH":
          capacityScore = 1.0;
          capacityEvidence = "Reported high concurrent capacity.";
          break;
        case "MODERATE":
          capacityScore = 0.7;
          capacityEvidence = "Reported moderate capacity.";
          break;
        case "NEAR_CAPACITY":
          capacityScore = 0.2;
          capacityEvidence = "Reported near maximum capacity.";
          break;
        case "FULL":
          capacityScore = 0.0;
          capacityEvidence = "Reported full capacity.";
          break;
        default:
          capacityScore = 0.4;
          capacityEvidence = "Capacity status unrecorded.";
          missingInfo.push("Active caseload capacity is UNKNOWN");
          break;
      }
    }

    // 7. Response History Safeguard (< 5 cases = null / excluded)
    let historyScore: number | null = null;
    const history = ngo.assignment_history;

    if (history && history.sample_size >= 5) {
      const completionRate =
        history.total_assignments > 0
          ? history.completed_interventions / history.total_assignments
          : 0.5;

      const timeScore =
        history.average_response_minutes !== null
          ? Math.max(0.2, 1.0 - history.average_response_minutes / 120)
          : 0.5;

      historyScore = Math.round((completionRate * 0.7 + timeScore * 0.3) * 100) / 100;
    } else {
      missingInfo.push(
        "Insufficient response history sample (< 5 cases); excluded from score calculation to avoid small-sample bias"
      );
    }

    // 8. Total Score Calculation
    const totalScore = Math.round(
      (weights.capability * capabilityScore +
        weights.geographic_coverage * coverageScore +
        weights.distance * distanceScore +
        weights.availability * availabilityScore +
        weights.capacity * capacityScore) *
        100
    ) / 100;

    // 9. Build Human Explanation
    const explanation = this.buildCandidateExplanation({
      name: ngo.organisation_name,
      totalScore,
      verificationStatus: ngo.verification_status,
      category: incident.incident_type,
      district: incident.location.district,
      distanceKm,
      availabilityEvidence,
      capacityEvidence,
      matchedCaps,
      isDemo: ngo.is_demo,
    });

    return {
      ngo_id: ngo.ngo_id,
      organisation_name: ngo.organisation_name,
      verification_status: ngo.verification_status,
      total_score: totalScore,
      eligible: true,
      ineligibility_reason: null,
      component_scores: {
        capability_score: capabilityScore,
        coverage_score: coverageScore,
        distance_score: distanceScore,
        availability_score: availabilityScore,
        capacity_score: capacityScore,
        history_score: historyScore,
      },
      matched_capabilities: matchedCaps,
      geographic_reasoning: geographicReasoning,
      distance_km: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
      availability_evidence: availabilityEvidence,
      capacity_evidence: capacityEvidence,
      missing_information: missingInfo,
      explanation,
      is_demo: ngo.is_demo,
    };
  }

  private buildIneligibleCandidate(
    ngo: NGODocument,
    reason: string,
    missingInfo: string[]
  ): MatchCandidate {
    return {
      ngo_id: ngo.ngo_id,
      organisation_name: ngo.organisation_name,
      verification_status: ngo.verification_status,
      total_score: 0.0,
      eligible: false,
      ineligibility_reason: reason,
      component_scores: {
        capability_score: 0.0,
        coverage_score: 0.0,
        distance_score: 0.0,
        availability_score: 0.0,
        capacity_score: 0.0,
        history_score: null,
      },
      matched_capabilities: [],
      geographic_reasoning: "Not evaluated due to hard ineligibility.",
      distance_km: null,
      availability_evidence: ngo.availability_status,
      capacity_evidence: ngo.capacity_status,
      missing_information: missingInfo,
      explanation: `Disqualified from matching: ${reason}`,
      is_demo: ngo.is_demo,
    };
  }

  private buildCandidateExplanation(ctx: {
    name: string;
    totalScore: number;
    verificationStatus: string;
    category: string;
    district: string | null;
    distanceKm: number | null;
    availabilityEvidence: string;
    capacityEvidence: string;
    matchedCaps: string[];
    isDemo: boolean;
  }): string {
    const parts = [
      `Score: ${Math.round(ctx.totalScore * 100)}% match.`,
      `Verified for '${ctx.category.replace(/_/g, " ")}' with status [${ctx.verificationStatus}].`,
    ];

    if (ctx.distanceKm !== null) {
      parts.push(`Headquarters located ${Math.round(ctx.distanceKm * 10) / 10}km from incident location.`);
    } else if (ctx.district) {
      parts.push(`Covers target district ${ctx.district}.`);
    }

    parts.push(`Availability: ${ctx.availabilityEvidence}`);
    parts.push(`Caseload: ${ctx.capacityEvidence}`);

    if (ctx.isDemo) {
      parts.push("(DEMO_ONLY synthetic fixture).");
    }

    return parts.join(" ");
  }

  private buildOverallSummary(
    incident: IncidentDocument,
    candidates: MatchCandidate[]
  ): string {
    const eligible = candidates.filter((c) => c.eligible);
    if (eligible.length === 0) {
      return `No eligible organisations found matching category '${incident.incident_type}' and subject '${incident.subject_type}'. Human coordinator manual outreach required.`;
    }

    const top = eligible[0];
    return `Evaluated ${candidates.length} organisations. Found ${eligible.length} eligible candidates. Top recommendation is '${top.organisation_name}' (${Math.round(top.total_score * 100)}% match). Human coordinator confirmation required before contact.`;
  }

  private calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

