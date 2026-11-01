import { Role, Permission, AccountState } from "@umeed/contracts";

/**
 * Role to Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CITIZEN: [
    "incident:create",
    "incident:read:own",
  ],
  NGO_OWNER: [
    "incident:read:organization",
    "case:read:organization",
    "case:escalate",
    "ngo:read",
    "ngo:manage:own",
    "ngo_member:invite",
    "ngo_member:manage",
    "capacity:read",
    "capacity:update",
    "responder:update_assigned_case",
    "analytics:read:organization",
  ],
  NGO_ADMIN: [
    "incident:read:organization",
    "case:read:organization",
    "case:escalate",
    "ngo:read",
    "ngo:manage:own",
    "ngo_member:invite",
    "capacity:read",
    "capacity:update",
    "responder:update_assigned_case",
    "analytics:read:organization",
  ],
  NGO_OPERATOR: [
    "incident:read:organization",
    "case:read:organization",
    "ngo:read",
    "capacity:read",
    "capacity:update",
    "responder:update_assigned_case",
  ],
  COORDINATOR: [
    "incident:create",
    "incident:review",
    "incident:approve",
    "incident:reject",
    "case:create",
    "case:read:assigned",
    "case:read:organization",
    "case:dispatch",
    "case:escalate",
    "case:resolve",
    "ngo:read",
    "capacity:read",
    "analytics:read:platform",
    "audit:read:authorized",
  ],
  RESPONDER: [
    "incident:read:assigned",
    "case:read:assigned",
    "responder:update_assigned_case",
  ],
  PLATFORM_ADMIN: [
    "incident:review",
    "case:read:assigned",
    "case:read:organization",
    "case:escalate",
    "ngo:read",
    "ngo:verify",
    "ngo:suspend",
    "capacity:read",
    "analytics:read:platform",
    "audit:read:authorized",
    "admin:manage_users",
    "admin:manage_permissions",
  ],
  AUDITOR: [
    "case:read:assigned",
    "case:read:organization",
    "ngo:read",
    "capacity:read",
    "analytics:read:platform",
    "audit:read:authorized",
  ],
};

export interface AuthActor {
  userId: string;
  role: Role;
  organizationId?: string | null;
  accountState: AccountState;
}

export interface ResourceTarget {
  organizationId?: string | null;
  ownerUserId?: string | null;
  assignedResponderId?: string | null;
  assignedProviderId?: string | null;
  status?: string | null;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Centralized, server-enforced authorization policy checker.
 * Validates role-level capability, tenant isolation, ownership, and resource state.
 */
export function authorize(
  actor: AuthActor,
  permission: Permission,
  resource?: ResourceTarget,
  context?: Record<string, unknown>
): AuthorizationResult {
  // 1. Account State Enforcement
  if (actor.accountState === "SUSPENDED" || actor.accountState === "DISABLED") {
    return {
      authorized: false,
      reason: `Access denied: Account is in '${actor.accountState}' state.`,
    };
  }

  // 2. Role-Level Capability Check
  const allowedPermissions = ROLE_PERMISSIONS[actor.role] || [];
  if (!allowedPermissions.includes(permission)) {
    return {
      authorized: false,
      reason: `Access denied: Role '${actor.role}' lacks permission '${permission}'.`,
    };
  }

  // 3. Organization-Scoped Tenancy Check
  if (
    ["NGO_OWNER", "NGO_ADMIN", "NGO_OPERATOR"].includes(actor.role) &&
    resource?.organizationId
  ) {
    if (!actor.organizationId || actor.organizationId !== resource.organizationId) {
      return {
        authorized: false,
        reason: `Tenancy isolation violation: Actor organization '${actor.organizationId || "none"}' does not match resource organization '${resource.organizationId}'.`,
      };
    }
  }

  // 4. Citizen Ownership Check
  if (actor.role === "CITIZEN" && permission === "incident:read:own") {
    if (resource?.ownerUserId && resource.ownerUserId !== actor.userId) {
      return {
        authorized: false,
        reason: "Access denied: Citizens can only inspect their own submissions.",
      };
    }
  }

  // 5. Responder Assignment Check
  if (actor.role === "RESPONDER") {
    if (resource?.assignedResponderId && resource.assignedResponderId !== actor.userId) {
      return {
        authorized: false,
        reason: "Access denied: Responder can only access cases assigned directly to them.",
      };
    }
    if (
      actor.organizationId &&
      resource?.assignedProviderId &&
      actor.organizationId !== resource.assignedProviderId
    ) {
      return {
        authorized: false,
        reason: "Tenancy violation: Assignment belongs to a different organisation.",
      };
    }
  }

  // 6. Terminal State Mutation Protection
  if (
    permission === "responder:update_assigned_case" &&
    resource?.status &&
    ["RESOLVED", "CANCELLED", "CLOSED"].includes(resource.status)
  ) {
    return {
      authorized: false,
      reason: `Access denied: Cannot mutate resource in terminal status '${resource.status}'.`,
    };
  }

  return { authorized: true };
}

