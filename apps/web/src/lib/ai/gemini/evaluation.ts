import { IncidentDocument, IncidentTriageAnalysis } from "@/features/incidents/types";
import { GeminiTriageService } from "./triage.service";
import { GeminiTriageOutputSchema } from "./schemas";
import { IncidentType } from "@umeed/contracts";

export interface EvaluationScenario {
  id: string;
  name: string;
  description: string;
  expected_category: IncidentType;
  expected_subject_type: "person" | "animal";
  is_emergency: boolean;
  sample_incident: IncidentDocument;
}

export interface EvaluationMetrics {
  total_scenarios: number;
  schema_valid_rate: number;
  category_accuracy: number;
  false_emergency_escalation_rate: number;
  missing_information_extraction_rate: number;
  grounding_in_evidence_rate: number;
  failure_handling_rate: number;
  timestamp: string;
  scenario_results: Array<{
    scenario_id: string;
    scenario_name: string;
    category_match: boolean;
    urgency_assigned: string;
    schema_valid: boolean;
    missing_info_count: number;
    observations_count: number;
    analysis_status: string;
  }>;
}

/**
 * 9 Standard Synthetic Evaluation Benchmark Scenarios
 */
export const SYNTHETIC_EVALUATION_SCENARIOS: EvaluationScenario[] = [
  {
    id: "eval_01_injured_animal",
    name: "Injured Canine Traffic Trauma",
    description: "Stray dog hit by a two-wheeler, bleeding on the leg, lying on roadside",
    expected_category: "injured_animal",
    expected_subject_type: "animal",
    is_emergency: true,
    sample_incident: {
      _id: "eval-inc-01",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_01",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "A medium brown stray dog was hit by a bike near Sector 14 market. Bleeding from left hind leg, unable to stand, whimpering on the sidewalk.",
      evidence: [
        {
          type: "image",
          url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
          metadata: { note: "Injured dog photo" },
        },
      ],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Sector 14 Market, Rohini",
        district: "North West Delhi",
        confidence: 0.95,
      },
      severity: { level: "high", confidence: 0.9, reasoning: ["Active bleeding and inability to walk"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Exact stall number"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0001",
      tracking_token_hash: "hash_eval_01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_02_abandoned_animal",
    name: "Abandoned Litter of Pups",
    description: "Carton of 4 newborn puppies left outside metro gate in cold weather",
    expected_category: "abandoned_animal",
    expected_subject_type: "animal",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-02",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_02",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "abandoned_animal",
      subject_type: "animal",
      description: "Four newborn puppies sealed inside a cardboard box near Gate 2 of Kashmere Gate metro station. Shivering, no mother dog seen around.",
      evidence: [],
      location: {
        latitude: 28.6675,
        longitude: 77.2285,
        address: "Gate 2, Kashmere Gate Metro Station",
        district: "Central Delhi",
        confidence: 0.9,
      },
      severity: { level: "medium", confidence: 0.85, reasoning: ["Vulnerable pups exposed to night cold"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Mother dog proximity"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0002",
      tracking_token_hash: "hash_eval_02",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_03_elderly_assistance",
    name: "Disoriented Elderly Citizen",
    description: "Elderly man unable to recall home address or family contacts",
    expected_category: "abandoned_elderly_person",
    expected_subject_type: "person",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-03",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_03",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "abandoned_elderly_person",
      subject_type: "person",
      description: "An elderly gentleman around 75-80 years old has been sitting on the park bench for over 6 hours. He appears disoriented, cannot remember his address or phone number, wearing light clothes in cold breeze.",
      evidence: [],
      location: {
        latitude: 28.5355,
        longitude: 77.241,
        address: "Nehru Park, Chanakyapuri",
        district: "New Delhi",
        confidence: 0.9,
      },
      severity: { level: "high", confidence: 0.85, reasoning: ["Cognitive disorientation and exposure to weather"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Identification document"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0003",
      tracking_token_hash: "hash_eval_03",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_04_food_assistance",
    name: "Stranded Migrant Group Food Deprivation",
    description: "Daily wage construction workers stranded without rations",
    expected_category: "food_assistance",
    expected_subject_type: "person",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-04",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_04",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "food_assistance",
      subject_type: "person",
      description: "A group of 8 construction worker families including small children have had no food supplies for two days after contractor abandoned the site.",
      evidence: [],
      location: {
        latitude: 28.4595,
        longitude: 77.0266,
        address: "Near Sector 56 construction site",
        district: "Gurugram",
        confidence: 0.8,
      },
      severity: { level: "medium", confidence: 0.8, reasoning: ["Food insecurity across families with young children"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Total head count of children"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0004",
      tracking_token_hash: "hash_eval_04",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_05_shelter_request",
    name: "Winter Night Shelter Eviction",
    description: "Homeless people displaced after temporary rain shelter collapsed",
    expected_category: "shelter_assistance",
    expected_subject_type: "person",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-05",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_05",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "shelter_assistance",
      subject_type: "person",
      description: "Makeshift plastic shelter near Yamuna bank collapsed due to high winds. 12 individuals sleeping out in open rain tonight, need rain-proof shelter transfer.",
      evidence: [],
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        address: "Yamuna Ghat near Geeta Colony Bridge",
        district: "East Delhi",
        confidence: 0.85,
      },
      severity: { level: "high", confidence: 0.85, reasoning: ["Exposure to heavy rain and wind without shelter"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Proximity to nearest DUSIB shelter"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0005",
      tracking_token_hash: "hash_eval_05",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_06_medical_assistance",
    name: "Acute Dehydration / Diabetic Foot Ulcer",
    description: "Homeless person with infected foot ulcer unable to walk",
    expected_category: "medical_assistance",
    expected_subject_type: "person",
    is_emergency: true,
    sample_incident: {
      _id: "eval-inc-06",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_06",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "medical_assistance",
      subject_type: "person",
      description: "Person lying near temple wall with severe untreated open leg ulcer, swelling and fever. Needs non-emergency medical transport to hospital OPD.",
      evidence: [],
      location: {
        latitude: 28.6507,
        longitude: 77.2334,
        address: "Near Hanuman Mandir, Chandni Chowk",
        district: "North Delhi",
        confidence: 0.9,
      },
      severity: { level: "high", confidence: 0.9, reasoning: ["Active infected wound requiring clinical care"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Consciousness level"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0006",
      tracking_token_hash: "hash_eval_06",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_07_ambiguous_report",
    name: "Ambiguous Noise / Disturbance",
    description: "Report stating 'something is wrong near the corner shop'",
    expected_category: "other",
    expected_subject_type: "person",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-07",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_07",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "other",
      subject_type: "person",
      description: "People were shouting and someone seemed upset near the tea stall. Not sure what happened.",
      evidence: [],
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: "Near corner tea stall",
        district: "North West Delhi",
        confidence: 0.4,
      },
      severity: { level: "unconfirmed", confidence: 0.2, reasoning: ["Vague report without verifiable distress details"] },
      freshness: "unclear",
      missing_information: ["Is anyone injured or in distress?", "Exact shop name"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0007",
      tracking_token_hash: "hash_eval_07",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_08_unrelated_image",
    name: "Irrelevant Media Submission",
    description: "Citizen uploaded a meme or unrelated nature photo with distress text",
    expected_category: "injured_animal",
    expected_subject_type: "animal",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-08",
      schema_version: "1.0.0",
      source_type: "citizen_report",
      source_reference: "eval_ref_08",
      source_url: null,
      reported_at: new Date().toISOString(),
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Cat stuck on high wall behind bakery.",
      evidence: [
        {
          type: "image",
          url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==", // placeholder image
          metadata: { note: "Sunset landscape photo uploaded erroneously" },
        },
      ],
      location: {
        latitude: 28.62,
        longitude: 77.21,
        address: "Behind Green Bakery, Connaught Place",
        district: "New Delhi",
        confidence: 0.85,
      },
      severity: { level: "medium", confidence: 0.6, reasoning: ["Image does not display animal; text indicates trapped feline"] },
      freshness: "current_confirmed_by_source",
      missing_information: ["Visual verification of cat"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0008",
      tracking_token_hash: "hash_eval_08",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "eval_09_outdated_media",
    name: "Outdated / Reshared Social Discovery",
    description: "Social media post from 2024 resurfaced with recent hashtag",
    expected_category: "injured_animal",
    expected_subject_type: "animal",
    is_emergency: false,
    sample_incident: {
      _id: "eval-inc-09",
      schema_version: "1.0.0",
      source_type: "social_media_discovery",
      source_reference: "eval_ref_09",
      source_url: "https://twitter.com/example/status/987654321",
      reported_at: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(), // 1 year old
      incident_type: "injured_animal",
      subject_type: "animal",
      description: "Reshared post: Injured cow near highway mile 42. Original date indicates March 2024.",
      evidence: [],
      location: {
        latitude: 28.45,
        longitude: 77.02,
        address: "NH-48 Mile 42",
        district: "Gurugram",
        confidence: 0.5,
      },
      severity: { level: "unconfirmed", confidence: 0.3, reasoning: ["Timestamp indicates historic reshared post"] },
      freshness: "old_or_reshared",
      missing_information: ["Current physical presence verification"],
      requires_human_review: true,
      status: "REPORTED",
      is_suspected_duplicate: false,
      suspected_duplicate_ids: [],
      public_reference: "UMD-EVAL-0009",
      tracking_token_hash: "hash_eval_09",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

/**
 * Execute the 9-scenario evaluation benchmark on the provided GeminiTriageService.
 */
export async function runTriageEvaluation(
  service: GeminiTriageService
): Promise<EvaluationMetrics> {
  const scenarioResults: EvaluationMetrics["scenario_results"] = [];
  let schemaValidCount = 0;
  let categoryMatchCount = 0;
  let falseEmergencyCount = 0;
  let missingInfoExtractedCount = 0;
  let groundingInEvidenceCount = 0;
  let failureHandlingCount = 0;

  for (const scenario of SYNTHETIC_EVALUATION_SCENARIOS) {
    const analysis = await service.triageIncident(scenario.sample_incident);

    // 1. Schema Validation Check
    const schemaCheck = GeminiTriageOutputSchema.safeParse({
      incident_category: analysis.category_recommendation,
      subject_type: analysis.subject_type,
      observable_evidence: analysis.observable_evidence,
      possible_assistance: analysis.possible_assistance,
      urgency_recommendation: {
        level: analysis.urgency.level,
        reasoning: analysis.urgency.reasoning,
        requires_human_review: true,
      },
      location_candidates: analysis.location_candidates,
      missing_information: analysis.missing_information,
      limitations: analysis.limitations,
      model_metadata: {
        model_id: analysis.model_id,
        prompt_version: analysis.prompt_version,
      },
    });

    const isSchemaValid = schemaCheck.success;
    if (isSchemaValid) schemaValidCount++;

    // 2. Category Accuracy
    const isCategoryMatch = analysis.category_recommendation === scenario.expected_category;
    if (isCategoryMatch) categoryMatchCount++;

    // 3. False Emergency Escalation Check
    // If scenario is non-emergency but was marked emergency_review -> False escalation
    const isFalseEmergency = !scenario.is_emergency && analysis.urgency.level === "emergency_review";
    if (isFalseEmergency) falseEmergencyCount++;

    // 4. Missing Information Extraction
    if (analysis.missing_information && analysis.missing_information.length > 0) {
      missingInfoExtractedCount++;
    }

    // 5. Grounding in Evidence
    // Should have either observable evidence items or explicit limitations
    if (
      (analysis.observable_evidence && analysis.observable_evidence.length > 0) ||
      (analysis.limitations && analysis.limitations.length > 0)
    ) {
      groundingInEvidenceCount++;
    }

    // 6. Failure Handling (did not throw, valid status)
    if (analysis.analysis_status === "SUCCESS" || analysis.analysis_status === "MANUAL_REVIEW_REQUIRED") {
      failureHandlingCount++;
    }

    scenarioResults.push({
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      category_match: isCategoryMatch,
      urgency_assigned: analysis.urgency.level,
      schema_valid: isSchemaValid,
      missing_info_count: analysis.missing_information?.length || 0,
      observations_count: analysis.observable_evidence?.length || 0,
      analysis_status: analysis.analysis_status,
    });
  }

  const total = SYNTHETIC_EVALUATION_SCENARIOS.length;

  return {
    total_scenarios: total,
    schema_valid_rate: Math.round((schemaValidCount / total) * 100) / 100,
    category_accuracy: Math.round((categoryMatchCount / total) * 100) / 100,
    false_emergency_escalation_rate: Math.round((falseEmergencyCount / total) * 100) / 100,
    missing_information_extraction_rate: Math.round((missingInfoExtractedCount / total) * 100) / 100,
    grounding_in_evidence_rate: Math.round((groundingInEvidenceCount / total) * 100) / 100,
    failure_handling_rate: Math.round((failureHandlingCount / total) * 100) / 100,
    timestamp: new Date().toISOString(),
    scenario_results: scenarioResults,
  };
}
