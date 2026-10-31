import { describe, it, expect, beforeEach } from "vitest";
import { getServerEnv, requireIntegrationConfig, resetEnvCache } from "./env";

describe("Server Environment Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEnvCache();
  });

  it("loads default development environment with optional keys omitted", () => {
    delete process.env.MONGODB_URI;
    delete process.env.GEMINI_API_KEY;

    const env = getServerEnv();
    expect(env.NODE_ENV).toBeDefined();
    expect(env.PORT).toBe(3000);
    expect(env.MONGODB_URI).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });

  it("allows setting MONGODB_URI and MONGODB_DB", () => {
    process.env.MONGODB_URI = "mongodb+srv://test:pass@cluster.mongodb.net";
    process.env.MONGODB_DB = "custom_db";

    const env = getServerEnv();
    expect(env.MONGODB_URI).toBe("mongodb+srv://test:pass@cluster.mongodb.net");
    expect(env.MONGODB_DB).toBe("custom_db");
  });

  it("requireIntegrationConfig throws descriptive error when requested keys are missing", () => {
    delete process.env.GEMINI_API_KEY;

    expect(() => {
      requireIntegrationConfig(["GEMINI_API_KEY"], "Gemini AI");
    }).toThrow(/Missing required configuration keys: \[GEMINI_API_KEY\]/);
  });

  it("requireIntegrationConfig succeeds when requested keys are present", () => {
    process.env.GEMINI_API_KEY = "test_gemini_key_12345";

    const config = requireIntegrationConfig(["GEMINI_API_KEY"], "Gemini AI");
    expect(config.GEMINI_API_KEY).toBe("test_gemini_key_12345");
  });
});

