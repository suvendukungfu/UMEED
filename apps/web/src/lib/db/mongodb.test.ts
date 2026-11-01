import { describe, it, expect, beforeEach } from "vitest";
import {
  checkDatabaseReadiness,
  getMongoClientPromise,
  isMongoConfigured,
  classifyDatabaseError,
  verifyDatabaseConnectivity,
} from "./mongodb";
import { resetEnvCache } from "@/lib/config/env";

describe("MongoDB Connection Abstraction & Error Classification", () => {
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
    expect(status.diagnosticCode).toBe("DATABASE_CONFIGURATION_FAILURE");
    expect(status.error).toContain("MONGODB_URI is not configured");
  });

  it("checkDatabaseReadiness catches placeholder template credentials safely without attempting network connection", async () => {
    process.env.MONGODB_URI = "mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority";
    resetEnvCache();

    const status = await checkDatabaseReadiness();
    expect(status.configured).toBe(false);
    expect(status.connected).toBe(false);
    expect(status.diagnosticCode).toBe("DATABASE_CONFIGURATION_FAILURE");
    expect(status.error).toContain("placeholder");
  });

  describe("classifyDatabaseError diagnostic precision", () => {
    it("classifies DNS resolution errors", () => {
      const err = new Error("getaddrinfo ENOTFOUND ac-suutx6m-shard-00-00.lhqnclv.mongodb.net");
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("DNS_RESOLUTION_FAILURE");
    });

    it("classifies SRV lookup errors", () => {
      const err = new Error("querySrv ENODATA _mongodb._tcp.cluster0.mongodb.net");
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("SRV_LOOKUP_FAILURE");
    });

    it("classifies SSL alert 80 as NETWORK_ACCESS_DENIED", () => {
      const err = new Error("SSL routines:ssl3_read_bytes:tlsv1 alert internal error:ssl/record/rec_layer_s3.c:923:SSL alert number 80");
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("NETWORK_ACCESS_DENIED");
      expect(result.safeSummary).toContain("Atlas Network Access firewall");
    });

    it("classifies TLS certificate expiration or verification errors", () => {
      const err = new Error("CERT_HAS_EXPIRED: certificate has expired");
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("TLS_CERTIFICATE_FAILURE");
    });

    it("classifies TCP connection refused or timeout errors", () => {
      const err = new Error("connect ECONNREFUSED 159.41.196.19:27017");
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("TCP_CONNECTION_FAILURE");
    });

    it("classifies authentication failures (code 18 / bad auth)", () => {
      const err = Object.assign(new Error("Authentication failed."), { code: 18 });
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("AUTHENTICATION_FAILURE");
    });

    it("classifies database authorization/permission denied (code 13)", () => {
      const err = Object.assign(new Error("not authorized on umeed_db to execute command"), { code: 13 });
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("DATABASE_PERMISSION_FAILURE");
    });

    it("classifies server selection timeout", () => {
      const err = new Error("Server selection timed out after 5000 ms");
      const result = classifyDatabaseError(err);
      expect(result.code).toBe("CLUSTER_UNAVAILABLE");
    });
  });

  describe("verifyDatabaseConnectivity non-destructive probe", () => {
    it("reports clean diagnostic failure when database is unconfigured", async () => {
      const result = await verifyDatabaseConnectivity();
      expect(result.pingOk).toBe(false);
      expect(result.writeOk).toBe(false);
      expect(result.diagnosticCollection).toBe("_system_healthchecks");
      expect(result.diagnosticCode).toBeDefined();
    });
  });
});

