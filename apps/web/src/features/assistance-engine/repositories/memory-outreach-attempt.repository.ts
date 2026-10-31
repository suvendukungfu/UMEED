import { OutreachAttempt } from "../types";
import {
  IOutreachAttemptRepository,
  OutreachAttemptFilter,
} from "./outreach-attempt.repository";

export class InMemoryOutreachAttemptRepository implements IOutreachAttemptRepository {
  private attempts: Map<string, OutreachAttempt> = new Map();
  private idempotencyMap: Map<string, string> = new Map();

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async create(attempt: OutreachAttempt): Promise<OutreachAttempt> {
    if (this.attempts.has(attempt.attemptId)) {
      const err = new Error(
        `E11000 duplicate key error: attemptId ${attempt.attemptId} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    if (this.idempotencyMap.has(attempt.idempotencyKey)) {
      const err = new Error(
        `E11000 duplicate key error: idempotencyKey ${attempt.idempotencyKey} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    const copy = JSON.parse(JSON.stringify(attempt));
    this.attempts.set(copy.attemptId, copy);
    this.idempotencyMap.set(copy.idempotencyKey, copy.attemptId);
    return JSON.parse(JSON.stringify(copy));
  }

  async findById(attemptId: string): Promise<OutreachAttempt | null> {
    const found = this.attempts.get(attemptId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByIdempotencyKey(key: string): Promise<OutreachAttempt | null> {
    const attemptId = this.idempotencyMap.get(key);
    if (!attemptId) return null;
    return this.findById(attemptId);
  }

  async findByRequirementId(requirementId: string): Promise<OutreachAttempt[]> {
    const res: OutreachAttempt[] = [];
    for (const a of this.attempts.values()) {
      if (a.requirementId === requirementId) {
        res.push(JSON.parse(JSON.stringify(a)));
      }
    }
    return res;
  }

  async findByCaseId(caseId: string): Promise<OutreachAttempt[]> {
    const res: OutreachAttempt[] = [];
    for (const a of this.attempts.values()) {
      if (a.caseId === caseId) {
        res.push(JSON.parse(JSON.stringify(a)));
      }
    }
    return res;
  }

  async update(
    attemptId: string,
    updates: Partial<OutreachAttempt>
  ): Promise<OutreachAttempt | null> {
    const existing = this.attempts.get(attemptId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.attempts.set(attemptId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: OutreachAttemptFilter): Promise<OutreachAttempt[]> {
    let result = Array.from(this.attempts.values());

    if (filter) {
      if (filter.caseId) {
        result = result.filter((a) => a.caseId === filter.caseId);
      }
      if (filter.requirementId) {
        result = result.filter((a) => a.requirementId === filter.requirementId);
      }
      if (filter.providerId) {
        result = result.filter((a) => a.providerId === filter.providerId);
      }
      if (filter.status) {
        result = result.filter((a) => a.status === filter.status);
      }
      if (filter.outreachRound !== undefined) {
        result = result.filter((a) => a.outreachRound === filter.outreachRound);
      }
      if (filter.outreachVersion !== undefined) {
        result = result.filter((a) => a.outreachVersion === filter.outreachVersion);
      }
    }

    return JSON.parse(JSON.stringify(result));
  }

  async findOverdueAwaitingResponses(nowIso: string): Promise<OutreachAttempt[]> {
    const nowMs = new Date(nowIso).getTime();
    const result: OutreachAttempt[] = [];

    for (const attempt of this.attempts.values()) {
      if (["SENT", "DELIVERED", "QUEUED", "CREATED"].includes(attempt.status)) {
        const deadlineMs = new Date(attempt.acknowledgementDeadline).getTime();
        if (deadlineMs <= nowMs) {
          result.push(JSON.parse(JSON.stringify(attempt)));
        }
      }
    }

    return result;
  }

  async clear(): Promise<void> {
    this.attempts.clear();
    this.idempotencyMap.clear();
  }
}

