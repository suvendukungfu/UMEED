import { z } from "zod";
import { IncidentTypeSchema } from "./incident";

/**
 * UMEED Discovery Intelligence Shared Contract (v1.0.0)
 *
 * Defines contracts for:
 * 1. Approved Public Source Registry
 * 2. Crawl Job & Run Execution Records
 * 3. Discovery Distress Signal Candidates
 */

// 1. SOURCE REGISTRY SCHEMAS
export const SourceTypeSchema = z.enum([
  "rss_feed",
  "atom_feed",
  "xml_sitemap",
  "public_api",
  "open_dataset",
  "approved_html",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const RobotsStatusSchema = z.enum([
  "allowed",
  "disallowed",
  "unavailable",
  "pending_check",
]);
export type RobotsStatus = z.infer<typeof RobotsStatusSchema>;

export const SourceHealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "failing",
  "paused",
]);
export type SourceHealthStatus = z.infer<typeof SourceHealthStatusSchema>;

export const DiscoverySourceSchema = z.object({
  sourceId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(200),
  sourceType: SourceTypeSchema,
  description: z.string().max(1000),
  homepageUrl: z.string().url().max(2048),
  feedUrl: z.string().url().max(2048).nullable().default(null),
  sitemapUrl: z.string().url().max(2048).nullable().default(null),
  termsUrl: z.string().url().max(2048).nullable().default(null),
  license: z.string().max(200).default("Public Open Data / Fair Reference"),
  sourceOwner: z.string().max(200).default("Public Entity"),
  approved: z.boolean().default(false),
  approvedBy: z.string().max(100).nullable().default(null),
  approvedAt: z.string().datetime().nullable().default(null),
  robotsStatus: RobotsStatusSchema.default("pending_check"),
  crawlIntervalMinutes: z.number().int().min(5).max(10080).default(60),
  maxPagesPerRun: z.number().int().min(1).max(100).default(10),
  maxDepth: z.number().int().min(1).max(5).default(2),
  requestsPerMinute: z.number().int().min(1).max(60).default(10),
  lastCrawledAt: z.string().datetime().nullable().default(null),
  lastSuccessAt: z.string().datetime().nullable().default(null),
  lastErrorAt: z.string().datetime().nullable().default(null),
  consecutiveFailures: z.number().int().min(0).default(0),
  healthStatus: SourceHealthStatusSchema.default("healthy"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isSynthetic: z.boolean().default(false),
});
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;

// 2. CRAWL RUN SCHEMAS
export const CrawlJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type CrawlJobStatus = z.infer<typeof CrawlJobStatusSchema>;

export const CrawlLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(["info", "warn", "error"]),
  message: z.string().max(500),
  details: z.record(z.string().max(100), z.unknown()).optional(),
});
export type CrawlLogEntry = z.infer<typeof CrawlLogEntrySchema>;

export const CrawlRunSchema = z.object({
  runId: z.string().min(1).max(100),
  sourceId: z.string().min(1).max(100),
  sourceName: z.string().min(1).max(200),
  status: CrawlJobStatusSchema.default("queued"),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().default(null),
  pagesDiscovered: z.number().int().min(0).default(0),
  pagesFetched: z.number().int().min(0).default(0),
  candidatesExtracted: z.number().int().min(0).default(0),
  duplicatesFound: z.number().int().min(0).default(0),
  errorsCount: z.number().int().min(0).default(0),
  logs: z.array(CrawlLogEntrySchema).max(200).default([]),
  isDryRun: z.boolean().default(false),
  triggeredBy: z.string().max(100).default("system_scheduler"),
});
export type CrawlRun = z.infer<typeof CrawlRunSchema>;

// 3. CANDIDATE SCHEMAS
export const CandidateReviewStatusSchema = z.enum([
  "new",
  "under_review",
  "verified",
  "rejected",
  "duplicate",
  "converted_to_incident",
]);
export type CandidateReviewStatus = z.infer<typeof CandidateReviewStatusSchema>;

export const SignalRelevanceSchema = z.enum([
  "low",
  "possible_signal",
  "strong_candidate",
  "coordinator_verified",
]);
export type SignalRelevance = z.infer<typeof SignalRelevanceSchema>;

export const LocationPrecisionSchema = z.enum([
  "exact_district",
  "approximate_district",
  "metropolitan_area",
  "uncertain",
]);
export type LocationPrecision = z.infer<typeof LocationPrecisionSchema>;

export const ApproximateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  district: z.string().max(100).nullable().default(null),
  state: z.string().max(100).nullable().default("Delhi NCR"),
});
export type ApproximateLocation = z.infer<typeof ApproximateLocationSchema>;

export const DiscoveryCandidateSchema = z.object({
  candidateId: z.string().min(1).max(100),
  sourceId: z.string().min(1).max(100),
  sourceName: z.string().min(1).max(200),
  sourceUrl: z.string().url().max(2048),
  canonicalUrl: z.string().url().max(2048),
  sourceTitle: z.string().min(1).max(300),
  sourcePublishedAt: z.string().datetime().nullable().default(null),
  discoveredAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  contentHash: z.string().length(64), // SHA-256
  excerpt: z.string().max(1000),
  summary: z.string().max(1000),
  candidateCategory: IncidentTypeSchema,
  extractedLocationText: z.string().max(300).nullable().default(null),
  approximateLocation: ApproximateLocationSchema,
  locationPrecision: LocationPrecisionSchema.default("approximate_district"),
  locationConfidence: z.number().min(0).max(1).default(0.5),
  signalScore: z.number().min(0).max(100).default(50),
  signalRelevance: SignalRelevanceSchema.default("possible_signal"),
  classificationReasons: z.array(z.string().max(300)).max(10).default([]),
  extractionVersion: z.string().max(50).default("1.0.0"),
  reviewStatus: CandidateReviewStatusSchema.default("new"),
  reviewedBy: z.string().max(100).nullable().default(null),
  reviewedAt: z.string().datetime().nullable().default(null),
  reviewNotes: z.string().max(1000).nullable().default(null),
  incidentReference: z.string().max(100).nullable().default(null),
  duplicateGroupId: z.string().max(100).nullable().default(null),
  isSynthetic: z.boolean().default(false),
});
export type DiscoveryCandidate = z.infer<typeof DiscoveryCandidateSchema>;
