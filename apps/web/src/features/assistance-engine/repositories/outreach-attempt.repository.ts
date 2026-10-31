import { OutreachAttempt, OutreachStatus } from "../types";

export interface OutreachAttemptFilter {
  caseId?: string;
  requirementId?: string;
  providerId?: string;
  status?: OutreachStatus;
  outreachRound?: number;
  outreachVersion?: number;
}

export interface IOutreachAttemptRepository {
  initIndexes(): Promise<void>;
  create(attempt: OutreachAttempt): Promise<OutreachAttempt>;
  findById(attemptId: string): Promise<OutreachAttempt | null>;
  findByIdempotencyKey(key: string): Promise<OutreachAttempt | null>;
  findByRequirementId(requirementId: string): Promise<OutreachAttempt[]>;
  findByCaseId(caseId: string): Promise<OutreachAttempt[]>;
  update(
    attemptId: string,
    updates: Partial<OutreachAttempt>
  ): Promise<OutreachAttempt | null>;
  list(filter?: OutreachAttemptFilter): Promise<OutreachAttempt[]>;
  findOverdueAwaitingResponses(nowIso: string): Promise<OutreachAttempt[]>;
  clear(): Promise<void>;
}

