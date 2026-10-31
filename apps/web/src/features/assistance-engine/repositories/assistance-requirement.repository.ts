import { AssistanceRequirement, RequirementStatus } from "../types";

export interface RequirementFilter {
  caseId?: string;
  status?: RequirementStatus;
  serviceType?: string;
  assignedProviderId?: string;
  ownerId?: string;
}

export interface IAssistanceRequirementRepository {
  initIndexes(): Promise<void>;
  create(req: AssistanceRequirement): Promise<AssistanceRequirement>;
  findById(id: string): Promise<AssistanceRequirement | null>;
  findByCaseId(caseId: string): Promise<AssistanceRequirement[]>;
  update(
    id: string,
    updates: Partial<AssistanceRequirement>
  ): Promise<AssistanceRequirement | null>;
  list(filter?: RequirementFilter): Promise<AssistanceRequirement[]>;
  findPendingWatchdog(thresholdIso: string): Promise<AssistanceRequirement[]>;
  clear(): Promise<void>;
}

