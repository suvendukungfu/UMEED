import { User } from "@umeed/contracts";
import { getMongoClientPromise } from "@/lib/db/mongodb";
import { logger } from "@/lib/logging";

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(userId: string, updates: Partial<User>): Promise<User | null>;
  list(filter?: { accountState?: string; platformRole?: string }): Promise<User[]>;
}

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase().trim() === normalized) {
        return u;
      }
    }
    return null;
  }

  async create(user: User): Promise<User> {
    const existing = await this.findByEmail(user.email);
    if (existing) {
      throw new Error(`User with email '${user.email}' already exists.`);
    }
    this.users.set(user.userId, { ...user });
    return { ...user };
  }

  async update(userId: string, updates: Partial<User>): Promise<User | null> {
    const existing = this.users.get(userId);
    if (!existing) return null;
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    return { ...updated };
  }

  async list(filter?: { accountState?: string; platformRole?: string }): Promise<User[]> {
    let result = Array.from(this.users.values());
    if (filter?.accountState) {
      result = result.filter((u) => u.accountState === filter.accountState);
    }
    if (filter?.platformRole) {
      result = result.filter((u) => u.platformRole === filter.platformRole);
    }
    return result;
  }
}

export class MongoUserRepository implements IUserRepository {
  private collectionName = "users";

  private async getCollection() {
    const promise = getMongoClientPromise();
    if (!promise) {
      throw new Error("MongoDB client is not configured.");
    }
    const client = await promise;
    return client.db().collection<User>(this.collectionName);
  }

  async findById(userId: string): Promise<User | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ userId });
    return doc || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const col = await this.getCollection();
    const doc = await col.findOne({ email: email.toLowerCase().trim() });
    return doc || null;
  }

  async create(user: User): Promise<User> {
    const col = await this.getCollection();
    await col.insertOne({ ...user, email: user.email.toLowerCase().trim() });
    return user;
  }

  async update(userId: string, updates: Partial<User>): Promise<User | null> {
    const col = await this.getCollection();
    const updated = await col.findOneAndUpdate(
      { userId },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    return updated || null;
  }

  async list(filter?: { accountState?: string; platformRole?: string }): Promise<User[]> {
    const col = await this.getCollection();
    const query: Record<string, unknown> = {};
    if (filter?.accountState) query.accountState = filter.accountState;
    if (filter?.platformRole) query.platformRole = filter.platformRole;
    return col.find(query).toArray();
  }
}

