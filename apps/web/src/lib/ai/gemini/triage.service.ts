import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { IncidentDocument, IncidentTriageAnalysis } from "@/features/incidents/types";
import { getGeminiClient, isGeminiConfigured } from "./client";
import { DEFAULT_GEMINI_MODEL, GeminiModelId } from "./models";
import { GeminiTriageOutputSchema, GeminiTriageOutput } from "./schemas";
import {
  GEMINI_TRIAGE_SYSTEM_INSTRUCTION,
  TRIAGE_PROMPT_VERSION,
  buildTriageUserPrompt,
} from "./prompts";
import {
  GeminiConfigError,
  GeminiQuotaError,
  GeminiUnavailableError,
  GeminiValidationError,
  GeminiTimeoutError,
} from "./errors";
import { logger } from "@/lib/logging";

export interface TriageOptions {
  modelId?: GeminiModelId | string;
  apiKey?: string;
  client?: GoogleGenAI;
  timeoutMs?: number;
}

/**
 * Gemini Multimodal Distress Triage Service
 *
 * Implements Phase 3 AI Incident Triage Engine.
 *
 * Invariants:
 * 1. AI is an assistant; human coordinators are the sole authority.
 * 2. Unhandled errors fail soft to MANUAL_REVIEW_REQUIRED; the report is NEVER lost.
 * 3. Structured outputs are strictly validated via Zod.
 * 4. Image evidence is sent directly from server memory; private storage keys are withheld.
 */
export class GeminiTriageService {
  private client: GoogleGenAI | null = null;
  private defaultModel: GeminiModelId;

  constructor(client?: GoogleGenAI, defaultModel: GeminiModelId = DEFAULT_GEMINI_MODEL) {
    if (client) {
      this.client = client;
    }
    this.defaultModel = defaultModel;
  }

  /**
   * Run multimodal triage on a submitted incident document.
   */
  async triageIncident(
    incident: IncidentDocument,
    options: TriageOptions = {}
  ): Promise<IncidentTriageAnalysis> {
    const startTime = Date.now();
    const modelId = (options.modelId as GeminiModelId) || this.defaultModel;
    const timeoutMs = options.timeoutMs || 15000;

    // Check if Gemini is configured before attempting network calls
    const isConfigured = isGeminiConfigured(options.apiKey);
    if (!isConfigured && !options.client && !this.client) {
      logger.info(
        "Gemini API key is unconfigured; generating graceful MANUAL_REVIEW_REQUIRED triage fallback",
        "GEMINI_TRIAGE",
        { public_reference: incident.public_reference }
      );
      return this.buildFallbackAnalysis(
        incident,
        "GEMINI_UNCONFIGURED",
        "Automated AI triage skipped: GEMINI_API_KEY is not configured in the active environment. Coordinator manual triage is required.",
        modelId,
        0
      );
    }

    try {
      const activeClient = options.client || this.client || getGeminiClient(options.apiKey);

      // 1. Prepare Prompt & Multimodal Parts
      const userTextPrompt = buildTriageUserPrompt(incident);
      const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: userTextPrompt },
      ];

      // 2. Attach photographic evidence if available
      for (const ev of incident.evidence) {
        if (ev.type === "image" && ev.url) {
          const imagePart = this.extractImagePart(ev.url);
          if (imagePart) {
            contentParts.push(imagePart);
            break; // Evaluate primary photo to adhere to token constraints
          }
        }
      }

