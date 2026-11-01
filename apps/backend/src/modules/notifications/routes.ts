import { FastifyInstance } from "fastify";
import { getDatabase } from "../../plugins/database.js";
import { requireCoordinator } from "../../plugins/auth.js";

export async function notificationRoutes(fastify: FastifyInstance) {
  // Batch Process Outbox
  fastify.post("/v1/notifications/process", { preHandler: requireCoordinator }, async (request, reply) => {
    const { batchSize = 10 } = (request.body as { batchSize?: number }) || {};
    const db = await getDatabase();
    const now = new Date();

    // Atomic claim of pending outbox messages
    const pending = await db.collection("notification_outbox").find({
      status: "PENDING",
      $or: [{ lockExpiresAt: { $exists: false } }, { lockExpiresAt: { $lt: now } }],
    }).limit(batchSize).toArray();

    let delivered = 0;
    let failed = 0;

    for (const msg of pending) {
      try {
        // Mark sent
        await db.collection("notification_outbox").updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "DELIVERED",
              deliveredAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
        delivered++;
      } catch (err) {
        await db.collection("notification_outbox").updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "FAILED",
              lastError: err instanceof Error ? err.message : String(err),
              updatedAt: new Date(),
            },
          }
        );
        failed++;
      }
    }

    return reply.status(200).send({
      processed: pending.length,
      delivered,
      failed,
      timestamp: new Date().toISOString(),
    });
  });
}

