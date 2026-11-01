import crypto from "crypto";
import {
  User,
  Session,
  Role,
  AuthContext,
  OrganizationMembership,
} from "@umeed/contracts";
import {
  IUserRepository,
  getUserRepository,
  ISessionRepository,
  getSessionRepository,
  IOrganizationMembershipRepository,
  getOrganizationMembershipRepository,
} from "../repositories";
import { getNGORepository } from "@/features/ngos/repositories";
import { ROLE_PERMISSIONS } from "./rbac.service";
import { logger } from "@/lib/logging";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  const a = Buffer.from(computed.hash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateSessionToken(): string {
  return `sess_${crypto.randomBytes(32).toString("hex")}`;
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  private userRepo: IUserRepository;
  private sessionRepo: ISessionRepository;
  private membershipRepo: IOrganizationMembershipRepository;

  constructor(options?: {
    userRepo?: IUserRepository;
    sessionRepo?: ISessionRepository;
    membershipRepo?: IOrganizationMembershipRepository;
  }) {
    this.userRepo = options?.userRepo || getUserRepository();
    this.sessionRepo = options?.sessionRepo || getSessionRepository();
    this.membershipRepo = options?.membershipRepo || getOrganizationMembershipRepository();
  }

  async seedDefaultUsers(): Promise<void> {
    const defaultPassword = "UmeedSecurePassword2026!";
    const defaultSalt = "umeed_default_salt_2026";
    const { hash } = await hashPassword(defaultPassword, defaultSalt);

    const seedUsers: Array<{
      user: User;
      memberships?: Array<Omit<OrganizationMembership, "membershipId" | "createdAt" | "updatedAt">>;
    }> = [
      {
        user: {
          userId: "usr_coordinator_01",
          email: "coordinator@umeed.org",
          name: "Dr. Ananya Roy",
          phone: "+91-98765-43210",
          accountState: "ACTIVE",
          platformRole: "COORDINATOR",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        user: {
          userId: "usr_platform_admin_01",
          email: "admin@umeed.org",
          name: "Platform Operations Lead",
          accountState: "ACTIVE",
          platformRole: "PLATFORM_ADMIN",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        user: {
          userId: "usr_auditor_01",
          email: "auditor@humanitarianaudit.org",
          name: "Meera Sen (Compliance Auditor)",
          accountState: "ACTIVE",
          platformRole: "AUDITOR",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        user: {
          userId: "usr_ngo_owner_01",
          email: "owner@janseva-delhi.org",
          name: "Dr. Rajesh Sharma",
          phone: "+91-98765-01101",
          accountState: "ACTIVE",
          platformRole: null,
          defaultOrganizationId: "NGO-DELHI-001",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        memberships: [
          {
            userId: "usr_ngo_owner_01",
            organizationId: "NGO-DELHI-001",
            role: "NGO_OWNER",
            status: "ACTIVE",
          },
        ],
      },
      {
        user: {
          userId: "usr_ngo_admin_01",
          email: "admin@janseva-delhi.org",
          name: "Vikram Malhotra",
          accountState: "ACTIVE",
          platformRole: null,
          defaultOrganizationId: "NGO-DELHI-001",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        memberships: [
          {
            userId: "usr_ngo_admin_01",
            organizationId: "NGO-DELHI-001",
            role: "NGO_ADMIN",
            status: "ACTIVE",
          },
        ],
      },
      {
        user: {
          userId: "usr_ngo_operator_01",
          email: "operator@janseva-delhi.org",
          name: "Pooja Verma",
          accountState: "ACTIVE",
          platformRole: null,
          defaultOrganizationId: "NGO-DELHI-001",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        memberships: [
          {
            userId: "usr_ngo_operator_01",
            organizationId: "NGO-DELHI-001",
            role: "NGO_OPERATOR",
            status: "ACTIVE",
          },
        ],
      },
      {
        user: {
          userId: "usr_responder_01",
          email: "responder@janseva-delhi.org",
          name: "Amit Kumar (Paramedic Driver)",
          phone: "+91-98765-01199",
          accountState: "ACTIVE",
          platformRole: null,
          defaultOrganizationId: "NGO-DELHI-001",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        memberships: [
          {
            userId: "usr_responder_01",
            organizationId: "NGO-DELHI-001",
            role: "RESPONDER",
            status: "ACTIVE",
          },
        ],
      },
      {
        user: {
          userId: "usr_citizen_01",
          email: "citizen@example.com",
          name: "Rahul Sharma",
          phone: "+91-98100-11223",
          accountState: "ACTIVE",
          platformRole: "CITIZEN",
          passwordHash: hash,
          salt: defaultSalt,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ];

    for (const item of seedUsers) {
      const existing = await this.userRepo.findByEmail(item.user.email);
      if (!existing) {
        await this.userRepo.create(item.user);
        if (item.memberships) {
          for (const m of item.memberships) {
            await this.membershipRepo.create({
              ...m,
              membershipId: `mem_${crypto.randomUUID()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  async signInWithPassword(email: string, password: string, options?: {
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ context: AuthContext; sessionToken: string } | null> {
    await this.seedDefaultUsers(); // Ensure seeds exist in dev/demo

    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.passwordHash || !user.salt) {
      return null;
    }

    if (user.accountState === "SUSPENDED" || user.accountState === "DISABLED") {
      throw new Error(`Account is ${user.accountState.toLowerCase()}. Contact platform administrator.`);
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return null;
    }

    // Determine initial active organization and role
    const memberships = await this.membershipRepo.findByUser(user.userId);
    let activeOrgId: string | null = user.defaultOrganizationId || null;
    let activeRole: Role = user.platformRole || "CITIZEN";

    if (memberships.length > 0) {
      const targetMembership = activeOrgId
        ? memberships.find((m) => m.organizationId === activeOrgId) || memberships[0]
        : memberships[0];

      activeOrgId = targetMembership.organizationId;
      activeRole = targetMembership.role as Role;
    }

    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const session: Session = {
      sessionId: `sess_${crypto.randomUUID()}`,
      tokenHash,
      userId: user.userId,
      activeOrganizationId: activeOrgId,
      activeRole,
      expiresAt,
      createdAt: nowIso,
      lastSeenAt: nowIso,
      userAgent: options?.userAgent || null,
      ipAddress: options?.ipAddress || null,
    };

    await this.sessionRepo.create(session);
    await this.userRepo.update(user.userId, { lastLoginAt: nowIso });

    const context = await this.buildAuthContext(user, session, memberships);
    return { context, sessionToken: token };
  }

  async authenticateToken(token: string): Promise<AuthContext | null> {
    await this.seedDefaultUsers();
    const tokenHash = hashSessionToken(token);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);
    if (!session) return null;

    const user = await this.userRepo.findById(session.userId);
    if (!user || user.accountState === "SUSPENDED" || user.accountState === "DISABLED") {
      await this.sessionRepo.deleteByTokenHash(tokenHash);
      return null;
    }

    const memberships = await this.membershipRepo.findByUser(user.userId);
    return this.buildAuthContext(user, session, memberships);
  }

  async switchOrganization(token: string, targetOrgId: string): Promise<AuthContext | null> {
    const tokenHash = hashSessionToken(token);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);
    if (!session) return null;

    const memberships = await this.membershipRepo.findByUser(session.userId);
    const targetMembership = memberships.find((m) => m.organizationId === targetOrgId);
    if (!targetMembership) {
      throw new Error(`User does not have active membership in organization '${targetOrgId}'.`);
    }

    const updated = await this.sessionRepo.update(session.sessionId, {
      activeOrganizationId: targetOrgId,
      activeRole: targetMembership.role as Role,
    });
    if (!updated) return null;

    const user = (await this.userRepo.findById(session.userId))!;
    return this.buildAuthContext(user, updated, memberships);
  }

  async signOut(token: string): Promise<boolean> {
    const tokenHash = hashSessionToken(token);
    return this.sessionRepo.deleteByTokenHash(tokenHash);
  }

  private async buildAuthContext(
    user: User,
    session: Session,
    memberships: OrganizationMembership[]
  ): Promise<AuthContext> {
    let activeOrgInfo: { organizationId: string; name: string; role: Role } | null = null;

    if (session.activeOrganizationId) {
      const ngoRepo = getNGORepository();
      const ngo = await ngoRepo.findById(session.activeOrganizationId);
      activeOrgInfo = {
        organizationId: session.activeOrganizationId,
        name: ngo?.organisation_name || session.activeOrganizationId,
        role: session.activeRole,
      };
    }

    const permissions = [...(ROLE_PERMISSIONS[session.activeRole] || [])];

    // Strip secrets from user model for safe client transmission
    const { passwordHash: _p, salt: _s, ...safeUser } = user;
    const { tokenHash: _th, ...safeSession } = session;

    return {
      user: safeUser,
      session: safeSession,
      memberships,
      activeOrganization: activeOrgInfo,
      permissions,
    };
  }
}
