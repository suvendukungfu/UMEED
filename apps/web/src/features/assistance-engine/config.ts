/**
 * UMEED Core Assistance Engine Configuration
 *
 * All scoring weights, radius distances, decay factors, and SLA values
 * are centralized here and can be overridden via environment variables.
 */

export interface EngineScoringWeights {
  distance: number;
  capability: number;
  reliability: number;
  availability: number;
  coverage: number;
  freshness: number;
}

export interface EngineConfig {
  scoringWeights: EngineScoringWeights;
  distanceDecayConstantKm: number;
  travelTimeDecayMinutes: number;
  freshnessDecayDays: number;
  bayesianPriorAlpha: number;
  bayesianPriorBeta: number;
  searchRadiusKm: {
    initial: number;
    second: number;
    third: number;
  };
  outreachWaveLimits: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  acknowledgementSlaMinutes: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  penalties: {
    recentTimeout: number;
    maxWorkloadPenalty: number;
  };
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  // Phase 3 formula weights: 0.25 + 0.20 + 0.20 + 0.15 + 0.10 + 0.10 = 1.00
  scoringWeights: {
    distance: 0.25,
    capability: 0.2,
    reliability: 0.2,
    availability: 0.15,
    coverage: 0.1,
    freshness: 0.1,
  },
  distanceDecayConstantKm: 20,
  travelTimeDecayMinutes: 30,
  freshnessDecayDays: 30,
  bayesianPriorAlpha: 2,
  bayesianPriorBeta: 2,
  searchRadiusKm: {
    initial: 10,
    second: 20,
    third: 35,
  },
  outreachWaveLimits: {
    low: 2,
    medium: 2,
    high: 3,
    critical: 3,
  },
  acknowledgementSlaMinutes: {
    critical: 2,
    high: 5,
    medium: 15,
    low: 60,
  },
  penalties: {
    recentTimeout: 15,
    maxWorkloadPenalty: 30,
  },
};

export function getEngineConfig(overrides?: Partial<EngineConfig>): EngineConfig {
  const envWeights = process.env.ENGINE_WEIGHTS
    ? JSON.parse(process.env.ENGINE_WEIGHTS)
    : {};

  return {
    ...DEFAULT_ENGINE_CONFIG,
    ...(overrides || {}),
    scoringWeights: {
      ...DEFAULT_ENGINE_CONFIG.scoringWeights,
      ...envWeights,
      ...(overrides?.scoringWeights || {}),
    },
    searchRadiusKm: {
      ...DEFAULT_ENGINE_CONFIG.searchRadiusKm,
      ...(overrides?.searchRadiusKm || {}),
    },
    outreachWaveLimits: {
      ...DEFAULT_ENGINE_CONFIG.outreachWaveLimits,
      ...(overrides?.outreachWaveLimits || {}),
    },
    acknowledgementSlaMinutes: {
      ...DEFAULT_ENGINE_CONFIG.acknowledgementSlaMinutes,
      ...(overrides?.acknowledgementSlaMinutes || {}),
    },
    penalties: {
      ...DEFAULT_ENGINE_CONFIG.penalties,
      ...(overrides?.penalties || {}),
    },
  };
}

