import { describe, it, expect } from "vitest";
import {
  RoleSchema,
  PermissionSchema,
  UserSchema,
  SessionSchema,
  OrganizationMembershipSchema,
  AccountStateSchema,
} from "./auth";

describe("Authentication & RBAC Contracts", () => {
  it("validates canonical user role enums", () => {
    expect(RoleSchema.parse("CITIZEN")).toBe("CITIZEN");
    expect(RoleSchema.parse("COORDINATOR")).toBe("COORDINATOR");
    expect(RoleSchema.parse("NGO_OWNER")).toBe("NGO_OWNER");
    expect(RoleSchema.parse("NGO_ADMIN")).toBe("NGO_ADMIN");
    expect(RoleSchema.parse("NGO_OPERATOR")).toBe("NGO_OPERATOR");
    expect(RoleSchema.parse("RESPONDER")).toBe("RESPONDER");
    expect(RoleSchema.parse("PLATFORM_ADMIN")).toBe("PLATFORM_ADMIN");
    expect(RoleSchema.parse("AUDITOR")).toBe("AUDITOR");

    expect(() => RoleSchema.parse("SUPER_USER")).toThrow();
  });

  it("validates canonical permission enums", () => {
    expect(PermissionSchema.parse("incident:create")).toBe("incident:create");
    expect(PermissionSchema.parse("case:resolve")).toBe("case:resolve");
    expect(PermissionSchema.parse("ngo:manage:own")).toBe("ngo:manage:own");
    expect(PermissionSchema.parse("responder:update_assigned_case")).toBe("responder:update_assigned_case");
    expect(PermissionSchema.parse("admin:manage_users")).toBe("admin:manage_users");

    expect(() => PermissionSchema.parse("invalid:permission")).toThrow();
  });

  it("validates UserSchema with strict email and account state", () => {
    const validUser = {
      userId: "usr_12345",
      email: "coordinator@umeed.org",
      name: "Ananya Roy",
      accountState: "ACTIVE",
      platformRole: "COORDINATOR",
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = UserSchema.parse(validUser);
    expect(parsed.userId).toBe("usr_12345");
    expect(parsed.accountState).toBe("ACTIVE");

    expect(() =>
      UserSchema.parse({
        ...validUser,
        email: "invalid-email-address",
      })
    ).toThrow();
  });

  it("validates OrganizationMembershipSchema scoped to organizations", () => {
    const membership = {
      membershipId: "mem_001",
      userId: "usr_12345",
      organizationId: "NGO-DELHI-001",
      role: "NGO_ADMIN",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = OrganizationMembershipSchema.parse(membership);
    expect(parsed.organizationId).toBe("NGO-DELHI-001");
    expect(parsed.role).toBe("NGO_ADMIN");
  });
});

