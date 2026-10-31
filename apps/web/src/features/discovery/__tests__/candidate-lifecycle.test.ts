import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryCandidateRepository,
  SEED_DISCOVERY_CANDIDATES,
} from "../extraction/candidate.repository";
import {
  InMemorySourceRepository,
  SEED_DISCOVERY_SOURCES,
} from "../crawler/repositories/source.repository";
import { CrawlEngine } from "../crawler/crawl-engine";
import { InMemoryRunRepository } from "../crawler/repositories/run.repository";

describe("Phase 11: Candidate Review Lifecycle & Ingestion Integration", () => {
  let candidateRepo: InMemoryCandidateRepository;
  let sourceRepo: InMemorySourceRepository;
  let runRepo: InMemoryRunRepository;
  let engine: CrawlEngine;

  beforeEach(() => {
    candidateRepo = new InMemoryCandidateRepository();
    sourceRepo = new InMemorySourceRepository();
    runRepo = new InMemoryRunRepository();
    engine = new CrawlEngine({
      sourceRepo,
      candidateRepo,
      runRepo,
    });
  });

  it("lists initial discovery candidates and provides accurate metrics", async () => {
    const list = await candidateRepo.listCandidates();
    expect(list.length).toBe(SEED_DISCOVERY_CANDIDATES.length);

    const counts = await candidateRepo.countByStatus();
    expect(counts.total).toBe(SEED_DISCOVERY_CANDIDATES.length);
    expect(counts.new).toBeGreaterThan(0);
  });

  it("allows coordinator to review and verify a candidate", async () => {
    const candidateId = "cand_delhi_001_rohini_bull";
    const updated = await candidateRepo.updateReview(candidateId, {
      status: "verified",
      reviewedBy: "coord_sharma",
      notes: "Verified via local volunteer rescue group.",
    });

    expect(updated).not.toBeNull();
    expect(updated?.reviewStatus).toBe("verified");
    expect(updated?.reviewedBy).toBe("coord_sharma");
  });

  it("allows coordinator to reject false-positive candidate", async () => {
    const candidateId = "cand_delhi_004_okhla_food";
    const updated = await candidateRepo.updateReview(candidateId, {
      status: "rejected",
      reviewedBy: "coord_sharma",
      notes: "Commercial advertisement rather than acute humanitarian need.",
    });

    expect(updated?.reviewStatus).toBe("rejected");
  });

  it("executes bounded crawl run for synthetic test source", async () => {
    const run = await engine.executeRun({
      sourceId: "src_synthetic_test_source",
      isDryRun: false,
      triggeredBy: "test_suite",
    });

    expect(run.status).toBe("completed");
    expect(run.pagesFetched).toBe(2);
    expect(run.candidatesExtracted).toBeGreaterThan(0);
  });

  it("rejects crawl request for unapproved source", async () => {
    // Register unapproved source
    await sourceRepo.create({
      sourceId: "src_unapproved",
      name: "Unapproved Scrape Site",
      domain: "unapproved.com",
      sourceType: "rss_feed",
      description: "Not yet reviewed",
      homepageUrl: "https://unapproved.com",
      feedUrl: null,
      sitemapUrl: null,
      termsUrl: null,
      license: "Unknown",
      sourceOwner: "Unknown",
      approved: false,
      approvedBy: null,
      approvedAt: null,
      robotsStatus: "pending_check",
      crawlIntervalMinutes: 60,
      maxPagesPerRun: 5,
      maxDepth: 1,
      requestsPerMinute: 5,
      lastCrawledAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      consecutiveFailures: 0,
      healthStatus: "healthy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynthetic: false,
    });

    await expect(
      engine.executeRun({
        sourceId: "src_unapproved",
      })
    ).rejects.toThrow(/has not been approved by an authorized coordinator/);
  });
});
