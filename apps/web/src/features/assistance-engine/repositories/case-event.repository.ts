import { EngineCaseEvent } from "../types";

export interface IEngineCaseEventRepository {
  initIndexes(): Promise<void>;
  append(event: EngineCaseEvent): Promise<EngineCaseEvent>;
  findByCaseId(caseId: string): Promise<EngineCaseEvent[]>;
  findByRequirementId(requirementId: string): Promise<EngineCaseEvent[]>;
  list(limit?: number): Promise<EngineCaseEvent[]>;
  clear(): Promise<void>;
}

