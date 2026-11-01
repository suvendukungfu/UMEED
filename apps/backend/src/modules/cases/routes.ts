import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireAuth, requireCoordinator } from "../../plugins/auth.js";
import { Case, CreateCaseInputSchema } from "@umeed/contracts";
import crypto from "crypto";

export async function caseRoutes(fastify: FastifyInstance) {
  // List Cases
  fastify.get("/v1/cases", { preHandler: requireAuth }, async (request, reply) => {
    const db = await getDatabase();
    const query = request.query as { status?: string };
    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.case_status = query.status;
    }

    // Tenancy isolation: Coordinators can view all cases. Responders/NGO operators only view cases assigned to their NGO.
    if (!request.isCoordinator) {
      if (!request.ngoId) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "User is not associated with an authorized organization." }
        });
      }
      filter.$or = [
        { "assignments.assigned_ngo_id": request.ngoId },
        { "assignments.assignedNgoId": request.ngoId }
      ];
    }

    const cases = await db.collection("cases").find(filter).sort({ created_at: -1 }).toArray();
    return reply.status(200).send({
      status: "success",
      data: {
        cases,
        total: cases.length,
      },
      cases,
      total: cases.length
    });
  });

  // Get Case Detail
  fastify.get("/v1/cases/:caseReference", { preHandler: requireAuth }, async (request, reply) => {
    const { caseReference } = request.params as { caseReference: string };
    const db = await getDatabase();
    const caseDoc = await db.collection<Case>("cases").findOne({
      $or: [{ public_case_reference: caseReference }, { case_id: caseReference }]
    });

    if (!caseDoc) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Case ${caseReference} not found.` }
      });
    }

    // Tenancy isolation check: Non-coordinators can only inspect cases assigned to their NGO
    if (!request.isCoordinator) {
      const isAssigned = caseDoc.assignments?.some(
        (a) => (a as any).assigned_ngo_id === request.ngoId || (a as any).assignedNgoId === request.ngoId
      );
      if (!isAssigned) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Case access restricted to assigned responder organization." }
        });
      }
    }

    return reply.status(200).send(caseDoc);
  });

  // Create Case (from verified incident)
  fastify.post("/v1/cases", { preHandler: requireCoordinator }, async (request, reply) => {
    const parseResult = CreateCaseInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid case payload.", details: parseResult.error.issues }
      });
    }

    const payload = parseResult.data;
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const publicCaseReference = `CASE-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const newCase: Case = {
      case_id: `case_${crypto.randomUUID()}`,
      incident_id: payload.incident_public_reference,
      incident_reference: payload.incident_public_reference,
      public_case_reference: publicCaseReference,
      case_status: "APPROVED",
      assistance_requirements: payload.assistance_requirements || ["General Assistance"],
      unresolved_requirements: payload.assistance_requirements || ["General Assistance"],
      assignments: [],
      interventions: [],
      current_matching_cycle: 1,
      max_matching_cycles: payload.max_matching_cycles || 3,
      created_by: request.user?.userId || "coordinator",
      approved_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      resolved_at: null,
      resolution_evidence: [],
      resolution_decision: null
    };

    await db.collection("cases").insertOne(newCase);

    return reply.status(201).send({
      status: "success",
      message: "Case created successfully",
      data: newCase,
      ...newCase,
    });
  });

  // Resolve Case
  fastify.post("/v1/cases/:caseReference/resolve", { preHandler: requireCoordinator }, async (request, reply) => {
    const { caseReference } = request.params as { caseReference: string };
    const body = request.body as { resolutionEvidence?: string[]; outcomeNotes?: string };

    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("cases").findOneAndUpdate(
      { $or: [{ public_case_reference: caseReference }, { case_id: caseReference }] },
      {
        $set: {
          case_status: "RESOLVED",
          resolved_at: nowIso,
          updated_at: nowIso,
          resolution_evidence: body?.resolutionEvidence || [],
          resolution_decision: {
            decision: "RESOLVED",
            rationale: body?.outcomeNotes || "Case resolved by authorized coordinator review",
            resolved_by: request.user?.userId || "coordinator",
            timestamp: nowIso
          }
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Case ${caseReference} not found.` }
      });
    }

    return reply.status(200).send({ success: true, case: result });
  });

  // Match NGOs to Case
  fastify.post("/v1/cases/:caseReference/match", { preHandler: requireCoordinator }, async (request, reply) => {
    const { caseReference } = request.params as { caseReference: string };
    const db = await getDatabase();
    const caseDoc = await db.collection("cases").findOne({
      $or: [{ public_case_reference: caseReference }, { case_id: caseReference }]
    });

    if (!caseDoc) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Case ${caseReference} not found.` }
      });
    }

    // Find verified NGOs capable of assisting
    const matchingNgos = await db.collection("ngos").find({
      $or: [{ verification_status: "VERIFIED" }, { verificationStatus: "VERIFIED" }]
    }).limit(5).toArray();

    return reply.status(200).send({
      success: true,
      caseReference,
      matches: matchingNgos.map(ngo => ({
        ngoId: (ngo as any).ngo_id || (ngo as any).id,
        name: ngo.name,
        matchScore: 0.95,
        capabilities: (ngo as any).capabilities || [],
      })),
    });
  });

  // Assign Case to NGO
  fastify.post("/v1/cases/:caseReference/assignments", { preHandler: requireCoordinator }, async (request, reply) => {
    const { caseReference } = request.params as { caseReference: string };
    const body = request.body as { ngoId: string; priority?: string; notes?: string };

    if (!body || !body.ngoId) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "ngoId is required." }
      });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const assignmentId = `asgn_${crypto.randomUUID()}`;

    const assignment = {
      id: assignmentId,
      caseReference,
      assignedNgoId: body.ngoId,
      assigned_ngo_id: body.ngoId,
      status: "PENDING",
      priority: body.priority || "HIGH",
      notes: body.notes || "",
      assignedAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = await db.collection("cases").findOneAndUpdate(
      { $or: [{ public_case_reference: caseReference }, { case_id: caseReference }] },
      {
        $push: { assignments: assignment as any },
        $set: { updated_at: nowIso }
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Case ${caseReference} not found.` }
      });
    }

    // Also persist to assignments collection for responder queries
    await db.collection("assignments").insertOne(assignment);

    return reply.status(201).send({ success: true, assignment, case: updated });
  });

  // Reopen Case
  fastify.post("/v1/cases/:caseReference/reopen", { preHandler: requireCoordinator }, async (request, reply) => {
    const { caseReference } = request.params as { caseReference: string };
    const body = request.body as { reason?: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("cases").findOneAndUpdate(
      { $or: [{ public_case_reference: caseReference }, { case_id: caseReference }] },
      {
        $set: {
          case_status: "REOPENED",
          reopened_at: nowIso,
          updated_at: nowIso,
          reopen_reason: body?.reason || "Case reopened by coordinator",
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Case ${caseReference} not found.` }
      });
    }

    return reply.status(200).send({ success: true, case: result });
  });

  // Follow-Up on Case
  fastify.post("/v1/cases/:caseReference/follow-up", { preHandler: requireAuth }, async (request, reply) => {
    const { caseReference } = request.params as { caseReference: string };
    const body = request.body as { notes: string; scheduledAt?: string };

    if (!body || !body.notes) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "notes are required for follow-up." }
      });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const followUp = {
      id: `fup_${crypto.randomUUID()}`,
      author: request.user?.userId || "user",
      role: request.activeRole || "COORDINATOR",
      notes: body.notes,
      scheduledAt: body.scheduledAt || nowIso,
      createdAt: nowIso,
    };

    const result = await db.collection("cases").findOneAndUpdate(
      { $or: [{ public_case_reference: caseReference }, { case_id: caseReference }] },
      {
        $push: { follow_ups: followUp as any },
        $set: { updated_at: nowIso }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Case ${caseReference} not found.` }
      });
    }

    return reply.status(200).send({ success: true, followUp, case: result });
  });
}
