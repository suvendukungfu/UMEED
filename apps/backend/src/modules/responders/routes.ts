import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireAuth } from "../../plugins/auth.js";
import crypto from "crypto";

export async function responderRoutes(fastify: FastifyInstance) {
  // List Assignments (both /v1/assignments and /v1/responders/assignments)
  const listAssignmentsHandler = async (request: any, reply: any) => {
    const db = await getDatabase();
    const filter: Record<string, unknown> = {};

    // Tenancy scope: restrict to user's NGO
    if (!request.isCoordinator) {
      if (!request.ngoId) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "User is not associated with an authorized responder organization." }
        });
      }
      filter.$or = [
        { assignedNgoId: request.ngoId },
        { assigned_ngo_id: request.ngoId }
      ];
    }

    const assignments = await db.collection("assignments").find(filter).sort({ assignedAt: -1 }).toArray();
    return reply.status(200).send({
      status: "success",
      data: { assignments, total: assignments.length },
      assignments,
      total: assignments.length
    });
  };

  fastify.get("/v1/responders/assignments", { preHandler: requireAuth }, listAssignmentsHandler);
  fastify.get("/v1/assignments", { preHandler: requireAuth }, listAssignmentsHandler);

  // Accept Assignment (with concurrency race check)
  const acceptHandler = async (request: any, reply: any) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const db = await getDatabase();

    // Multi-tenant isolation: verify organization ownership
    const assignmentFilter: Record<string, unknown> = {
      $or: [{ id: assignmentId }, { _id: assignmentId }]
    };
    if (!request.isCoordinator) {
      if (!request.ngoId) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "User is not associated with an authorized responder organization." }
        });
      }
      assignmentFilter.$or = [
        { id: assignmentId, assignedNgoId: request.ngoId },
        { id: assignmentId, assigned_ngo_id: request.ngoId },
        { _id: assignmentId, assignedNgoId: request.ngoId },
        { _id: assignmentId, assigned_ngo_id: request.ngoId },
      ];
    }

    // Atomic compare-and-swap on status to prevent concurrent assignment races
    const existing = await db.collection("assignments").findOne(assignmentFilter);
    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found or access unauthorized.` },
      });
    }

    if (existing.status === "ACCEPTED") {
      return reply.status(200).send(existing); // Idempotent
    }

    if (existing.status !== "PENDING" && existing.status !== "assigned") {
      return reply.status(409).send({
        error: { code: "CONFLICT", message: `Assignment ${assignmentId} is already in ${existing.status} status.` }
      });
    }

    const result = await db.collection("assignments").findOneAndUpdate(
      {
        ...assignmentFilter,
        status: existing.status,
      },
      {
        $set: {
          status: "ACCEPTED",
          acceptedAt: new Date().toISOString(),
          acceptedBy: request.user?.userId || "responder",
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    return reply.status(200).send(result);
  };

  fastify.post("/v1/responders/assignments/:assignmentId/accept", { preHandler: requireAuth }, acceptHandler);
  fastify.post("/v1/assignments/:assignmentId/accept", { preHandler: requireAuth }, acceptHandler);

  // Reject Assignment
  const rejectHandler = async (request: any, reply: any) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const body = request.body as { reason?: string };
    const db = await getDatabase();

    const assignmentFilter: Record<string, unknown> = {
      $or: [{ id: assignmentId }, { _id: assignmentId }]
    };
    if (!request.isCoordinator) {
      if (!request.ngoId) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "User is not associated with an authorized responder organization." }
        });
      }
      assignmentFilter.$or = [
        { id: assignmentId, assignedNgoId: request.ngoId },
        { id: assignmentId, assigned_ngo_id: request.ngoId },
        { _id: assignmentId, assignedNgoId: request.ngoId },
        { _id: assignmentId, assigned_ngo_id: request.ngoId },
      ];
    }

    const result = await db.collection("assignments").findOneAndUpdate(
      assignmentFilter,
      {
        $set: {
          status: "DECLINED",
          declinedAt: new Date().toISOString(),
          declineReason: body?.reason || "Declined by responder/NGO",
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found or access unauthorized.` },
      });
    }

    return reply.status(200).send(result);
  };

  fastify.post("/v1/responders/assignments/:assignmentId/reject", { preHandler: requireAuth }, rejectHandler);
  fastify.post("/v1/assignments/:assignmentId/reject", { preHandler: requireAuth }, rejectHandler);

  // Mark En-Route
  const enRouteHandler = async (request: any, reply: any) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("assignments").findOneAndUpdate(
      { $or: [{ id: assignmentId }, { _id: assignmentId }] } as any,
      {
        $set: {
          status: "EN_ROUTE",
          enRouteAt: nowIso,
          updatedAt: nowIso,
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found.` }
      });
    }

    return reply.status(200).send({ success: true, assignment: result });
  };
  fastify.post("/v1/assignments/:assignmentId/en-route", { preHandler: requireAuth }, enRouteHandler);

  // Mark Arrived
  const arrivedHandler = async (request: any, reply: any) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("assignments").findOneAndUpdate(
      { $or: [{ id: assignmentId }, { _id: assignmentId }] } as any,
      {
        $set: {
          status: "ON_SCENE",
          arrivedAt: nowIso,
          updatedAt: nowIso,
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found.` }
      });
    }

    return reply.status(200).send({ success: true, assignment: result });
  };
  fastify.post("/v1/assignments/:assignmentId/arrived", { preHandler: requireAuth }, arrivedHandler);

  // Record Interventions
  const interventionsHandler = async (request: any, reply: any) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const body = request.body as { interventionType: string; description: string; resourcesUsed?: string[] };

    if (!body || !body.interventionType) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "interventionType is required." }
      });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const intervention = {
      id: `int_${crypto.randomUUID()}`,
      interventionType: body.interventionType,
      description: body.description || "",
      resourcesUsed: body.resourcesUsed || [],
      recordedBy: request.user?.userId || "responder",
      recordedAt: nowIso,
    };

    const result = await db.collection("assignments").findOneAndUpdate(
      { $or: [{ id: assignmentId }, { _id: assignmentId }] } as any,
      {
        $push: { interventions: intervention as any },
        $set: { updatedAt: nowIso }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found.` }
      });
    }

    return reply.status(200).send({ success: true, intervention, assignment: result });
  };
  fastify.post("/v1/assignments/:assignmentId/interventions", { preHandler: requireAuth }, interventionsHandler);

  // Request Info from Coordinator
  const requestInfoHandler = async (request: any, reply: any) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const body = request.body as { question: string };

    if (!body || !body.question) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "question is required." }
      });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const infoRequest = {
      id: `inforeq_${crypto.randomUUID()}`,
      question: body.question,
      requestedBy: request.user?.userId || "responder",
      status: "PENDING_COORDINATOR_RESPONSE",
      requestedAt: nowIso,
    };

    const result = await db.collection("assignments").findOneAndUpdate(
      { $or: [{ id: assignmentId }, { _id: assignmentId }] } as any,
      {
        $push: { infoRequests: infoRequest as any },
        $set: { updatedAt: nowIso }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: `Assignment ${assignmentId} not found.` }
      });
    }

    return reply.status(200).send({ success: true, infoRequest, assignment: result });
  };
  fastify.post("/v1/assignments/:assignmentId/request-info", { preHandler: requireAuth }, requestInfoHandler);
}
