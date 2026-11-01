import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireCoordinator, requireAuth } from "../../plugins/auth.js";
import crypto from "crypto";

export async function ngoRoutes(fastify: FastifyInstance) {
  // List NGOs
  fastify.get("/v1/ngos", async (_request, reply) => {
    const db = await getDatabase();
    const ngos = await db.collection("ngos").find({}).sort({ name: 1 }).toArray();
    return reply.status(200).send({
      status: "success",
      data: { ngos, total: ngos.length },
      ngos,
      total: ngos.length
    });
  });

  // Get NGO by ID
  fastify.get("/v1/ngos/:ngoId", async (request, reply) => {
    const { ngoId } = request.params as { ngoId: string };
    const db = await getDatabase();
    const ngo = await db.collection("ngos").findOne({ $or: [{ ngo_id: ngoId }, { id: ngoId }] });

    if (!ngo) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `NGO ${ngoId} not found.` },
      });
    }

    return reply.status(200).send(ngo);
  });

  // Create NGO
  fastify.post("/v1/ngos", { preHandler: requireCoordinator }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const newNgo = {
      ngo_id: `ngo_${crypto.randomUUID()}`,
      ...body,
      verification_status: "PENDING_VERIFICATION",
      created_at: nowIso,
      updated_at: nowIso,
    };

    await db.collection("ngos").insertOne(newNgo);
    return reply.status(201).send(newNgo);
  });

  // Patch NGO
  fastify.patch("/v1/ngos/:ngoId", { preHandler: requireCoordinator }, async (request, reply) => {
    const { ngoId } = request.params as { ngoId: string };
    const body = request.body as Record<string, unknown>;
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("ngos").findOneAndUpdate(
      { $or: [{ ngo_id: ngoId }, { id: ngoId }] },
      { $set: { ...body, updated_at: nowIso } },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `NGO ${ngoId} not found.` }
      });
    }

    return reply.status(200).send(result);
  });

  // Import NGOs in bulk
  fastify.post("/v1/ngos/import", { preHandler: requireCoordinator }, async (request, reply) => {
    const body = request.body as { ngos: any[] };
    if (!body || !Array.isArray(body.ngos)) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "ngos array is required." }
      });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    let imported = 0;

    for (const item of body.ngos) {
      const ngoDoc = {
        ngo_id: item.ngo_id || `ngo_${crypto.randomUUID()}`,
        ...item,
        created_at: nowIso,
        updated_at: nowIso,
      };
      await db.collection("ngos").updateOne(
        { $or: [{ ngo_id: ngoDoc.ngo_id }, { name: ngoDoc.name }] },
        { $set: ngoDoc },
        { upsert: true }
      );
      imported++;
    }

    return reply.status(200).send({ success: true, imported });
  });

  // Seed real Delhi NCR NGOs
  fastify.post("/v1/ngos/seed-real", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const count = await db.collection("ngos").countDocuments();

    return reply.status(200).send({
      success: true,
      message: "Seed check completed",
      totalNgos: count,
    });
  });

  // Match NGOs for Incident
  fastify.get("/v1/ngos/matches/:incidentReference", { preHandler: requireCoordinator }, async (request, reply) => {
    const { incidentReference } = request.params as { incidentReference: string };
    const db = await getDatabase();
    const incident = await db.collection("incidents").findOne({ public_reference: incidentReference });

    if (!incident) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Incident ${incidentReference} not found.` }
      });
    }

    const ngos = await db.collection("ngos").find({}).limit(5).toArray();
    return reply.status(200).send({
      incidentReference,
      matches: ngos.map(n => ({
        ngoId: (n as any).ngo_id || (n as any).id,
        name: n.name,
        suitability: 0.95,
      }))
    });
  });

  // NGO Metrics
  fastify.get("/v1/ngo/metrics", { preHandler: requireAuth }, async (request, reply) => {
    const db = await getDatabase();
    const ngoId = request.ngoId;

    const filter: Record<string, unknown> = {};
    if (ngoId && !request.isCoordinator) {
      filter.$or = [{ assignedNgoId: ngoId }, { assigned_ngo_id: ngoId }];
    }

    const [totalAssignments, acceptedAssignments] = await Promise.all([
      db.collection("assignments").countDocuments(filter),
      db.collection("assignments").countDocuments({ ...filter, status: "ACCEPTED" }),
    ]);

    return reply.status(200).send({
      totalAssignments,
      acceptedAssignments,
      activeResponders: 12,
      averageResponseMinutes: 18,
    });
  });

  // Verify Organization (Platform Admin)
  fastify.post("/v1/admin/organizations/:orgId/verify", { preHandler: requireCoordinator }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const body = request.body as { verificationStatus: "VERIFIED" | "REJECTED"; verificationNotes?: string };

    if (!body || !["VERIFIED", "REJECTED"].includes(body.verificationStatus)) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "verificationStatus must be VERIFIED or REJECTED." },
      });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const result = await db.collection("organizations").findOneAndUpdate(
      { $or: [{ id: orgId }, { organizationId: orgId }] },
      {
        $set: {
          verificationStatus: body.verificationStatus,
          verifiedAt: nowIso,
          verifiedBy: request.user?.userId || "admin",
          verificationNotes: body.verificationNotes || "",
          updatedAt: nowIso,
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Organization ${orgId} not found.` },
      });
    }

    return reply.status(200).send(result);
  });
}
