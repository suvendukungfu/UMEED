import { GoogleGenAI } from "@google/genai";
import { getServerEnv, isPlaceholderValue } from "@/lib/config/env";
import { GeminiConfigError } from "./errors";

/**
 * Global cached GoogleGenAI instance for server runtime.
 */
let cachedClient: GoogleGenAI | null = null;

/**
 * Retrieve or initialize the official Google GenAI SDK client.
 *
 * Safety & Privacy Guarantees:
 * - Credentials remain strictly on the server; never exposed to browser or logs.
 * - Detects and rejects template placeholder keys (e.g. your_gemini_api_key_placeholder).
 * - Fails cleanly with GeminiConfigError rather than crashing unhandled.
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  if (customApiKey) {
    if (isPlaceholderValue(customApiKey)) {
      throw new GeminiConfigError("Provided custom Gemini API key is an unconfigured placeholder.");
    }
    return new GoogleGenAI({ apiKey: customApiKey });
  }

  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey || isPlaceholderValue(apiKey)) {
    throw new GeminiConfigError(
      "GEMINI_API_KEY is not configured in .env.local. Please supply an authentic API key from Google AI Studio."
    );
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/**
 * Check whether Gemini AI is configured with a plausible authentic API key.
 * Never throws; safe for readiness and status checks.
 */
export function isGeminiConfigured(customApiKey?: string): boolean {
  if (customApiKey) {
    return !isPlaceholderValue(customApiKey) && customApiKey.trim().length > 10;
  }

  try {
    const env = getServerEnv();
    const key = env.GEMINI_API_KEY;
    if (!key || isPlaceholderValue(key)) return false;
    return key.trim().length > 10;
  } catch {
    return false;
  }
}

/**
 * Reset cached client singleton (used by test suites).
 */
export function resetGeminiClientCache(): void {
  cachedClient = null;
}
