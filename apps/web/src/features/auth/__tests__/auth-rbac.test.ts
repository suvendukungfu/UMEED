import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "../services/auth.service";
import { authorize } from "../services/rbac.service";
import { InMemoryUserRepository } from "../repositories/user.repository";
import { InMemorySessionRepository } from "../repositories/session.repository";
import { InMemoryOrganizationMembershipRepository } from "../repositories/membership.repository";

describe("Milestone 1: Production Authentication & Multi-Tenant RBAC", () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemorySessionRepository;
  let membershipRepo: InMemoryOrganizationMembershipRepository;
  let authService: AuthService;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemorySessionRepository();
    membershipRepo = new InMemoryOrganizationMembershipRepository();

    authService = new AuthService({
      userRepo,
      sessionRepo,
      membershipRepo,
    });

    await authService.seedDefaultUsers();
  });

  describe("Authentication & Session Management", () => {
    it("successfully authenticates seeded coordinator with correct credentials", async () => {
      const result = await authService.signInWithPassword(
        "coordinator@umeed.org",
        "UmeedSecurePassword2026!"
      );

      expect(result).not.toBeNull();
      expect(result?.context.user.email).toBe("coordinator@umeed.org");
      expect(result?.context.session.activeRole).toBe("COORDINATOR");
      expect(result?.sessionToken).toMatch(/^sess_[a-f0-9]{64}$/);
    });

    it("rejects authentication with invalid password", async () => {
      const result = await authService.signInWithPassword(
        "coordinator@umeed.org",
        "WrongPassword!"
      );
      expect(result).toBeNull();
    });

    it("authenticates token and returns complete AuthContext with permissions", async () => {
      const signInResult = await authService.signInWithPassword(
        "owner@janseva-delhi.org",
        "UmeedSecurePassword2026!"
      );
      expect(signInResult).not.toBeNull();

      const context = await authService.authenticateToken(signInResult!.sessionToken);
      expect(context).not.toBeNull();
      expect(context?.session.activeRole).toBe("NGO_OWNER");
      expect(context?.session.activeOrganizationId).toBe("NGO-DELHI-001");
      expect(context?.permissions).toContain("ngo:manage:own");
      expect(context?.permissions).toContain("responder:update_assigned_case");
    });

    it("allows switching active organization for authorized memberships", async () => {
      // Add a second membership for test
      await membershipRepo.create({
        membershipId: "mem_test_second",
        userId: "usr_ngo_owner_01",
        organizationId: "NGO-DELHI-002",
        role: "NGO_ADMIN",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const signInResult = await authService.signInWithPassword(
        "owner@janseva-delhi.org",
        "UmeedSecurePassword2026!"
      );

      const switched = await authService.switchOrganization(
        signInResult!.sessionToken,
        "NGO-DELHI-002"
      );

      expect(switched).not.toBeNull();
      expect(switched?.session.activeOrganizationId).toBe("NGO-DELHI-002");
      expect(switched?.session.activeRole).toBe("NGO_ADMIN");
    });

    it("denies switching to an unauthorized organization", async () => {
      const signInResult = await authService.signInWithPassword(
        "owner@janseva-delhi.org",
        "UmeedSecurePassword2026!"
      );

      await expect(
        authService.switchOrganization(
          signInResult!.sessionToken,
          "NGO-UNAUTHORIZED-999"
        )
      ).rejects.toThrow(/does not have active membership/i);
    });

    it("revokes active session on signOut", async () => {
      const signInResult = await authService.signInWithPassword(
        "coordinator@umeed.org",
        "UmeedSecurePassword2026!"
      );

      const isSignedOut = await authService.signOut(signInResult!.sessionToken);
      expect(isSignedOut).toBe(true);

      const contextAfter = await authService.authenticateToken(signInResult!.sessionToken);
      expect(contextAfter).toBeNull();
    });
  });

  describe("Server-Enforced RBAC & Tenancy Isolation", () => {
    it("allows coordinator to review and approve incidents, disallowing citizen", () => {
      const coordActor = {
        userId: "usr_coord",
        role: "COORDINATOR" as const,
        accountState: "ACTIVE" as const,
      };
      const citizenActor = {
        userId: "usr_citizen",
        role: "CITIZEN" as const,
        accountState: "ACTIVE" as const,
      };

      expect(authorize(coordActor, "incident:approve").authorized).toBe(true);
      expect(authorize(citizenActor, "incident:approve").authorized).toBe(false);
    });

    it("strictly isolates NGO data across tenants", () => {
      const ngo1Actor = {
        userId: "usr_ngo_1",
        role: "NGO_ADMIN" as const,
        organizationId: "NGO-DELHI-001",
        accountState: "ACTIVE" as const,
      };

      // Allowed within own organization
      const ownRes = authorize(ngo1Actor, "case:read:organization", {
        organizationId: "NGO-DELHI-001",
      });
      expect(ownRes.authorized).toBe(true);

      // Blocked from accessing other organization's case
      const foreignRes = authorize(ngo1Actor, "case:read:organization", {
        organizationId: "NGO-DELHI-002",
      });
      expect(foreignRes.authorized).toBe(false);
      expect(foreignRes.reason).toContain("Tenancy isolation violation");
    });

    it("blocks suspended users completely", () => {
      const suspendedActor = {
        userId: "usr_suspended",
        role: "COORDINATOR" as const,
        accountState: "SUSPENDED" as const,
      };

      const res = authorize(suspendedActor, "incident:approve");
      expect(res.authorized).toBe(false);
      expect(res.reason).toContain("SUSPENDED");
    });

    it("blocks mutations on terminal RESOLVED or CANCELLED cases", () => {
      const responderActor = {
        userId: "usr_resp_1",
        role: "RESPONDER" as const,
        accountState: "ACTIVE" as const,
      };

      const activeCaseRes = authorize(responderActor, "responder:update_assigned_case", {
        assignedResponderId: "usr_resp_1",
        status: "IN_PROGRESS",
      });
      expect(activeCaseRes.authorized).toBe(true);

      const resolvedCaseRes = authorize(responderActor, "responder:update_assigned_case", {
        assignedResponderId: "usr_resp_1",
        status: "RESOLVED",
      });
      expect(resolvedCaseRes.authorized).toBe(false);
      expect(resolvedCaseRes.reason).toContain("terminal status");
    });

    it("rejects expired sessions and cleans them up", async () => {
      // Create session expired in the past
      const expiredToken = "sess_expired_0000000000000000000000000000000000000000000000000000000000000000";
      const tokenHash = "expired_hash_001";
      await sessionRepo.create({
        sessionId: "sess_exp_1",
        tokenHash,
        userId: "usr_coord",
        activeRole: "COORDINATOR",
        expiresAt: new Date(Date.now() - 60000).toISOString(),
        createdAt: new Date(Date.now() - 120000).toISOString(),
        lastSeenAt: new Date(Date.now() - 60000).toISOString(),
      });

      const found = await sessionRepo.findByTokenHash(tokenHash);
      expect(found).toBeNull(); // Cleaned up because expired
    });

    it("blocks disabled user accounts from any operation", () => {
      const disabledActor = {
        userId: "usr_disabled",
        role: "NGO_OWNER" as const,
        organizationId: "NGO-DELHI-001",
        accountState: "DISABLED" as const,
      };

      const res = authorize(disabledActor, "ngo:manage:own", { organizationId: "NGO-DELHI-001" });
      expect(res.authorized).toBe(false);
      expect(res.reason).toContain("DISABLED");
    });

    it("blocks a citizen from reading another citizen's submission (IDOR protection)", () => {
      const citizen1 = {
        userId: "usr_citizen_alice",
        role: "CITIZEN" as const,
        accountState: "ACTIVE" as const,
      };

      const ownRes = authorize(citizen1, "incident:read:own", { ownerUserId: "usr_citizen_alice" });
      expect(ownRes.authorized).toBe(true);

      const foreignRes = authorize(citizen1, "incident:read:own", { ownerUserId: "usr_citizen_bob" });
      expect(foreignRes.authorized).toBe(false);
      expect(foreignRes.reason).toContain("Citizens can only inspect their own submissions");
    });

    it("blocks a responder from accessing work assigned to another responder or organisation", () => {
      const responder1 = {
        userId: "usr_responder_1",
        role: "RESPONDER" as const,
        organizationId: "NGO-DELHI-001",
        accountState: "ACTIVE" as const,
      };

      // Case assigned to responder_2
      const wrongResponderRes = authorize(responder1, "responder:update_assigned_case", {
        assignedResponderId: "usr_responder_2",
        assignedProviderId: "NGO-DELHI-001",
      });
      expect(wrongResponderRes.authorized).toBe(false);
      expect(wrongResponderRes.reason).toContain("Responder can only access cases assigned directly");

      // Case belonging to NGO-DELHI-002
      const wrongOrgRes = authorize(responder1, "responder:update_assigned_case", {
        assignedResponderId: "usr_responder_1",
        assignedProviderId: "NGO-DELHI-002",
      });
      expect(wrongOrgRes.authorized).toBe(false);
      expect(wrongOrgRes.reason).toContain("Tenancy violation: Assignment belongs to a different organisation");
    });

    it("prevents privilege escalation: NGO_OPERATOR cannot invite or manage members", () => {
      const operatorActor = {
        userId: "usr_operator_1",
        role: "NGO_OPERATOR" as const,
        organizationId: "NGO-DELHI-001",
        accountState: "ACTIVE" as const,
      };

      const inviteRes = authorize(operatorActor, "ngo_member:invite", { organizationId: "NGO-DELHI-001" });
      expect(inviteRes.authorized).toBe(false);
      expect(inviteRes.reason).toContain("lacks permission 'ngo_member:invite'");
    });
  });
});

