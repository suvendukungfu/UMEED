import { validateCrawlerUrl } from "./ssrf-guard";

/**
 * RFC 9309 Compliant Robots.txt Policy Service
 *
 * Crawler Identity: UMEED-DiscoveryBot/1.0 (+https://umeed.org/bot; humanitarian-coordination)
 */

export const CRAWLER_USER_AGENT = "UMEED-DiscoveryBot/1.0 (+https://umeed.org/bot; humanitarian-coordination)";
export const CRAWLER_BOT_NAME = "UMEED-DiscoveryBot";

interface CachedRule {
  allowedPaths: string[];
  disallowedPaths: string[];
  crawlDelaySeconds: number;
  expiresAt: number;
}

export class RobotsPolicyService {
  private cache = new Map<string, CachedRule>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Evaluates if crawling targetUrl is permitted by the source domain's robots.txt.
   */
  async isAllowed(targetUrl: string): Promise<{ allowed: boolean; reason: string; crawlDelay?: number }> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return { allowed: false, reason: "Malformed URL" };
    }

    const origin = parsedUrl.origin;
    const pathname = parsedUrl.pathname || "/";

    // 1. Check cached rule
    const cached = this.cache.get(origin);
    if (cached && Date.now() < cached.expiresAt) {
      return this.evaluateRules(pathname, cached);
    }

    // 2. Fetch and parse robots.txt
    const robotsUrl = `${origin}/robots.txt`;
    const ssrfCheck = await validateCrawlerUrl(robotsUrl);
    if (!ssrfCheck.valid) {
      return { allowed: false, reason: `Robots.txt SSRF check failed: ${ssrfCheck.reason}` };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": CRAWLER_USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // 404 or 410 means no restrictions
      if (res.status === 404 || res.status === 410) {
        const rule: CachedRule = {
          allowedPaths: [],
          disallowedPaths: [],
          crawlDelaySeconds: 1,
          expiresAt: Date.now() + this.CACHE_TTL_MS,
        };
        this.cache.set(origin, rule);
        return { allowed: true, reason: `No robots.txt found (HTTP ${res.status}); access permitted` };
      }

      // 5xx means server error -> RFC 9309 section 2.3.1.2: Fail closed / temporarily unreachable
      if (res.status >= 500) {
        return { allowed: false, reason: `Robots.txt returned server error HTTP ${res.status}; failing closed` };
      }

      if (!res.ok) {
        return { allowed: false, reason: `Robots.txt returned HTTP ${res.status}; access deferred` };
      }

      const text = await res.text();
      const parsedRules = this.parseRobotsTxt(text);
      this.cache.set(origin, {
        ...parsedRules,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return this.evaluateRules(pathname, parsedRules);
    } catch (err) {
      // Network failure on fetching robots.txt -> fail closed
      return {
        allowed: false,
        reason: `Robots.txt unreachable due to network/timeout error: ${(err as Error).message}. Fail closed.`,
      };
    }
  }

  /**
   * Parses robots.txt text according to RFC 9309 groups.
   */
  parseRobotsTxt(content: string): Omit<CachedRule, "expiresAt"> {
    const lines = content.split(/\r?\n/);
    let currentAgents: string[] = [];
    let isMatchingGroup = false;

    const specificAllowed: string[] = [];
    const specificDisallowed: string[] = [];
    let specificDelay = 1;

    const genericAllowed: string[] = [];
    const genericDisallowed: string[] = [];
    let genericDelay = 1;

    for (const rawLine of lines) {
      const line = rawLine.split("#")[0].trim();
      if (!line) continue;

      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const field = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (field === "user-agent") {
        currentAgents.push(value.toLowerCase());
        isMatchingGroup =
          currentAgents.some((a) => a === "*" || a.includes(CRAWLER_BOT_NAME.toLowerCase()));
      } else if (isMatchingGroup) {
        const isBotSpecific = currentAgents.some((a) => a.includes(CRAWLER_BOT_NAME.toLowerCase()));
        if (field === "disallow" && value) {
          if (isBotSpecific) specificDisallowed.push(value);
          else genericDisallowed.push(value);
        } else if (field === "allow" && value) {
          if (isBotSpecific) specificAllowed.push(value);
          else genericAllowed.push(value);
        } else if (field === "crawl-delay") {
          const delay = parseInt(value, 10);
          if (!isNaN(delay)) {
            if (isBotSpecific) specificDelay = delay;
            else genericDelay = delay;
          }
        }
      }
    }

    // Prefer specific bot rules over generic '*' rules
    const hasSpecific = specificAllowed.length > 0 || specificDisallowed.length > 0;
    return {
      allowedPaths: hasSpecific ? specificAllowed : genericAllowed,
      disallowedPaths: hasSpecific ? specificDisallowed : genericDisallowed,
      crawlDelaySeconds: hasSpecific ? specificDelay : genericDelay,
    };
  }

  private evaluateRules(pathname: string, rule: Omit<CachedRule, "expiresAt">): { allowed: boolean; reason: string; crawlDelay?: number } {
    // 1. Check explicit allows first
    for (const allowed of rule.allowedPaths) {
      if (pathname.startsWith(allowed)) {
        return { allowed: true, reason: `Explicitly allowed by rule '${allowed}'`, crawlDelay: rule.crawlDelaySeconds };
      }
    }

    // 2. Check explicit disallows
    for (const disallowed of rule.disallowedPaths) {
      if (disallowed === "/" || pathname.startsWith(disallowed)) {
        return { allowed: false, reason: `Disallowed by robots.txt directive '${disallowed}'`, crawlDelay: rule.crawlDelaySeconds };
      }
    }

    return { allowed: true, reason: "No matching disallow directive found; permitted", crawlDelay: rule.crawlDelaySeconds };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const robotsPolicyService = new RobotsPolicyService();

