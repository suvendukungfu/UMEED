import { MekoValidationError } from "./errors";

/**
 * Whitelist of allowed Meko MCP tools for UMEED operations.
 * Arbitrary tool execution is strictly prohibited.
 */
export const ALLOWED_MEKO_TOOLS = [
  "memory_add",
  "memory_search",
  "memory_get_by_id",
  "memory_get_all",
  "memory_update",
  "memory_delete_by_id",
  "memory_promote",
  "datapack_search",
  "datapack_list",
  "knowledgebase_search",
] as const;

export type AllowedMekoTool = (typeof ALLOWED_MEKO_TOOLS)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_MEKO_TOOLS);

export function isToolAllowed(toolName: string): toolName is AllowedMekoTool {
  return ALLOWED_SET.has(toolName);
}

export function assertToolAllowed(toolName: string): asserts toolName is AllowedMekoTool {
  if (!isToolAllowed(toolName)) {
    throw new MekoValidationError(
      `Tool '${toolName}' is not in the approved UMEED Meko tool catalog. Allowed: [${ALLOWED_MEKO_TOOLS.join(", ")}]`
    );
  }
}

/**
 * Sanitizes tool arguments by removing undefined or null properties and trimming strings.
 */
export function sanitizeToolArguments(args: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      cleaned[key] = value.trim();
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

