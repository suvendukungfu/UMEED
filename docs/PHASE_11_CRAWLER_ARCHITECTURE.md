# UMEED Discovery Intelligence — Crawler Architecture & Engineering Specification

**Phase**: 11  
**Track**: HackCBS 9.0 — Meko Track A  
**Status**: VERIFIED & OPERATIONAL  
**Author**: Principal Web Crawling & Systems Architect  

---

## 1. Executive Summary & Design Principles

The UMEED Discovery Crawler is an ethical, bounded, RFC 9309-compliant public-source intelligence engine. It continuously discovers potential humanitarian and animal-welfare distress signals from approved open government data repositories, municipal shelter feeds, public RSS publishers, and registered NGO announcements.

### Architectural Invariants:
1. **Never a Generic Scraper**: Crawling is restricted strictly to an explicit registry of authorized sources. Unreviewed or arbitrary external URLs are strictly rejected.
2. **Mandatory Human Verification Gate**: Discovered web signals are ingested strictly as **Discovery Candidates** in `new` or `under_review` status. A crawled signal is **never** automatically promoted to an active verified incident without authorized coordinator approval.
3. **SSRF & DNS Rebinding Immunity**: All outbound requests pass through a multi-tier network security guard that validates protocols, rejects private/loopback/link-local/cloud-metadata IP ranges, and re-validates DNS at connection time.
4. **RFC 9309 Robots Policy Compliance**: The crawler identifies itself as `UMEED-DiscoveryBot/1.0 (+https://umeed.org/bot; humanitarian-coordination)`, observes matching `Allow`/`Disallow` and `Crawl-delay` directives, caches rules, and fails closed upon server errors (HTTP 5xx).

---

## 2. Pipeline Architecture

```
               APPROVED SOURCE REGISTRY
             (Open Gov, NGO RSS, Alerts)
                          │
                          ▼
                  SSRF SECURITY GUARD
         (Loopback, RFC 1918, Cloud Metadata)
                          │
                          ▼
               RFC 9309 ROBOTS POLICY
          (User-Agent: UMEED-DiscoveryBot)
                          │
                          ▼
                  SAFE HTTP FETCHER
           (Crawl Budgets, Timeouts, ETags)
                          │
                          ▼
            CONTENT EXTRACTION & NORMALIZATION
         (Feed Parser, Sitemap Parser, HTML Text)
                          │
                          ▼
          DEDUPLICATION & CONTENT FINGERPRINT
                     (SHA-256)
                          │
                          ▼
               SIGNAL EXTRACTION PIPELINE
          (Delhi Location Detector & Gemini AI)
                          │
                          ▼
              DISCOVERY CANDIDATE STORE
        (Mongo & InMemory with Ephemeral Demo)
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
 DISCOVERY TRACKER TABLE           INTERACTIVE MAP
 (Filters, Sorting, Provenance)   (Coarsened Coordinates)
          │                               │
          └───────────────┬───────────────┘
                          ▼
              HUMAN COORDINATOR REVIEW
          (Verify, Reject, Mark Duplicate)
                          │
                          ▼ [Manual Authorization Required]
              CANONICAL INCIDENT SERVICE
          (source_type: social_media_discovery)
                          │
                          ▼
              UMEED CORE ASSISTANCE NETWORK
             (Gemini Triage, NGO Matching,
             Responder Dispatch, Handoff Gate)
```

---

## 3. Crawler Components

### 3.1 Source Registry (`source.repository.ts`)
- Manages sources with typed fields: `sourceId`, `name`, `domain`, `sourceType`, `description`, `homepageUrl`, `feedUrl`, `sitemapUrl`, `license`, `sourceOwner`, `approved`, `approvedBy`, `robotsStatus`, `crawlIntervalMinutes`, `maxPagesPerRun`, `requestsPerMinute`, `healthStatus`.
- Evaluates `MongoSourceRepository` when MongoDB Atlas is configured, falling back safely to `InMemorySourceRepository` with explicit `(DEMO / EPHEMERAL)` disclosures.

### 3.2 SSRF Guard (`ssrf-guard.ts`)
- Rejects non-HTTP/HTTPS schemes (`file:`, `ftp:`, `gopher:`, etc.).
- Rejects forbidden hostnames: `localhost`, `*.internal`, `*.local`, `metadata.google.internal`, `169.254.169.254`.
- Rejects private IPv4 ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (link-local and cloud metadata), `100.64.0.0/10` (CGNAT), `198.18.0.0/15`.
- Rejects loopback and link-local IPv6: `::1`, `fe80::/10`, `fc00::/7`, and IPv4-mapped IPv6 (`::ffff:127.0.0.1`).
- Resolves DNS beforehand to protect against DNS rebinding.

### 3.3 Robots.txt Policy Engine (`robots-service.ts`)
- Fetches and parses `/robots.txt` per RFC 9309.
- Prioritizes `UMEED-DiscoveryBot` group directives over wildcard `*` groups.
- Caches parsed rules for 1 hour.
- Handles HTTP 404/410 as full permission.
- Handles HTTP 5xx by failing closed (denying access until server recovers).

### 3.4 Safe HTTP Fetcher (`http-fetcher.ts`)
- Strict timeouts (default 8,000ms).
- Max response size enforcement (2 MB bounded buffer) preventing memory exhaustion.
- Validates each hop of HTTP redirects (max 3 hops) through SSRF guard.
- Supports `ETag` and `If-Modified-Since` conditional headers.
- Gracefully handles `429 Too Many Requests` respecting `Retry-After`.

### 3.5 Parsers & Normalizers
- **Feed Parser** (`feed-parser.ts`): Pure string/regex extraction for RSS 2.0 and Atom 1.0, eliminating XML External Entity (XXE) attack vectors. Strips CDATA blocks and HTML formatting.
- **Sitemap Parser** (`sitemap-parser.ts`): Extracts `<loc>` and `<lastmod>` entries.
- **HTML Extractor** (`html-extractor.ts`): Strips `<script>`, `<style>`, `<svg>`, `<nav>`, `<footer>` tags, extracts OpenGraph metadata (`og:title`, `og:description`, `article:published_time`), and builds clean text excerpts up to 1,000 characters.
- **Canonical Normalizer & Fingerprinting** (`content-fingerprint.ts`): Strips tracking query parameters (`utm_*`, `fbclid`, `gclid`), lowercases hostname/protocol, normalizes paths, and calculates deterministic SHA-256 hashes for content deduplication.

---

## 4. Operational Crawl Engine (`crawl-engine.ts`)

- Bounded batch execution per run (default max 10 pages).
- Atomic run state tracking: `runId`, `pagesDiscovered`, `pagesFetched`, `candidatesExtracted`, `duplicatesFound`, `errorsCount`, and chronologically bounded execution logs.
- Safe dry-run mode (`isDryRun: true`) allowing operators to simulate discovery without persisting candidate records.

