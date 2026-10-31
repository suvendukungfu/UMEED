import { describe, it, expect, beforeEach } from "vitest";
import { checkDatabaseReadiness, getMongoClientPromise } from "./mongodb";
import { resetEnvCache } from "@/lib/config/env";

describe("MongoDB Connection Abstraction", () => {
  beforeEach(() => {
    delete process.env.MONGODB_URI;
    resetEnvCache();
  });

  it("returns null client promise when MONGODB_URI is not set", () => {
    const promise = getMongoClientPromise();
    expect(promise).toBeNull();
  });

  it("checkDatabaseReadiness reports unconfigured safely without throwing", async () => {
    const status = await checkDatabaseReadiness();
    expect(status.configured).toBe(false);
    expect(status.connected).toBe(false);
    expect(status.error).toContain("MONGODB_URI is not configured");
  });
});

