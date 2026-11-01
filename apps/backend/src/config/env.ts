import { z } from "zod";

const emptyToUndefined = z.preprocess((val) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val;
}, z.string().optional());

export const BackendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  FLY_REGION: z.string().default("bom"),

  // Primary Storage (MongoDB Atlas)
  MONGODB_URI: emptyToUndefined,
  MONGODB_DB: z.string().default("umeed_db"),

  // BFF Proxy Inter-Service Authentication (Vercel <-> Fly.io)
  UMEED_PROXY_SIGNING_SECRET: emptyToUndefined,

  // External Providers
  GEMINI_API_KEY: emptyToUndefined,
  COORDINATOR_API_KEY: emptyToUndefined,
  CRAWLER_API_KEY: emptyToUndefined,
});

export type BackendEnv = z.infer<typeof BackendEnvSchema>;

let cachedEnv: BackendEnv | null = null;

export function resetBackendEnvCache(): void {
  cachedEnv = null;
}

export function getBackendEnv(): BackendEnv {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return BackendEnvSchema.parse(process.env);
  }
  if (cachedEnv) return cachedEnv;
  cachedEnv = BackendEnvSchema.parse(process.env);
  return cachedEnv;
}

