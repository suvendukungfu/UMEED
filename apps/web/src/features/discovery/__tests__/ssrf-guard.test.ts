import { describe, it, expect } from "vitest";
import {
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  validateCrawlerUrl,
} from "../crawler/ssrf-guard";

describe("Phase 11: SSRF & Network Security Guard", () => {
  it("detects private, loopback, and cloud metadata IPv4 addresses", () => {
    // Loopback
    expect(isPrivateOrReservedIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("127.255.255.255")).toBe(true);

    // RFC 1918 Private
    expect(isPrivateOrReservedIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("10.254.1.99")).toBe(true);
    expect(isPrivateOrReservedIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateOrReservedIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedIPv4("192.168.0.254")).toBe(true);

    // Cloud Metadata / Link-local
    expect(isPrivateOrReservedIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIPv4("169.254.1.1")).toBe(true);

    // Carrier Grade NAT
    expect(isPrivateOrReservedIPv4("100.64.0.1")).toBe(true);

    // Public IPs should NOT be flagged
    expect(isPrivateOrReservedIPv4("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIPv4("1.1.1.1")).toBe(false);
  });

  it("detects loopback and unique local IPv6 addresses", () => {
    expect(isPrivateOrReservedIPv6("::1")).toBe(true);
    expect(isPrivateOrReservedIPv6("0:0:0:0:0:0:0:1")).toBe(true);
    expect(isPrivateOrReservedIPv6("fe80::1")).toBe(true);
    expect(isPrivateOrReservedIPv6("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIPv6("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIPv6("::ffff:10.0.0.1")).toBe(true);
  });

  it("rejects non-HTTP protocols", async () => {
    const fileRes = await validateCrawlerUrl("file:///etc/passwd");
    expect(fileRes.valid).toBe(false);
    expect(fileRes.reason).toContain("Unapproved protocol");

    const ftpRes = await validateCrawlerUrl("ftp://ftp.example.com/data");
    expect(ftpRes.valid).toBe(false);
    expect(ftpRes.reason).toContain("Unapproved protocol");

    const gopherRes = await validateCrawlerUrl("gopher://evil.internal");
    expect(gopherRes.valid).toBe(false);
  });

  it("rejects forbidden hostnames (localhost, internal, cloud metadata)", async () => {
    const localhostRes = await validateCrawlerUrl("http://localhost:3000/api");
    expect(localhostRes.valid).toBe(false);
    expect(localhostRes.reason).toContain("Forbidden hostname");

    const internalRes = await validateCrawlerUrl("http://service.internal/secret");
    expect(internalRes.valid).toBe(false);
    expect(internalRes.reason).toContain("Forbidden hostname");

    const metadataRes = await validateCrawlerUrl("http://metadata.google.internal/computeMetadata/v1");
    expect(metadataRes.valid).toBe(false);
    expect(metadataRes.reason).toContain("Forbidden hostname");
  });

  it("rejects direct private IP access in URLs", async () => {
    const directRes = await validateCrawlerUrl("http://192.168.1.100/admin");
    expect(directRes.valid).toBe(false);
    expect(directRes.reason).toContain("Direct private or link-local IPv4 access forbidden");

    const metadataRes = await validateCrawlerUrl("http://169.254.169.254/latest/meta-data/");
    expect(metadataRes.valid).toBe(false);
  });

  it("accepts valid public domain URL", async () => {
    const validRes = await validateCrawlerUrl("https://data.gov.in/dataset");
    expect(validRes.valid).toBe(true);
    expect(validRes.resolvedIp).toBeDefined();
  });
});
