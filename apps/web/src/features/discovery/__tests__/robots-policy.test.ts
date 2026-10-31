import { describe, it, expect } from "vitest";
import { RobotsPolicyService } from "../crawler/robots-service";

describe("Phase 11: Robots.txt RFC 9309 Compliance Service", () => {
  const service = new RobotsPolicyService();

  it("parses specific UMEED-DiscoveryBot directives over generic directives", () => {
    const robotsTxt = `
User-agent: *
Disallow: /private/
Allow: /public/
Crawl-delay: 5

User-agent: UMEED-DiscoveryBot
Disallow: /restricted-bot/
Allow: /public/
Allow: /private/humanitarian-alerts/
Crawl-delay: 2
`;

    const parsed = service.parseRobotsTxt(robotsTxt);
    expect(parsed.crawlDelaySeconds).toBe(2);
    expect(parsed.allowedPaths).toContain("/private/humanitarian-alerts/");
    expect(parsed.disallowedPaths).toContain("/restricted-bot/");
  });

  it("correctly identifies allowed and disallowed paths", () => {
    const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /internal/
Allow: /public/
Allow: /admin/public-reports/
`;

    const parsed = service.parseRobotsTxt(robotsTxt);

    // /admin/public-reports/ is explicitly allowed
    const isAllowedReport = parsed.allowedPaths.some((p) =>
      "/admin/public-reports/case1".startsWith(p)
    );
    expect(isAllowedReport).toBe(true);

    // /internal/secret is disallowed
    const isDisallowedSecret = parsed.disallowedPaths.some((p) =>
      "/internal/secret".startsWith(p)
    );
    expect(isDisallowedSecret).toBe(true);
  });
});
