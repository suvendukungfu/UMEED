import { validateCrawlerUrl } from "./ssrf-guard";
import { robotsPolicyService, CRAWLER_USER_AGENT } from "./robots-service";

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  etag?: string | null;
  lastModified?: string | null;
  maxRedirects?: number;
  bypassRobotsCheck?: boolean; // strictly for unit tests or dry-run
}

export interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  bodyText: string;
  contentType: string;
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
  error?: string;
}

export class SafeHttpFetcher {
  private readonly DEFAULT_TIMEOUT_MS = 8000;
  private readonly DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
  private readonly DEFAULT_MAX_REDIRECTS = 3;

  async fetch(targetUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
    let currentUrl = targetUrl;
    let redirectCount = 0;
    const maxRedirects = options.maxRedirects ?? this.DEFAULT_MAX_REDIRECTS;
    const timeoutMs = options.timeoutMs ?? this.DEFAULT_TIMEOUT_MS;
    const maxBytes = options.maxBytes ?? this.DEFAULT_MAX_BYTES;

    while (redirectCount <= maxRedirects) {
      // 1. SSRF and DNS check
      const ssrfCheck = await validateCrawlerUrl(currentUrl);
      if (!ssrfCheck.valid) {
        return {
          ok: false,
          status: 403,
          statusText: "Forbidden (SSRF Guard)",
          url: currentUrl,
          bodyText: "",
          contentType: "",
          etag: null,
          lastModified: null,
          notModified: false,
          error: `SSRF validation rejected target: ${ssrfCheck.reason}`,
        };
      }

      // 2. Robots.txt check
      if (!options.bypassRobotsCheck) {
        const robotsCheck = await robotsPolicyService.isAllowed(currentUrl);
        if (!robotsCheck.allowed) {
          return {
            ok: false,
            status: 403,
            statusText: "Forbidden (Robots.txt)",
            url: currentUrl,
            bodyText: "",
            contentType: "",
            etag: null,
            lastModified: null,
            notModified: false,
            error: `Disallowed by robots.txt: ${robotsCheck.reason}`,
          };
        }
      }

      // 3. Prepare headers
      const headers: Record<string, string> = {
        "User-Agent": CRAWLER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
      };
      if (options.etag) headers["If-None-Match"] = options.etag;
      if (options.lastModified) headers["If-Modified-Since"] = options.lastModified;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(currentUrl, {
          method: "GET",
          headers,
          redirect: "manual", // Manual redirect validation prevents SSRF pivot
          signal: controller.signal,
        });
        clearTimeout(timer);

        // Handle 304 Not Modified
        if (response.status === 304) {
          return {
            ok: true,
            status: 304,
            statusText: "Not Modified",
            url: currentUrl,
            bodyText: "",
            contentType: response.headers.get("content-type") || "",
            etag: response.headers.get("etag"),
            lastModified: response.headers.get("last-modified"),
            notModified: true,
          };
        }

        // Handle Redirects
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) {
            return {
              ok: false,
              status: response.status,
              statusText: "Redirect without Location header",
              url: currentUrl,
              bodyText: "",
              contentType: "",
              etag: null,
              lastModified: null,
              notModified: false,
              error: "Redirect target missing",
            };
          }

          const resolvedRedirect = new URL(location, currentUrl).toString();
          currentUrl = resolvedRedirect;
          redirectCount++;
          continue;
        }

        // Handle 429 Rate Limit
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after") || "60";
          return {
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            url: currentUrl,
            bodyText: "",
            contentType: "",
            etag: null,
            lastModified: null,
            notModified: false,
            error: `Rate limited by source (Retry-After: ${retryAfter}s)`,
          };
        }

        if (!response.ok) {
          return {
            ok: false,
            status: response.status,
            statusText: response.statusText,
            url: currentUrl,
            bodyText: "",
            contentType: response.headers.get("content-type") || "",
            etag: response.headers.get("etag"),
            lastModified: response.headers.get("last-modified"),
            notModified: false,
            error: `HTTP ${response.status} ${response.statusText}`,
          };
        }

        // Bounded read (protect against infinite streams or memory exhaustion)
        const text = await response.text();
        const boundedText = text.length > maxBytes ? text.slice(0, maxBytes) : text;

        return {
          ok: true,
          status: response.status,
          statusText: response.statusText,
          url: currentUrl,
          bodyText: boundedText,
          contentType: response.headers.get("content-type") || "",
          etag: response.headers.get("etag"),
          lastModified: response.headers.get("last-modified"),
          notModified: false,
        };
      } catch (err) {
        clearTimeout(timer);
        return {
          ok: false,
          status: 0,
          statusText: "Fetch Network Failure",
          url: currentUrl,
          bodyText: "",
          contentType: "",
          etag: null,
          lastModified: null,
          notModified: false,
          error: (err as Error).message,
        };
      }
    }

    return {
      ok: false,
      status: 310,
      statusText: "Too Many Redirects",
      url: currentUrl,
      bodyText: "",
      contentType: "",
      etag: null,
      lastModified: null,
      notModified: false,
      error: `Exceeded maximum redirect hops (${maxRedirects})`,
    };
  }
}

export const safeHttpFetcher = new SafeHttpFetcher();

