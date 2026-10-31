import { Case, CaseEvent, CaseFilterOptions } from "../types";

export interface ICaseRepository {
  create(caseRecord: Case): Promise<Case>;
  findById(caseId: string): Promise<Case | null>;
  findByReference(publicCaseReference: string): Promise<Case | null>;
  findByIncidentId(incidentId: string): Promise<Case | null>;
  findMany(filter?: CaseFilterOptions): Promise<{ cases: Case[]; total: number }>;
  update(caseId: string, partial: Partial<Case>): Promise<Case | null>;
  addEvent(event: CaseEvent): Promise<void>;
  getEvents(caseId: string): Promise<CaseEvent[]>;
  clear?(): Promise<void>;
}
