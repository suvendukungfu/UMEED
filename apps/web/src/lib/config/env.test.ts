import { describe, it, expect, beforeEach } from "vitest";
import {
  getServerEnv,
  requireIntegrationConfig,
  resetEnvCache,
  isPlaceholderValue,
  getEffectiveCoordinatorKey,
  getEffectiveCrawlerKey,
  DEV_DEFAULT_COORDINATOR_KEY,
  DEV_DEFAULT_CRAWLER_KEY,
} from "./env";

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

  it("converts empty string environment variables to undefined", () => {
    process.env.MONGODB_URI = "";
    process.env.GEMINI_API_KEY = "   ";

    const env = getServerEnv();
    expect(env.MONGODB_URI).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });

  it("identifies placeholder credentials and template variables", () => {
    expect(isPlaceholderValue("mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true")).toBe(true);
    expect(isPlaceholderValue("your_gemini_api_key_placeholder")).toBe(true);
    expect(isPlaceholderValue("AIzaSyDummyRealKey12345")).toBe(false);
    expect(isPlaceholderValue("mongodb+srv://realuser:realpass@mycluster.net")).toBe(false);
    expect(isPlaceholderValue("")).toBe(false);
    expect(isPlaceholderValue(undefined)).toBe(false);
  });

  it("allows setting MONGODB_URI and MONGODB_DB", () => {
    process.env.MONGODB_URI = "mongodb+srv://test:pass@cluster.mongodb.net";
    process.env.MONGODB_DB = "custom_db";

    const env = getServerEnv();
    expect(env.MONGODB_URI).toBe("mongodb+srv://test:pass@cluster.mongodb.net");
    expect(env.MONGODB_DB).toBe("custom_db");
  });

  it("preserves separate MEKO_PRODUCT_DATAPACK_ID and MEKO_BUILD_DATAPACK_ID without mixing", () => {
    process.env.MEKO_PRODUCT_DATAPACK_ID = "5c3fe678-a090-48da-b1f5-22b33bd58ad5";
    process.env.MEKO_BUILD_DATAPACK_ID = "7043a2a0-e19a-42aa-b222-b82680705ade";

    const env = getServerEnv();
    expect(env.MEKO_PRODUCT_DATAPACK_ID).toBe("5c3fe678-a090-48da-b1f5-22b33bd58ad5");
    expect(env.MEKO_BUILD_DATAPACK_ID).toBe("7043a2a0-e19a-42aa-b222-b82680705ade");
    expect(env.MEKO_PRODUCT_DATAPACK_ID).not.toBe(env.MEKO_BUILD_DATAPACK_ID);
  });

  it("supports all 13 standard environment variables", () => {
    (process.env as any).NODE_ENV = "development";
    process.env.PORT = "3000";
    process.env.MONGODB_URI = "mongodb+srv://test:mock@atlas.test";
    process.env.MONGODB_DB = "umeed_dev";
    process.env.COORDINATOR_API_KEY = "mock_coord_key";
    process.env.CRAWLER_API_KEY = "mock_crawler_key";
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    process.env.MEKO_API_KEY = "mock_meko_key";
    process.env.MEKO_PRODUCT_DATAPACK_ID = "5c3fe678-a090-48da-b1f5-22b33bd58ad5";
    process.env.MEKO_BUILD_DATAPACK_ID = "7043a2a0-e19a-42aa-b222-b82680705ade";
    process.env.IOMETE_PAT = "mock_iomete_pat";
    process.env.IOMETE_EVENT_STREAM_URL = "https://events.example.com/stream";
    process.env.DISCOVERY_SERVICE_URL = "https://crawler.example.com";

    const env = getServerEnv();
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.MONGODB_URI).toBe("mongodb+srv://test:mock@atlas.test");
    expect(env.MONGODB_DB).toBe("umeed_dev");
    expect(env.COORDINATOR_API_KEY).toBe("mock_coord_key");
    expect(env.CRAWLER_API_KEY).toBe("mock_crawler_key");
    expect(env.GEMINI_API_KEY).toBe("mock_gemini_key");
    expect(env.MEKO_API_KEY).toBe("mock_meko_key");
    expect(env.MEKO_PRODUCT_DATAPACK_ID).toBe("5c3fe678-a090-48da-b1f5-22b33bd58ad5");
    expect(env.MEKO_BUILD_DATAPACK_ID).toBe("7043a2a0-e19a-42aa-b222-b82680705ade");
    expect(env.IOMETE_PAT).toBe("mock_iomete_pat");
    expect(env.IOMETE_EVENT_STREAM_URL).toBe("https://events.example.com/stream");
    expect(env.DISCOVERY_SERVICE_URL).toBe("https://crawler.example.com");
  });

  it("handles effective coordinator key for development vs production", () => {
    // Development fallback
    (process.env as any).NODE_ENV = "development";
    delete process.env.COORDINATOR_API_KEY;
    const devEnv = getServerEnv();
    expect(getEffectiveCoordinatorKey(devEnv)).toBe(DEV_DEFAULT_COORDINATOR_KEY);

    // Production with valid key
    resetEnvCache();
    (process.env as any).NODE_ENV = "production";
    process.env.COORDINATOR_API_KEY = "secure_production_coord_key_98765";
    const prodEnv = getServerEnv();
    expect(getEffectiveCoordinatorKey(prodEnv)).toBe("secure_production_coord_key_98765");

    // Production with insecure placeholder rejects
    resetEnvCache();
    (process.env as any).NODE_ENV = "production";
    process.env.COORDINATOR_API_KEY = "admin";
    const insecureProdEnv = getServerEnv();
    expect(getEffectiveCoordinatorKey(insecureProdEnv)).toBeNull();
  });

  it("handles effective crawler key for development vs production", () => {
    (process.env as any).NODE_ENV = "development";
    delete process.env.CRAWLER_API_KEY;
    const devEnv = getServerEnv();
    expect(getEffectiveCrawlerKey(devEnv)).toBe(DEV_DEFAULT_CRAWLER_KEY);
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
