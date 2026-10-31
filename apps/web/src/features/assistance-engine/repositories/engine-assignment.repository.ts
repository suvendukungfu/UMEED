import { EngineAssignment, EngineAssignmentStatus } from "../types";

export interface EngineAssignmentFilter {
  caseId?: string;
  requirementId?: string;
  providerId?: string;
  status?: EngineAssignmentStatus;
}

export interface IEngineAssignmentRepository {
  initIndexes(): Promise<void>;
  create(assignment: EngineAssignment): Promise<EngineAssignment>;
  findById(assignmentId: string): Promise<EngineAssignment | null>;
  findByRequirementId(requirementId: string): Promise<EngineAssignment | null>;
  findByCaseId(caseId: string): Promise<EngineAssignment[]>;
  findByProviderId(providerId: string): Promise<EngineAssignment[]>;
  update(
    assignmentId: string,
    updates: Partial<EngineAssignment>
  ): Promise<EngineAssignment | null>;
  list(filter?: EngineAssignmentFilter): Promise<EngineAssignment[]>;
  findStaleProgress(thresholdIso: string): Promise<EngineAssignment[]>;
  clear(): Promise<void>;
}

