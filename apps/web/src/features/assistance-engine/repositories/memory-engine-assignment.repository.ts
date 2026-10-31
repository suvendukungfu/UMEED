import { EngineAssignment } from "../types";
import {
  IEngineAssignmentRepository,
  EngineAssignmentFilter,
} from "./engine-assignment.repository";

export class InMemoryEngineAssignmentRepository implements IEngineAssignmentRepository {
  private assignments: Map<string, EngineAssignment> = new Map();

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async create(assignment: EngineAssignment): Promise<EngineAssignment> {
    if (this.assignments.has(assignment.assignmentId)) {
      const err = new Error(
        `E11000 duplicate key error: assignmentId ${assignment.assignmentId} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    // Atomic exclusivity check: Only 1 active assignment per requirement
    if (["ACCEPTED", "WORK_STARTED", "IN_PROGRESS"].includes(assignment.status)) {
      for (const existing of this.assignments.values()) {
        if (
          existing.requirementId === assignment.requirementId &&
          ["ACCEPTED", "WORK_STARTED", "IN_PROGRESS"].includes(existing.status)
        ) {
          const err = new Error(
            `E11000 duplicate key error: active assignment already exists for requirement ${assignment.requirementId}`
          );
          (err as unknown as { code: number }).code = 11000;
          throw err;
        }
      }
    }

    const copy = JSON.parse(JSON.stringify(assignment));
    this.assignments.set(copy.assignmentId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async findById(assignmentId: string): Promise<EngineAssignment | null> {
    const found = this.assignments.get(assignmentId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByRequirementId(requirementId: string): Promise<EngineAssignment | null> {
    for (const a of this.assignments.values()) {
      if (
        a.requirementId === requirementId &&
        ["ACCEPTED", "WORK_STARTED", "IN_PROGRESS", "RESOLVED"].includes(a.status)
      ) {
        return JSON.parse(JSON.stringify(a));
      }
    }
    return null;
  }

  async findByCaseId(caseId: string): Promise<EngineAssignment[]> {
    const res: EngineAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (a.caseId === caseId) {
        res.push(JSON.parse(JSON.stringify(a)));
      }
    }
    return res;
  }

  async findByProviderId(providerId: string): Promise<EngineAssignment[]> {
    const res: EngineAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (a.providerId === providerId) {
        res.push(JSON.parse(JSON.stringify(a)));
      }
    }
    return res;
  }

  async update(
    assignmentId: string,
    updates: Partial<EngineAssignment>
  ): Promise<EngineAssignment | null> {
    const existing = this.assignments.get(assignmentId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.assignments.set(assignmentId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: EngineAssignmentFilter): Promise<EngineAssignment[]> {
    let result = Array.from(this.assignments.values());

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
    }

    return JSON.parse(JSON.stringify(result));
  }

  async findStaleProgress(thresholdIso: string): Promise<EngineAssignment[]> {
    const thresholdMs = new Date(thresholdIso).getTime();
    const result: EngineAssignment[] = [];

    for (const a of this.assignments.values()) {
      if (["ACCEPTED", "WORK_STARTED", "IN_PROGRESS"].includes(a.status)) {
        if (a.expectedUpdateAt) {
          const expectedMs = new Date(a.expectedUpdateAt).getTime();
          if (expectedMs <= thresholdMs) {
            result.push(JSON.parse(JSON.stringify(a)));
          }
        }
      }
    }

    return result;
  }

  async clear(): Promise<void> {
    this.assignments.clear();
  }
}