      // 3. Execute with Timeout Deadline
      const apiPromise = activeClient.models.generateContent({
        model: modelId,
        contents: contentParts as never,
        config: {
          systemInstruction: GEMINI_TRIAGE_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.2, // Conservative, low-hallucination factual extraction
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new GeminiTimeoutError(`Triage timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const response = await Promise.race([apiPromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      // 4. Extract and Parse Raw Response
      const responseText = response.text || "";
      if (!responseText.trim()) {
        throw new GeminiUnavailableError("Gemini returned an empty text response.");
      }

      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(responseText);
      } catch {
        throw new GeminiValidationError("Model response is not valid JSON.", [responseText]);
      }

      // 5. Strict Zod Schema Validation
      const parseResult = GeminiTriageOutputSchema.safeParse(parsedRaw);
      if (!parseResult.success) {
        logger.warn("Gemini output failed schema validation", "GEMINI_TRIAGE", {
          errors: parseResult.error.issues,
        });
        throw new GeminiValidationError(
          "Gemini output failed schema validation.",
          parseResult.error.issues
        );
      }

      const validatedOutput: GeminiTriageOutput = parseResult.data;

      logger.info("Gemini multimodal triage completed successfully", "GEMINI_TRIAGE", {
        public_reference: incident.public_reference,
        category: validatedOutput.incident_category,
        urgency: validatedOutput.urgency_recommendation.level,
        latency_ms: latencyMs,
      });

      // 6. Assemble Full IncidentTriageAnalysis Document
      return {
        analysis_id: crypto.randomUUID(),
        incident_id: incident._id,
        model_id: modelId,
        prompt_version: TRIAGE_PROMPT_VERSION,
        category_recommendation: validatedOutput.incident_category,
        subject_type: validatedOutput.subject_type,
        observable_evidence: validatedOutput.observable_evidence,
        possible_assistance: validatedOutput.possible_assistance,
        urgency: {
          level: validatedOutput.urgency_recommendation.level,
          reasoning: validatedOutput.urgency_recommendation.reasoning,
          requires_human_review: true,
        },
        location_candidates: validatedOutput.location_candidates,
        missing_information: validatedOutput.missing_information,
        limitations: validatedOutput.limitations,
        confidence: this.computeAggregatedConfidence(validatedOutput),
        analysis_status: "SUCCESS",
        raw_response_summary: `Analyzed via ${modelId} in ${latencyMs}ms. Recommended ${validatedOutput.urgency_recommendation.level} triage.`,
        created_at: new Date().toISOString(),
        human_review_status: "PENDING",
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : "Unknown Gemini error";

      logger.error("Gemini triage encountered an error; activating fail-soft review fallback", err, "GEMINI_TRIAGE", {
        public_reference: incident.public_reference,
        duration_ms: latencyMs,
      });

      return this.buildFallbackAnalysis(
        incident,
        this.classifyErrorCode(err),
        `Automated AI triage failed: ${errorMsg}. Incident is queued for human coordinator review.`,
        modelId,
        latencyMs
      );
    }
  }

  /**
   * Helper to parse data URI or base64 image strings into Gemini inlineData part.
   */
  private extractImagePart(url: string): { inlineData: { mimeType: string; data: string } } | null {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        };
      }
    }
    return null;
  }

  /**
   * Computes an aggregate confidence score from evidence observations.
   */
  private computeAggregatedConfidence(output: GeminiTriageOutput): number {
    if (!output.observable_evidence || output.observable_evidence.length === 0) {
      return 0.5; // Default uncalibrated baseline
    }
    const sum = output.observable_evidence.reduce((acc, ev) => acc + ev.confidence, 0);
    return Math.round((sum / output.observable_evidence.length) * 100) / 100;
  }

  /**
   * Classify error types for clean audit logging.
   */
  private classifyErrorCode(err: unknown): string {
    if (err instanceof GeminiConfigError) return "CONFIG_ERROR";
    if (err instanceof GeminiQuotaError) return "QUOTA_EXCEEDED";
    if (err instanceof GeminiTimeoutError) return "TIMEOUT";
    if (err instanceof GeminiValidationError) return "VALIDATION_FAILED";
    if (err instanceof GeminiUnavailableError) return "SERVICE_UNAVAILABLE";
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) return "QUOTA_EXCEEDED";
    if (msg.toLowerCase().includes("timeout")) return "TIMEOUT";
    return "UNKNOWN_ERROR";
  }

  /**
   * Constructs a safe, fail-closed MANUAL_REVIEW_REQUIRED fallback analysis.
   */
  private buildFallbackAnalysis(
    incident: IncidentDocument,
    errorCode: string,
    reason: string,
    modelId: string,
    latencyMs: number
  ): IncidentTriageAnalysis {
    return {
      analysis_id: crypto.randomUUID(),
      incident_id: incident._id,
      model_id: modelId,
      prompt_version: TRIAGE_PROMPT_VERSION,
      category_recommendation: incident.incident_type,
      subject_type: incident.subject_type,
      observable_evidence: [],
      possible_assistance: ["manual_coordinator_assessment"],
      urgency: {
        level: incident.severity?.level === "critical" ? "urgent" : "unconfirmed",
        reasoning: [reason],
        requires_human_review: true,
      },
      location_candidates: incident.location.address ? [incident.location.address] : [],
      missing_information: [
        "Human review required to verify distress situation and determine assistance pathway.",
      ],
      limitations: [
        "Automated AI multimodal triage was unavailable or encountered an error. This assessment relies solely on original citizen report fields.",
      ],
      confidence: 0.0,
      analysis_status: "MANUAL_REVIEW_REQUIRED",
      raw_response_summary: `Fallback activated (${errorCode}) in ${latencyMs}ms.`,
      created_at: new Date().toISOString(),
      human_review_status: "PENDING",
      human_reviewer_notes: reason,
    };
  }
}
