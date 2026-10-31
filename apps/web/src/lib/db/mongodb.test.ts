import { describe, it, expect, beforeEach } from "vitest";
import { checkDatabaseReadiness, getMongoClientPromise, isMongoConfigured } from "./mongodb";
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

  it("isMongoConfigured correctly differentiates between real URIs and template placeholders", () => {
    expect(isMongoConfigured(undefined)).toBe(false);
    expect(isMongoConfigured("")).toBe(false);
    expect(isMongoConfigured("   ")).toBe(false);
    expect(
      isMongoConfigured("mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority")
    ).toBe(false);
    expect(isMongoConfigured("http://localhost:3000")).toBe(false);
    expect(isMongoConfigured("mongodb+srv://produser:secret123@cluster0.real.mongodb.net/?retryWrites=true")).toBe(true);
    expect(isMongoConfigured("mongodb://localhost:27017/umeed_local")).toBe(true);
  });

  it("returns null client promise when MONGODB_URI contains template placeholder credentials", () => {
    process.env.MONGODB_URI = "mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority";
    resetEnvCache();

    const promise = getMongoClientPromise();
    expect(promise).toBeNull();
  });

  it("checkDatabaseReadiness reports unconfigured safely without throwing", async () => {
    const status = await checkDatabaseReadiness();
    expect(status.configured).toBe(false);
    expect(status.connected).toBe(false);
    expect(status.error).toContain("MONGODB_URI is not configured");
  });

  it("checkDatabaseReadiness catches placeholder template credentials safely without attempting network connection", async () => {
    process.env.MONGODB_URI = "mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority";
    resetEnvCache();

    const status = await checkDatabaseReadiness();
    expect(status.configured).toBe(false);
    expect(status.connected).toBe(false);
    expect(status.error).toContain("placeholder");
  });
});

