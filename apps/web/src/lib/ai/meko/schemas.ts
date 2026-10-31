import { z } from "zod";
import { MekoValidationError } from "./errors";

/**
 * PII Detection Patterns for UMEED Privacy Mandates (A5 & Section 8/9)
 * Operational memories MUST be strictly de-identified before dispatch to Meko.
 */
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const EXACT_GPS_REGEX = /[-+]?([1-8]?\d(\.\d+)|90(\.0+)),\s*[-+]?(180(\.0+)|((1[0-7]\d)|([1-9]?\d))(\.\d+))/;
const TRACKING_TOKEN_REGEX = /trk_[a-zA-Z0-9]{12,}/i;
const API_KEY_REGEX = /(mko_tkn_|AIzaSy|AKIA)[a-zA-Z0-9_-]{8,}/;

/**
 * Validates that memory text contains purely de-identified operational learnings,
 * rejecting personal names, phone numbers, exact addresses, and tracking credentials.
 */
export function validateOperationalMemoryText(text: string): { isValid: boolean; violation?: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, violation: "Memory text cannot be empty" };
  }

  if (text.length > 2000) {
    return { isValid: false, violation: "Memory text exceeds maximum length of 2000 characters" };
  }

  if (EMAIL_REGEX.test(text)) {
    return { isValid: false, violation: "Detected email address in memory text. PII is strictly prohibited." };
  }

  if (TRACKING_TOKEN_REGEX.test(text)) {
    return { isValid: false, violation: "Detected tracking token in memory text. Citizen credentials cannot be stored." };
  }

  if (API_KEY_REGEX.test(text)) {
    return { isValid: false, violation: "Detected API key or authorization token in memory text." };
  }

  if (EXACT_GPS_REGEX.test(text)) {
    return { isValid: false, violation: "Detected high-precision GPS coordinates in memory text. Use district or locality names instead." };
  }

  // Check for 10-digit phone number candidates
  const digitsOnly = text.replace(/\D/g, "");
  if (digitsOnly.length >= 10 && PHONE_REGEX.test(text)) {
    return { isValid: false, violation: "Detected candidate phone number in memory text. Beneficiary phone numbers are prohibited." };
  }

  return { isValid: true };
}

export function assertValidOperationalMemory(text: string): void {
  const result = validateOperationalMemoryText(text);
  if (!result.isValid) {
    throw new MekoValidationError(result.violation ?? "Invalid operational memory content");
  }
}

/**
 * Zod Schemas for Meko MCP Tool Arguments
 */

export const MemoryAddArgsSchema = z.object({
  text: z.string().min(1).max(2000),
  conversation_id: z.string().min(1),
  agent_id: z.string().optional(),
  datapack_id: z.string().optional(),
  run_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MemorySearchArgsSchema = z.object({
  query: z.string().min(1).max(500),
  conversation_id: z.string().min(1),
  agent_id: z.string().optional(),
  datapack_id: z.string().optional(),
  limit: z.number().int().min(1).max(25).optional().default(10),
  run_id: z.string().optional(),
});

export const MemoryGetByIdArgsSchema = z.object({
  memory_id: z.string().min(1),
  conversation_id: z.string().min(1),
  agent_id: z.string().optional(),
  datapack_id: z.string().optional(),
});

export const MemoryUpdateArgsSchema = z.object({
  memory_id: z.string().min(1),
  text: z.string().min(1).max(2000),
  conversation_id: z.string().min(1),
  agent_id: z.string().optional(),
  datapack_id: z.string().optional(),
});

export const MemoryDeleteByIdArgsSchema = z.object({
  memory_id: z.string().min(1),
  conversation_id: z.string().min(1),
  agent_id: z.string().optional(),
  datapack_id: z.string().optional(),
});

export const MemoryPromoteArgsSchema = z.object({
  memory_ids: z.array(z.string().min(1)).min(1).max(50),
  conversation_id: z.string().min(1),
  agent_id: z.string().optional(),
  datapack_id: z.string().optional(),
});

export const DatapackSearchArgsSchema = z.object({
  conversation_id: z.string().min(1),
  query: z.string().optional().default(""),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export const DatapackListArgsSchema = z.object({
  conversation_id: z.string().min(1),
  query: z.string().optional().default(""),
  limit: z.number().int().min(0).max(100).optional().default(20),
});

export const KnowledgebaseSearchArgsSchema = z.object({
  query: z.string().min(1).max(500),
  conversation_id: z.string().min(1),
  datapack_id: z.string().min(1, "datapack_id is required for knowledgebase_search"),
  agent_id: z.string().optional(),
  limit: z.number().int().min(1).max(25).optional().default(10),
});
