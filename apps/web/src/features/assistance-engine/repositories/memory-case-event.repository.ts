import { EngineCaseEvent } from "../types";
import { IEngineCaseEventRepository } from "./case-event.repository";

export class InMemoryEngineCaseEventRepository implements IEngineCaseEventRepository {
  private events: EngineCaseEvent[] = [];

  async initIndexes(): Promise<void> {
    // In-memory no-op
  }

  async append(event: EngineCaseEvent): Promise<EngineCaseEvent> {
    const copy = JSON.parse(JSON.stringify(event));
    this.events.push(copy);
    return JSON.parse(JSON.stringify(copy));
  }

  async findByCaseId(caseId: string): Promise<EngineCaseEvent[]> {
    const filtered = this.events.filter((e) => e.caseId === caseId);
    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return JSON.parse(JSON.stringify(filtered));
  }

  async findByRequirementId(requirementId: string): Promise<EngineCaseEvent[]> {
    const filtered = this.events.filter((e) => e.requirementId === requirementId);
    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return JSON.parse(JSON.stringify(filtered));
  }

  async list(limit = 100): Promise<EngineCaseEvent[]> {
    const sorted = [...this.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return JSON.parse(JSON.stringify(sorted.slice(0, limit)));
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}

