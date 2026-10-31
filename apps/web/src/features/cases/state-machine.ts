import { CaseStatus, AssignmentStatus } from "./types";

/**
 * Pure Functional Validated State Machines for:
 * 1. Case Lifecycle
 * 2. Multi-NGO Assignment Lifecycle
 */

export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  APPROVED: ["MATCHING", "RESPONDERS_CONTACTED", "ACCEPTED", "CANCELLED", "REJECTED"],
  MATCHING: ["RESPONDERS_CONTACTED", "ESCALATED", "CANCELLED"],
  RESPONDERS_CONTACTED: ["ACCEPTED", "MATCHING", "ESCALATED", "CANCELLED"],
  ACCEPTED: ["RESPONDER_ARRIVED", "CANCELLED", "ESCALATED"],
  RESPONDER_ARRIVED: [
    "INTERVENTION_PROVIDED",
    "FOLLOW_UP_REQUIRED",
    "CANCELLED",
    "ESCALATED",
    "RESOLVED",
  ],
  INTERVENTION_PROVIDED: [
    "INTERVENTION_PROVIDED",
    "FOLLOW_UP_REQUIRED",
    "RESOLVED",
    "MATCHING",
    "CANCELLED",
  ],
  FOLLOW_UP_REQUIRED: ["MATCHING", "ESCALATED", "CANCELLED", "RESOLVED"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["MATCHING", "FOLLOW_UP_REQUIRED", "CANCELLED"],
  ESCALATED: ["MATCHING", "RESOLVED", "CANCELLED"],
  CANCELLED: ["REOPENED"],
  REJECTED: ["REOPENED"],
};

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  PROPOSED: ["CONTACT_READY", "CANCELLED"],
  CONTACT_READY: ["CONTACT_QUEUED", "CANCELLED"],
  CONTACT_QUEUED: ["CONTACTED", "CONTACT_FAILED", "CANCELLED"],
  CONTACTED: [
    "ACKNOWLEDGED",
    "ACCEPTED",
    "REJECTED",
    "REQUESTED_INFORMATION",
    "EXPIRED",
    "CANCELLED",
  ],
  ACKNOWLEDGED: [
    "ACCEPTED",
    "REJECTED",
    "REQUESTED_INFORMATION",
    "EXPIRED",
    "CANCELLED",
  ],
  REQUESTED_INFORMATION: [
    "CONTACTED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED",
  ],
  ACCEPTED: ["EN_ROUTE", "ARRIVED", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["INTERVENTION_RECORDED", "CANCELLED"],
  INTERVENTION_RECORDED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  EXPIRED: [],
  CONTACT_FAILED: ["CONTACT_QUEUED", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return true;
  const allowed = CASE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus): boolean {
  if (from === to) return true;
  const allowed = ASSIGNMENT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidCaseTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransitionCase(from, to)) {
    throw new Error(
      `Invalid case lifecycle transition: cannot transition case from '${from}' to '${to}'. Allowed: [${
        CASE_TRANSITIONS[from]?.join(", ") ?? "none"
      }]`
    );
  }
}

export function assertValidAssignmentTransition(from: AssignmentStatus, to: AssignmentStatus): void {
  if (!canTransitionAssignment(from, to)) {
    throw new Error(
      `Invalid assignment lifecycle transition: cannot transition assignment from '${from}' to '${to}'. Allowed: [${
        ASSIGNMENT_TRANSITIONS[from]?.join(", ") ?? "none"
      }]`
    );
  }
}
