import { DiscoverySource, SourceHealthStatus } from "@umeed/contracts";
import { getDb, isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export interface ISourceRepository {
  listSources(options?: { approvedOnly?: boolean }): Promise<DiscoverySource[]>;
  getById(sourceId: string): Promise<DiscoverySource | null>;
  create(source: DiscoverySource): Promise<DiscoverySource>;
  update(sourceId: string, updates: Partial<DiscoverySource>): Promise<DiscoverySource | null>;
  setApproval(sourceId: string, approved: boolean, approvedBy: string): Promise<DiscoverySource | null>;
  setHealth(sourceId: string, health: SourceHealthStatus, errorMsg?: string): Promise<void>;
  recordCrawlRun(sourceId: string, success: boolean): Promise<void>;
}

export const SEED_DISCOVERY_SOURCES: DiscoverySource[] = [
  {
    sourceId: "src_ogd_delhi_shelter",
    name: "Open Government Data (data.gov.in) — Delhi Night Shelters",
    domain: "data.gov.in",
    sourceType: "open_dataset",
    description: "Official National Data Sharing and Accessibility Platform catalogue for Delhi NCR night shelter capacities and seasonal relief provisions.",
    homepageUrl: "https://data.gov.in",
    feedUrl: "https://data.gov.in/feed/delhi-shelters.xml",
    sitemapUrl: null,
    termsUrl: "https://data.gov.in/terms",
    license: "Government Open Data License - India (GODL)",
    sourceOwner: "Ministry of Electronics and Information Technology (MeitY)",
    approved: true,
    approvedBy: "coord_sharma",
    approvedAt: "2026-10-31T18:00:00Z",
    robotsStatus: "allowed",
    crawlIntervalMinutes: 120,
    maxPagesPerRun: 10,
    maxDepth: 1,
    requestsPerMinute: 10,
    lastCrawledAt: "2026-10-31T20:00:00Z",
    lastSuccessAt: "2026-10-31T20:00:00Z",
    lastErrorAt: null,
    consecutiveFailures: 0,
    healthStatus: "healthy",
    createdAt: "2026-10-31T18:00:00Z",
    updatedAt: "2026-10-31T20:00:00Z",
    isSynthetic: false,
  },
  {
    sourceId: "src_delhi_animal_welfare",
    name: "Delhi Animal Welfare & Stray Rescue Public Feed",
    domain: "delhianimalwelfare.org",
    sourceType: "rss_feed",
    description: "Public community announcements and animal trauma reports across 11 Delhi revenue districts.",
    homepageUrl: "https://delhianimalwelfare.org",
    feedUrl: "https://delhianimalwelfare.org/feed.xml",
    sitemapUrl: null,
    termsUrl: "https://delhianimalwelfare.org/terms",
    license: "Creative Commons Attribution 4.0 International",
    sourceOwner: "Delhi Animal Welfare Community Network",
    approved: true,
    approvedBy: "coord_sharma",
    approvedAt: "2026-10-31T18:00:00Z",
    robotsStatus: "allowed",
    crawlIntervalMinutes: 60,
    maxPagesPerRun: 15,
    maxDepth: 2,
    requestsPerMinute: 15,
    lastCrawledAt: "2026-10-31T20:15:00Z",
    lastSuccessAt: "2026-10-31T20:15:00Z",
    lastErrorAt: null,
    consecutiveFailures: 0,
    healthStatus: "healthy",
    createdAt: "2026-10-31T18:00:00Z",
    updatedAt: "2026-10-31T20:15:00Z",
    isSynthetic: false,
  },
  {
    sourceId: "src_dusib_delhi_alerts",
    name: "DUSIB Winter Relief & Emergency Sanctuary Announcements",
    domain: "delhishelterboard.in",
    sourceType: "approved_html",
    description: "Official public notices from Delhi Urban Shelter Improvement Board regarding vulnerable homeless populations during winter cold waves.",
    homepageUrl: "https://delhishelterboard.in",
    feedUrl: null,
    sitemapUrl: "https://delhishelterboard.in/sitemap.xml",
    termsUrl: "https://delhishelterboard.in/terms",
    license: "Public Domain Government Information",
    sourceOwner: "Delhi Urban Shelter Improvement Board",
    approved: true,
    approvedBy: "coord_sharma",
    approvedAt: "2026-10-31T18:00:00Z",
    robotsStatus: "allowed",
    crawlIntervalMinutes: 180,
    maxPagesPerRun: 8,
    maxDepth: 1,
    requestsPerMinute: 8,
    lastCrawledAt: "2026-10-31T19:30:00Z",
    lastSuccessAt: "2026-10-31T19:30:00Z",
    lastErrorAt: null,
    consecutiveFailures: 0,
    healthStatus: "healthy",
    createdAt: "2026-10-31T18:00:00Z",
    updatedAt: "2026-10-31T19:30:00Z",
    isSynthetic: false,
  },
  {
    sourceId: "src_goonj_relief_bulletin",
    name: "Goonj Community Assistance & Seasonal Relief Bulletins",
    domain: "goonj.org",
    sourceType: "rss_feed",
    description: "Public updates on urgent clothing, blankets, and dry ration distribution drives across urban settlements.",
    homepageUrl: "https://goonj.org",
    feedUrl: "https://goonj.org/feed",
    sitemapUrl: null,
    termsUrl: "https://goonj.org/legal",
    license: "Public Educational & Humanitarian Attribution",
    sourceOwner: "Goonj Foundation",
    approved: true,
    approvedBy: "coord_sharma",
    approvedAt: "2026-10-31T18:00:00Z",
    robotsStatus: "allowed",
    crawlIntervalMinutes: 240,
    maxPagesPerRun: 10,
    maxDepth: 1,
    requestsPerMinute: 10,
    lastCrawledAt: "2026-10-31T17:00:00Z",
    lastSuccessAt: "2026-10-31T17:00:00Z",
    lastErrorAt: null,
    consecutiveFailures: 0,
    healthStatus: "healthy",
    createdAt: "2026-10-31T18:00:00Z",
    updatedAt: "2026-10-31T18:00:00Z",
    isSynthetic: false,
  },
  {
    sourceId: "src_synthetic_test_source",
    name: "UMEED Controlled Discovery Canary Feed (DEMO)",
    domain: "demo.umeed.internal",
    sourceType: "rss_feed",
    description: "High-fidelity synthetic discovery canary feed for deterministic verification and offline test runs.",
    homepageUrl: "https://demo.umeed.internal",
    feedUrl: "https://demo.umeed.internal/rss.xml",
    sitemapUrl: null,
    termsUrl: "https://demo.umeed.internal/terms",
    license: "UMEED Synthetic Benchmark License",
    sourceOwner: "UMEED Engineering Team",
    approved: true,
    approvedBy: "coord_sharma",
    approvedAt: "2026-10-31T18:00:00Z",
    robotsStatus: "allowed",
    crawlIntervalMinutes: 30,
    maxPagesPerRun: 5,
    maxDepth: 1,
    requestsPerMinute: 60,
    lastCrawledAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    consecutiveFailures: 0,
    healthStatus: "healthy",
    createdAt: "2026-10-31T18:00:00Z",
    updatedAt: "2026-10-31T18:00:00Z",
    isSynthetic: true,
  },
];

export class InMemorySourceRepository implements ISourceRepository {
  private sources = new Map<string, DiscoverySource>();

  constructor() {
    for (const src of SEED_DISCOVERY_SOURCES) {
      this.sources.set(src.sourceId, { ...src });
    }
  }

  async listSources(options?: { approvedOnly?: boolean }): Promise<DiscoverySource[]> {
    let list = Array.from(this.sources.values());
    if (options?.approvedOnly) {
      list = list.filter((s) => s.approved && s.healthStatus !== "paused");
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(sourceId: string): Promise<DiscoverySource | null> {
    const s = this.sources.get(sourceId);
    return s ? { ...s } : null;
  }

  async create(source: DiscoverySource): Promise<DiscoverySource> {
    this.sources.set(source.sourceId, { ...source });
    return { ...source };
  }

  async update(sourceId: string, updates: Partial<DiscoverySource>): Promise<DiscoverySource | null> {
    const existing = this.sources.get(sourceId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.sources.set(sourceId, updated);
    return { ...updated };
  }

  async setApproval(sourceId: string, approved: boolean, approvedBy: string): Promise<DiscoverySource | null> {
    const existing = this.sources.get(sourceId);
    if (!existing) return null;
    const updated: DiscoverySource = {
      ...existing,
      approved,
      approvedBy: approved ? approvedBy : null,
      approvedAt: approved ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    this.sources.set(sourceId, updated);
    return { ...updated };
  }

  async setHealth(sourceId: string, health: SourceHealthStatus, errorMsg?: string): Promise<void> {
    const existing = this.sources.get(sourceId);
    if (!existing) return;
    existing.healthStatus = health;
    if (health === "failing" || health === "degraded") {
      existing.consecutiveFailures += 1;
      existing.lastErrorAt = new Date().toISOString();
    } else if (health === "healthy") {
      existing.consecutiveFailures = 0;
    }
    existing.updatedAt = new Date().toISOString();
    this.sources.set(sourceId, existing);
  }

  async recordCrawlRun(sourceId: string, success: boolean): Promise<void> {
    const existing = this.sources.get(sourceId);
    if (!existing) return;
    const now = new Date().toISOString();
    existing.lastCrawledAt = now;
    if (success) {
      existing.lastSuccessAt = now;
      existing.consecutiveFailures = 0;
      existing.healthStatus = "healthy";
    } else {
      existing.lastErrorAt = now;
      existing.consecutiveFailures += 1;
      if (existing.consecutiveFailures >= 3) {
        existing.healthStatus = "failing";
      } else {
        existing.healthStatus = "degraded";
      }
    }
    existing.updatedAt = now;
    this.sources.set(sourceId, existing);
  }
}

export class MongoSourceRepository implements ISourceRepository {
  private collectionName = "discovery_sources";

  async listSources(options?: { approvedOnly?: boolean }): Promise<DiscoverySource[]> {
    const db = await getDb();
    const query: Record<string, unknown> = {};
    if (options?.approvedOnly) {
      query.approved = true;
      query.healthStatus = { $ne: "paused" };
    }
    const docs = await db.collection(this.collectionName).find(query).sort({ name: 1 }).toArray();
    return docs.map((d: any) => {
      const { _id, ...rest } = d;
      return rest as DiscoverySource;
    });
  }

  async getById(sourceId: string): Promise<DiscoverySource | null> {
    const db = await getDb();
    const doc = await db.collection(this.collectionName).findOne({ sourceId });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as DiscoverySource;
  }

  async create(source: DiscoverySource): Promise<DiscoverySource> {
    const db = await getDb();
    await db.collection(this.collectionName).insertOne({ ...source });
    return source;
  }

  async update(sourceId: string, updates: Partial<DiscoverySource>): Promise<DiscoverySource | null> {
    const db = await getDb();
    const now = new Date().toISOString();
    const res = await db.collection(this.collectionName).findOneAndUpdate(
      { sourceId },
      { $set: { ...updates, updatedAt: now } },
      { returnDocument: "after" }
    );
    if (!res) return null;
    const { _id, ...rest } = res;
    return rest as DiscoverySource;
  }

  async setApproval(sourceId: string, approved: boolean, approvedBy: string): Promise<DiscoverySource | null> {
    return this.update(sourceId, {
      approved,
      approvedBy: approved ? approvedBy : null,
      approvedAt: approved ? new Date().toISOString() : null,
    });
  }

  async setHealth(sourceId: string, health: SourceHealthStatus, errorMsg?: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      healthStatus: health,
      updatedAt: now,
    };
    if (health === "failing" || health === "degraded") {
      update.lastErrorAt = now;
      await db.collection(this.collectionName).updateOne(
        { sourceId },
        { $set: update, $inc: { consecutiveFailures: 1 } }
      );
    } else {
      update.consecutiveFailures = 0;
      await db.collection(this.collectionName).updateOne({ sourceId }, { $set: update });
    }
  }

  async recordCrawlRun(sourceId: string, success: boolean): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    if (success) {
      await db.collection(this.collectionName).updateOne(
        { sourceId },
        {
          $set: {
            lastCrawledAt: now,
            lastSuccessAt: now,
            consecutiveFailures: 0,
            healthStatus: "healthy",
            updatedAt: now,
          },
        }
      );
    } else {
      await db.collection(this.collectionName).updateOne(
        { sourceId },
        {
          $set: {
            lastCrawledAt: now,
            lastErrorAt: now,
            updatedAt: now,
          },
          $inc: { consecutiveFailures: 1 },
        }
      );
    }
  }
}

export function getSourceRepository(): ISourceRepository {
  if ((globalThis as any)._umeedSourceRepo) {
    return (globalThis as any)._umeedSourceRepo;
  }

  const env = getServerEnv();
  let instance: ISourceRepository;
  if (isMongoConfigured(env.MONGODB_URI)) {
    instance = new MongoSourceRepository();
    logger.info("Using MongoDB Atlas Source Repository", "DISCOVERY_SOURCE_REPO");
  } else {
    instance = new InMemorySourceRepository();
    logger.warn("Using InMemorySourceRepository (DEMO / EPHEMERAL)", "DISCOVERY_SOURCE_REPO");
  }

  (globalThis as any)._umeedSourceRepo = instance;
  return instance;
}

export function setSourceRepository(repo: ISourceRepository | null): void {
  (globalThis as any)._umeedSourceRepo = repo;
}
