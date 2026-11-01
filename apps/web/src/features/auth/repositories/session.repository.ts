import { Session } from "@umeed/contracts";
import { getMongoClientPromise } from "@/lib/db/mongodb";

export interface ISessionRepository {
  create(session: Session): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteByTokenHash(tokenHash: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  update(sessionId: string, updates: Partial<Session>): Promise<Session | null>;
}

export class InMemorySessionRepository implements ISessionRepository {
  private sessions: Map<string, Session> = new Map();

  async create(session: Session): Promise<Session> {
    this.sessions.set(session.tokenHash, { ...session });
    return { ...session };
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const s = this.sessions.get(tokenHash);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    return { ...s };
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    return this.sessions.delete(tokenHash);
  }

  async deleteByUserId(userId: string): Promise<number> {
    let count = 0;
    for (const [hash, s] of this.sessions.entries()) {
      if (s.userId === userId) {
        this.sessions.delete(hash);
        count++;
      }
    }
    return count;
  }

  async update(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    for (const [hash, s] of this.sessions.entries()) {
      if (s.sessionId === sessionId) {
        const updated = { ...s, ...updates, lastSeenAt: new Date().toISOString() };
        this.sessions.set(hash, updated);
        return updated;
      }
    }
    return null;
  }
}

export class MongoSessionRepository implements ISessionRepository {
  private collectionName = "sessions";

  private async getCollection() {
    const promise = getMongoClientPromise();
    if (!promise) {
      throw new Error("MongoDB client is not configured.");
    }
    const client = await promise;
    return client.db().collection<Session>(this.collectionName);
  }

  async create(session: Session): Promise<Session> {
    const col = await this.getCollection();
    await col.insertOne({ ...session });
    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ tokenHash });
    if (!doc) return null;
    if (new Date(doc.expiresAt).getTime() < Date.now()) {
      await col.deleteOne({ tokenHash });
      return null;
    }
    return doc;
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    const col = await this.getCollection();
    const res = await col.deleteOne({ tokenHash });
    return res.deletedCount > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const col = await this.getCollection();
    const res = await col.deleteMany({ userId });
    return res.deletedCount;
  }

  async update(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const col = await this.getCollection();
    const doc = await col.findOneAndUpdate(
      { sessionId },
      { $set: { ...updates, lastSeenAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    return doc || null;
  }
}

