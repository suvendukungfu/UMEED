import { AssistanceRequirement } from "../types";
import {
  IAssistanceRequirementRepository,
  RequirementFilter,
} from "./assistance-requirement.repository";

export class InMemoryAssistanceRequirementRepository
  implements IAssistanceRequirementRepository
{
  private requirements: Map<string, AssistanceRequirement> = new Map();

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async create(req: AssistanceRequirement): Promise<AssistanceRequirement> {
    const copy = JSON.parse(JSON.stringify(req));
    this.requirements.set(copy.requirementId, copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async findById(id: string): Promise<AssistanceRequirement | null> {
    const found = this.requirements.get(id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByCaseId(caseId: string): Promise<AssistanceRequirement[]> {
    const res: AssistanceRequirement[] = [];
    for (const r of this.requirements.values()) {
      if (r.caseId === caseId) {
        res.push(JSON.parse(JSON.stringify(r)));
      }
    }
    return res;
  }

  async update(
    id: string,
    updates: Partial<AssistanceRequirement>
  ): Promise<AssistanceRequirement | null> {
    const existing = this.requirements.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.requirements.set(id, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async list(filter?: RequirementFilter): Promise<AssistanceRequirement[]> {
    let result = Array.from(this.requirements.values());

    if (filter) {
      if (filter.caseId) {
        result = result.filter((r) => r.caseId === filter.caseId);
      }
      if (filter.status) {
        result = result.filter((r) => r.status === filter.status);
      }
      if (filter.serviceType) {
        result = result.filter((r) => r.serviceType === filter.serviceType);
      }
      if (filter.assignedProviderId) {
        result = result.filter(
          (r) => r.assignedProviderId === filter.assignedProviderId
        );
      }
      if (filter.ownerId) {
        result = result.filter((r) => r.ownerId === filter.ownerId);
      }
    }

    return JSON.parse(JSON.stringify(result));
  }

  async findPendingWatchdog(thresholdIso: string): Promise<AssistanceRequirement[]> {
    const threshold = new Date(thresholdIso).getTime();
    const result: AssistanceRequirement[] = [];

    for (const req of this.requirements.values()) {
      if (["RESOLVED", "CANCELLED"].includes(req.status)) continue;
      const nextAction = new Date(req.nextActionAt).getTime();
      if (nextAction <= threshold) {
        result.push(JSON.parse(JSON.stringify(req)));
      }
    }

    return result;
  }

  async clear(): Promise<void> {
    this.requirements.clear();
  }
}

