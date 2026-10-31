import { z } from "zod";

/**
 * Server-side Environment Configuration Schema.
 * Integration credentials are typed and marked optional so the application shell
 * and health endpoints start reliably even before external APIs are configured.
 */
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Database (MongoDB Atlas)
  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().default("umeed_db"),

  // AI Multimodal Triage (Google Gemini) - Phase 3
  GEMINI_API_KEY: z.string().optional(),

  // Coordination Memory (Meko) - Phase 6
  MEKO_API_KEY: z.string().optional(),
  MEKO_DATAPACK_ID: z.string().optional(),

  // Impact Analytics (IOMETE) - Phase 7
  IOMETE_PAT: z.string().optional(),
  IOMETE_EVENT_STREAM_URL: z.string().url().optional(),

  // Discovery Crawler Service - Phase 8
  DISCOVERY_SERVICE_URL: z.string().url().optional(),
  CRAWLER_API_KEY: z.string().optional().default("umeed-crawler-dev-key"),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let parsedEnv: ServerEnv | null = null;

/**
 * Safely parse and retrieve server environment variables.
 * Throws a descriptive configuration error only if fundamental runtime variables are invalid.
 */
export function getServerEnv(): ServerEnv {
  if (parsedEnv) {
    return parsedEnv;
  }

  const result = ServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `[Config] ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment configuration:\n${formattedErrors}`);
  }

  parsedEnv = result.data;
  return parsedEnv;
}

/**
 * Helper to assert that a specific integration has its required credentials set.
 * Call this inside the integration adapter (e.g. Gemini, Meko, IOMETE) when invoked.
 */
export function requireIntegrationConfig<K extends keyof ServerEnv>(
  keys: K[],
  integrationName: string
): Pick<ServerEnv, K> {
  const env = getServerEnv();
  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Integration "${integrationName}" cannot run: Missing required configuration keys: [${missing.join(", ")}]. ` +
      `Please configure these in .env.local without committing secrets.`
    );
  }

  return env as Pick<ServerEnv, K>;
}

/**
 * Reset parsed environment cache (primarily for automated testing).
 */
export function resetEnvCache(): void {
  parsedEnv = null;
}

