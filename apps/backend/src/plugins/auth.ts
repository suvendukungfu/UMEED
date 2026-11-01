import { FastifyRequest, FastifyReply } from "fastify";
import { getDatabase } from "./database.js";
import { User, Session, Role } from "@umeed/contracts";
import crypto from "crypto";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    session?: Session;
    activeRole?: Role;
    permissions?: string[];
    isCoordinator?: boolean;
    isResponder?: boolean;
    ngoId?: string;
  }
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  PLATFORM_ADMIN: [
    "incident:create", "incident:read", "incident:review", "incident:export",
    "case:manage", "case:assign", "case:close",
    "ngo:onboard", "ngo:verify", "ngo:manage",
    "facility:manage", "user:manage", "system:audit", "assistance:dispatch"
  ],
  COORDINATOR: [
    "incident:read", "incident:review",
    "case:manage", "case:assign", "case:close",
    "ngo:read", "facility:read", "assistance:dispatch"
  ],
  NGO_OWNER: [
    "incident:read_assigned",
    "case:read_assigned", "case:accept", "case:update",
    "ngo:manage_self", "facility:manage_self", "responder:assign"
  ],
  NGO_ADMIN: [
    "incident:read_assigned",
    "case:read_assigned", "case:accept", "case:update",
    "ngo:manage_self", "facility:manage_self", "responder:assign"
  ],
  NGO_OPERATOR: [
    "incident:read_assigned",
    "case:read_assigned", "case:update", "evidence:upload"
  ],
  RESPONDER: [
    "incident:read_assigned",
    "case:read_assigned", "case:update", "evidence:upload"
  ],
  CITIZEN: [
    "incident:create", "incident:read_self"
  ],
  AUDITOR: [
    "incident:read", "case:read", "ngo:read", "system:audit"
  ]
};

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticateSession(request: FastifyRequest): Promise<boolean> {
  const cookieHeader = request.headers.cookie || "";
  const match = cookieHeader.match(/umeed_session=([^;]+)/);
  const token =
    (match ? match[1] : null) ||
    (request.headers["x-session-token"] as string | undefined) ||
    (request.headers.authorization?.replace(/^Bearer\s+/i, "") || null);

  if (!token) return false;

  try {
    const db = await getDatabase();
    const tokenHash = hashSessionToken(token);
    const nowIso = new Date().toISOString();
    const session = await db.collection<Session>("sessions").findOne({
      tokenHash,
      expiresAt: { $gt: nowIso }
    });

    if (!session) return false;

    const user = await db.collection<User>("users").findOne({
      userId: session.userId,
      accountState: "ACTIVE"
    });

    if (!user) return false;

    request.session = session;
    request.user = user;
    request.activeRole = session.activeRole;
    request.permissions = ROLE_PERMISSIONS[session.activeRole] || [];
    request.isCoordinator = session.activeRole === "COORDINATOR" || session.activeRole === "PLATFORM_ADMIN";
    request.isResponder = session.activeRole === "RESPONDER";
    request.ngoId = session.activeOrganizationId || undefined;

    return true;
  } catch {
    return false;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authed = await authenticateSession(request);
  if (!authed) {
    reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Active user session required.",
        status: 401,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function requireCoordinator(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authed = await authenticateSession(request);
  if (!authed || !request.isCoordinator) {
    reply.status(403).send({
      error: {
        code: "FORBIDDEN",
        message: "Coordinator or Platform Admin privileges required.",
        status: 403,
        timestamp: new Date().toISOString()
      }
    });
  }
}
