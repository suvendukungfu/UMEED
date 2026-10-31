/**
 * Verified Official Google Gemini Models
 *
 * References:
 * - Official Google GenAI SDK: @google/genai
 * - Gemini 2.5 Flash: Primary multimodal model for fast, low-latency distress triage
 * - Gemini 1.5 Flash: Stable fallback multimodal model
 * - Gemini 2.5 Pro: High-capacity multimodal model for complex multimodal forensics
 */

export const GEMINI_MODELS = {
  // Primary multimodal triage model (Default)
  FLASH: "gemini-2.5-flash",
  // Stable multimodal fallback
  FLASH_1_5: "gemini-1.5-flash",
  // Complex forensic reasoning
  PRO: "gemini-2.5-pro",
} as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

export const DEFAULT_GEMINI_MODEL: GeminiModelId = GEMINI_MODELS.FLASH;

/**
 * Validates whether a provided model string is an approved Gemini model.
 */
export function isSupportedGeminiModel(modelId: string): modelId is GeminiModelId {
  return Object.values(GEMINI_MODELS).includes(modelId as GeminiModelId);
}
