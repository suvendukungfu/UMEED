import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { authenticateSession, hashSessionToken } from "../../plugins/auth.js";
import { User, Session, Role } from "@umeed/contracts";
import crypto from "crypto";

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

export async function authRoutes(fastify: FastifyInstance) {
  // Sign In
  fastify.post("/v1/auth/sign-in", async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "Email and password are required strings." }
      });
    }

    const db = await getDatabase();
    const user = await db.collection<User>("users").findOne({
      email: email.trim().toLowerCase(),
      accountState: "ACTIVE"
    });

    if (!user || !user.passwordHash || !user.salt) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid email or password." }
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid email or password." }
      });
    }

    // Create session
    const rawToken = `sess_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashSessionToken(rawToken);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const session: Session = {
      sessionId: `ses_${crypto.randomUUID()}`,
      userId: user.userId,
      tokenHash,
      activeRole: user.platformRole || "CITIZEN",
      activeOrganizationId: user.defaultOrganizationId,
      createdAt: nowIso,
      expiresAt,
      lastSeenAt: nowIso,
      ipAddress: (request.headers["x-umeed-client-ip"] as string) || request.ip,
      userAgent: request.headers["user-agent"] || "",
    };

    await db.collection<Session>("sessions").insertOne(session);

    reply.setCookie("umeed_session", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return reply.status(200).send({
      status: "success",
      message: "Authentication successful",
      data: {
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          platformRole: user.platformRole,
          accountState: user.accountState,
          defaultOrganizationId: user.defaultOrganizationId
        },
        session: {
          sessionId: session.sessionId,
          activeRole: session.activeRole,
          activeOrganizationId: session.activeOrganizationId,
          expiresAt: session.expiresAt
        }
      }
    });
  });

  // Sign Out
  fastify.post("/v1/auth/sign-out", async (request, reply) => {
    const cookieHeader = request.headers.cookie || "";
    const match = cookieHeader.match(/umeed_session=([^;]+)/);
    const token = match ? match[1] : null;

    if (token) {
      const db = await getDatabase();
      const tokenHash = hashSessionToken(token);
      await db.collection("sessions").deleteOne({ tokenHash });
    }

    reply.clearCookie("umeed_session", { path: "/" });
    return reply.status(200).send({ status: "success", message: "Signed out successfully" });
  });

  // Get Session
  fastify.get("/v1/auth/session", async (request, reply) => {
    const authed = await authenticateSession(request);
    if (!authed || !request.user || !request.session) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "No active session found." }
      });
    }

    return reply.status(200).send({
      status: "success",
      data: {
        user: {
          userId: request.user.userId,
          name: request.user.name,
          email: request.user.email,
          platformRole: request.user.platformRole,
          accountState: request.user.accountState,
          defaultOrganizationId: request.user.defaultOrganizationId
        },
        session: {
          sessionId: request.session.sessionId,
          activeRole: request.session.activeRole,
          activeOrganizationId: request.session.activeOrganizationId,
          expiresAt: request.session.expiresAt
        },
        permissions: request.permissions
      }
    });
  });

  // Switch Active Organization
  fastify.post("/v1/auth/switch-org", async (request, reply) => {
    const authed = await authenticateSession(request);
    if (!authed || !request.user || !request.session) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Active user session required." }
      });
    }

    const { organizationId } = request.body as { organizationId?: string };
    if (!organizationId || typeof organizationId !== "string") {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "organizationId string is required." }
      });
    }

    const db = await getDatabase();
    // Verify membership exists
    const membership = await db.collection("organization_memberships").findOne({
      userId: request.user.userId,
      organizationId: organizationId.trim(),
      status: "ACTIVE"
    });

    if (!membership && request.user.platformRole !== "PLATFORM_ADMIN") {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "User is not an active member of the target organization." }
      });
    }

    const targetRole = membership ? (membership as any).role : request.session.activeRole;
    await db.collection("sessions").updateOne(
      { sessionId: request.session.sessionId },
      {
        $set: {
          activeOrganizationId: organizationId.trim(),
          activeRole: targetRole,
          lastSeenAt: new Date().toISOString()
        }
      }
    );

    return reply.status(200).send({
      status: "success",
      message: "Organization switched successfully",
      data: {
        activeOrganizationId: organizationId.trim(),
        activeRole: targetRole
      }
    });
  });
}
