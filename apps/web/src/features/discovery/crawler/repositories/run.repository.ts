import { CrawlRun, CrawlLogEntry } from "@umeed/contracts";
import { getDb, isMongoConfigured } from "@/lib/db/mongodb";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging";

export interface IRunRepository {
  listRuns(limit?: number): Promise<CrawlRun[]>;
  getById(runId: string): Promise<CrawlRun | null>;
  create(run: CrawlRun): Promise<CrawlRun>;
  update(runId: string, updates: Partial<CrawlRun>): Promise<CrawlRun | null>;
  appendLog(runId: string, log: CrawlLogEntry): Promise<void>;
}

export class InMemoryRunRepository implements IRunRepository {
  private runs = new Map<string, CrawlRun>();

  async listRuns(limit = 20): Promise<CrawlRun[]> {
    return Array.from(this.runs.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getById(runId: string): Promise<CrawlRun | null> {
    const r = this.runs.get(runId);
    return r ? { ...r } : null;
  }

  async create(run: CrawlRun): Promise<CrawlRun> {
    this.runs.set(run.runId, { ...run });
    return { ...run };
  }

  async update(runId: string, updates: Partial<CrawlRun>): Promise<CrawlRun | null> {
    const existing = this.runs.get(runId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.runs.set(runId, updated);
    return { ...updated };
  }

  async appendLog(runId: string, log: CrawlLogEntry): Promise<void> {
    const existing = this.runs.get(runId);
    if (!existing) return;
    existing.logs.push(log);
    if (existing.logs.length > 200) {
      existing.logs.shift();
    }
  }
}

export class MongoRunRepository implements IRunRepository {
  private collectionName = "discovery_crawl_runs";

  async listRuns(limit = 20): Promise<CrawlRun[]> {
    const db = await getDb();
    const docs = await db
      .collection(this.collectionName)
      .find({})
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map((d: any) => {
      const { _id, ...rest } = d;
      return rest as CrawlRun;
    });
  }

  async getById(runId: string): Promise<CrawlRun | null> {
    const db = await getDb();
    const doc = await db.collection(this.collectionName).findOne({ runId });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as CrawlRun;
  }

  async create(run: CrawlRun): Promise<CrawlRun> {
    const db = await getDb();
    await db.collection(this.collectionName).insertOne({ ...run });
    return run;
  }

  async update(runId: string, updates: Partial<CrawlRun>): Promise<CrawlRun | null> {
    const db = await getDb();
    const res = await db.collection(this.collectionName).findOneAndUpdate(
      { runId },
      { $set: updates },
      { returnDocument: "after" }
    );
    if (!res) return null;
    const { _id, ...rest } = res;
    return rest as CrawlRun;
  }

  async appendLog(runId: string, log: CrawlLogEntry): Promise<void> {
    const db = await getDb();
    await db.collection(this.collectionName).updateOne(
      { runId },
      {
        $push: {
          logs: {
            $each: [log],
            $slice: -200,
          },
        },
      } as any
    );
  }
}

export function getRunRepository(): IRunRepository {
  if ((globalThis as any)._umeedRunRepo) {
    return (globalThis as any)._umeedRunRepo;
  }

  const env = getServerEnv();
  let instance: IRunRepository;
  if (isMongoConfigured(env.MONGODB_URI)) {
    instance = new MongoRunRepository();
    logger.info("Using MongoDB Atlas Crawl Run Repository", "DISCOVERY_RUN_REPO");
  } else {
    instance = new InMemoryRunRepository();
    logger.warn("Using InMemoryRunRepository (DEMO / EPHEMERAL)", "DISCOVERY_RUN_REPO");
  }

  (globalThis as any)._umeedRunRepo = instance;
  return instance;
}

export function setRunRepository(repo: IRunRepository | null): void {
  (globalThis as any)._umeedRunRepo = repo;
}
