/**
 * Capability-Aware NGO Matching Types (Phase 4 Foundation)
 */
export interface MatchCandidate {
  ngo_id: string;
  name: string;
  total_score: number;
  breakdown: {
    capability_match: number;
    geographic_proximity: number;
    availability: number;
    capacity: number;
    historical_performance: number;
  };
  explanation: string;
}

