import { z } from "zod";

/**
 * UMEED Canonical Authentication and Authorization Contracts
 */

export const RoleSchema = z.enum([
  "CITIZEN",
  "NGO_OWNER",
  "NGO_ADMIN",
  "NGO_OPERATOR",
  "COORDINATOR",
  "RESPONDER",
  "PLATFORM_ADMIN",
  "AUDITOR",
]);
export type Role = z.infer<typeof RoleSchema>;

export const PermissionSchema = z.enum([
  "incident:create",
  "incident:read:own",
  "incident:read:assigned",
  "incident:read:organization",
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
  "ngo:manage:own",
  "ngo:verify",
  "ngo:suspend",
  "ngo_member:invite",
  "ngo_member:manage",
  "capacity:read",
  "capacity:update",
  "responder:update_assigned_case",
  "analytics:read:organization",
  "analytics:read:platform",
  "audit:read:authorized",
  "admin:manage_users",
  "admin:manage_permissions",
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const AccountStateSchema = z.enum([
  "UNAUTHENTICATED",
  "EMAIL_VERIFICATION_PENDING",
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "DISABLED",
  "PASSWORD_RESET_REQUIRED",
]);
export type AccountState = z.infer<typeof AccountStateSchema>;

export const UserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  accountState: AccountStateSchema,
  platformRole: RoleSchema.nullable().optional(), // Nullable for non-platform users (pure NGO staff or citizens)
  passwordHash: z.string().optional(), // Omitted in public/client serialization
  salt: z.string().optional(),
  emailVerified: z.boolean().default(false),
  defaultOrganizationId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const OrganizationMembershipSchema = z.object({
  membershipId: z.string().min(1),
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: z.enum(["NGO_OWNER", "NGO_ADMIN", "NGO_OPERATOR", "RESPONDER"]),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]),
  invitedBy: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrganizationMembership = z.infer<typeof OrganizationMembershipSchema>;

export const SessionSchema = z.object({
  sessionId: z.string().min(1),
  tokenHash: z.string().min(1),
  userId: z.string().min(1),
  activeOrganizationId: z.string().nullable().optional(),
  activeRole: RoleSchema,
  expiresAt: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const OrganizationInvitationSchema = z.object({
  invitationId: z.string().min(1),
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["NGO_OWNER", "NGO_ADMIN", "NGO_OPERATOR", "RESPONDER"]),
  invitedByUserId: z.string().min(1),
  tokenHash: z.string().min(1),
  status: z.enum(["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type OrganizationInvitation = z.infer<typeof OrganizationInvitationSchema>;

export const AuthContextSchema = z.object({
  user: UserSchema.omit({ passwordHash: true, salt: true }),
  session: SessionSchema.omit({ tokenHash: true }),
  memberships: z.array(OrganizationMembershipSchema),
  activeOrganization: z
    .object({
      organizationId: z.string(),
      name: z.string(),
      role: RoleSchema,
    })
    .nullable()
    .optional(),
  permissions: z.array(PermissionSchema),
});
export type AuthContext = z.infer<typeof AuthContextSchema>;

