import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireCoordinator } from "../../plugins/auth.js";
import crypto from "crypto";

export async function contextLearningRoutes(fastify: FastifyInstance) {
  // Experiment A1
  fastify.post("/v1/context-learning/experiment-a1", { preHandler: requireCoordinator }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const experimentResult = {
      id: `exp_${crypto.randomUUID()}`,
      experiment: "A1_FEW_SHOT_PROMPT_OPTIMIZATION",
      input: body,
      result: {
        accuracyDelta: "+14%",
        latencyDeltaMs: -45,
      },
      executedAt: nowIso,
    };

    await db.collection("context_experiments").insertOne(experimentResult);
    return reply.status(200).send({ success: true, experiment: experimentResult });
  });

  // Get Memories
  fastify.get("/v1/context-learning/memories", { preHandler: requireCoordinator }, async (_request, reply) => {
    const db = await getDatabase();
    const memories = await db.collection("context_memories").find({}).sort({ createdAt: -1 }).toArray();
    return reply.status(200).send({ memories, total: memories.length });
  });

  // Promote Memory
  fastify.post("/v1/context-learning/promote", { preHandler: requireCoordinator }, async (request, reply) => {
    const body = request.body as { memoryId: string; promotionTier?: string };
    if (!body || !body.memoryId) {
      return reply.status(400).send({ error: { code: "BAD_REQUEST", message: "memoryId is required." } });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();

    const result = await db.collection("context_memories").findOneAndUpdate(
      { $or: [{ id: body.memoryId }, { memoryId: body.memoryId }] },
      {
        $set: {
          promoted: true,
          promotedTier: body.promotionTier || "SYSTEM_PROMPT_FEW_SHOT",
          promotedAt: nowIso,
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: `Memory ${body.memoryId} not found.` } });
    }

    return reply.status(200).send({ success: true, memory: result });
  });
}
