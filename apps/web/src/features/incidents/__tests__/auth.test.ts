import { describe, it, expect } from "vitest";
import { validateCrawlerAuthorization } from "../services/auth.service";

describe("Crawler Authentication Service (Test 22)", () => {
  it("authorizes valid X-Crawler-API-Key header", () => {
    const headers = new Headers();
    headers.set("x-crawler-api-key", "umeed-crawler-dev-key");

    const result = validateCrawlerAuthorization(headers);
    expect(result.authorized).toBe(true);
  });

  it("authorizes valid Bearer Authorization header", () => {
    const headers = new Headers();
    headers.set("authorization", "Bearer umeed-crawler-dev-key");

    const result = validateCrawlerAuthorization(headers);
    expect(result.authorized).toBe(true);
  });

  it("rejects missing crawler authorization header", () => {
    const headers = new Headers();
    const result = validateCrawlerAuthorization(headers);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("Missing crawler authorization header");
  });

  it("rejects invalid crawler authorization key", () => {
    const headers = new Headers();
    headers.set("x-crawler-api-key", "wrong-secret-token");

    const result = validateCrawlerAuthorization(headers);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain("Invalid crawler authorization credential");
  });
});
