import { ICaseRepository } from "./case.repository";
import { Case, CaseEvent, CaseFilterOptions } from "../types";

export class InMemoryCaseRepository implements ICaseRepository {
  private cases: Map<string, Case> = new Map();
  private incidentToCaseId: Map<string, string> = new Map();
  private referenceToCaseId: Map<string, string> = new Map();
  private events: CaseEvent[] = [];

  async create(caseRecord: Case): Promise<Case> {
    if (this.cases.has(caseRecord.case_id)) {
      const err = new Error(`E11000 duplicate key error: case_id ${caseRecord.case_id} already exists`);
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    if (this.incidentToCaseId.has(caseRecord.incident_id)) {
      const err = new Error(
        `E11000 duplicate key error: case for incident_id ${caseRecord.incident_id} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    if (this.referenceToCaseId.has(caseRecord.public_case_reference)) {
      const err = new Error(
        `E11000 duplicate key error: public_case_reference ${caseRecord.public_case_reference} already exists`
      );
      (err as unknown as { code: number }).code = 11000;
      throw err;
    }

    const cloned = JSON.parse(JSON.stringify(caseRecord)) as Case;
    this.cases.set(cloned.case_id, cloned);
    this.incidentToCaseId.set(cloned.incident_id, cloned.case_id);
    this.referenceToCaseId.set(cloned.public_case_reference, cloned.case_id);

    return JSON.parse(JSON.stringify(cloned));
  }

  async findById(caseId: string): Promise<Case | null> {
    const found = this.cases.get(caseId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByReference(publicCaseReference: string): Promise<Case | null> {
    const caseId = this.referenceToCaseId.get(publicCaseReference);
    if (!caseId) return null;
    return this.findById(caseId);
  }

  async findByIncidentId(incidentId: string): Promise<Case | null> {
    const caseId = this.incidentToCaseId.get(incidentId);
    if (!caseId) return null;
    return this.findById(caseId);
  }

  async findMany(filter?: CaseFilterOptions): Promise<{ cases: Case[]; total: number }> {
    let result = Array.from(this.cases.values());

    if (filter?.status) {
      result = result.filter((c) => c.case_status === filter.status);
    }

    if (filter?.incident_reference) {
      result = result.filter((c) => c.incident_reference === filter.incident_reference);
    }

    if (filter?.organisation_id) {
      result = result.filter((c) =>
        c.assignments.some((a) => a.organisation_id === filter.organisation_id)
      );
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.public_case_reference.toLowerCase().includes(q) ||
          c.incident_reference.toLowerCase().includes(q) ||
          c.assistance_requirements.some((r) => r.toLowerCase().includes(q))
      );
    }

    // Sort newest updated first
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const total = result.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    const paginated = result.slice(offset, offset + limit);

    return {
      cases: JSON.parse(JSON.stringify(paginated)),
      total,
    };
  }

  async update(caseId: string, partial: Partial<Case>): Promise<Case | null> {
    const current = this.cases.get(caseId);
    if (!current) return null;

    const updated: Case = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    this.cases.set(caseId, JSON.parse(JSON.stringify(updated)));
    return JSON.parse(JSON.stringify(updated));
  }

  async addEvent(event: CaseEvent): Promise<void> {
    this.events.push(JSON.parse(JSON.stringify(event)));
  }

  async getEvents(caseId: string): Promise<CaseEvent[]> {
    const matched = this.events.filter((e) => e.case_id === caseId);
    matched.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return JSON.parse(JSON.stringify(matched));
  }

  async clear(): Promise<void> {
    this.cases.clear();
    this.incidentToCaseId.clear();
    this.referenceToCaseId.clear();
    this.events = [];
  }
}
