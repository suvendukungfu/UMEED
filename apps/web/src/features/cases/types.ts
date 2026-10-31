import {
  Case,
  CaseStatus,
  CaseAssignment,
  AssignmentStatus,
  AssignmentContactAttempt,
  InterventionRecord,
  InterventionType,
  InterventionEvidenceItem,
  CaseEvent,
  CaseResolutionDecision,
  CreateCaseInput,
  AssignNGOsInput,
  AssignmentActionInput,
  InterventionInput,
  CaseResolutionInput,
  SanitizedCase,
} from "@umeed/contracts";

export type {
  Case,
  CaseStatus,
  CaseAssignment,
  AssignmentStatus,
  AssignmentContactAttempt,
  InterventionRecord,
  InterventionType,
  InterventionEvidenceItem,
  CaseEvent,
  CaseResolutionDecision,
  CreateCaseInput,
  AssignNGOsInput,
  AssignmentActionInput,
  InterventionInput,
  CaseResolutionInput,
  SanitizedCase,
};

export interface CaseFilterOptions {
  status?: CaseStatus;
  incident_reference?: string;
  organisation_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CaseCreationResult {
  is_new: boolean;
  case: Case;
}

export interface TransitionCaseResult {
  success: boolean;
  case?: Case;
  error?: string;
  event?: CaseEvent;
}
