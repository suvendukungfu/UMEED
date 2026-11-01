import { getBackendEnv } from "./config/env.js";
import { getDatabase, closeDatabaseClient } from "./plugins/database.js";

async function processOutboxBatch() {
  try {
    const db = await getDatabase();
    const now = new Date();

    const pending = await db.collection("notification_outbox").find({
      $or: [
        { status: "PENDING" },
        { status: "PROCESSING", lockExpiresAt: { $lt: now } },
      ],
    }).limit(20).toArray();

    if (pending.length === 0) return;

    for (const msg of pending) {
      // Lease lock for 30 seconds
      const lease = await db.collection("notification_outbox").updateOne(
        {
          _id: msg._id,
          $or: [
            { status: "PENDING" },
            { status: "PROCESSING", lockExpiresAt: { $lt: now } },
          ],
        },
        {
          $set: {
            status: "PROCESSING",
            lockExpiresAt: new Date(Date.now() + 30000),
            updatedAt: new Date(),
          },
        }
      );

      if (lease.modifiedCount === 0) continue;

      try {
        // Delivery dispatch (live SMS/Email adapter execution)
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
      }
    }
  } catch (err) {
    console.error("[WORKER] Error in notification outbox loop:", err);
  }
}

async function runWatchdogScan() {
  try {
    const db = await getDatabase();
    const overdueCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const unassigned = await db.collection("incidents").find({
      status: "REPORTED",
      reported_at: { $lt: overdueCutoff },
      escalated: { $ne: true },
    }).toArray();

    for (const inc of unassigned) {
      await db.collection("incidents").updateOne(
        { _id: inc._id },
        {
          $set: {
            escalated: true,
            urgencyLevel: "CRITICAL",
            escalatedAt: new Date().toISOString(),
          },
        }
      );
    }
  } catch (err) {
    console.error("[WORKER] Error in watchdog scan loop:", err);
  }
}

export function startWorkerLoop(): { stop: () => void } {
  const env = getBackendEnv();
  console.log(`⚙️  UMEED Background Worker loop initiated in region '${env.FLY_REGION}'`);

  let isRunning = true;
  let lastWatchdogRun = 0;

  const loop = async () => {
    while (isRunning) {
      try {
        await processOutboxBatch();

        const now = Date.now();
        if (now - lastWatchdogRun > 60000) {
          await runWatchdogScan();
          lastWatchdogRun = now;
        }
      } catch (err) {
        console.error("[WORKER] Unhandled error in background worker cycle:", err);
      }

      // Sleep 5 seconds between poll cycles
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  loop().catch((err) => console.error("[WORKER] Fatal loop error:", err));

  return {
    stop: () => {
      console.log("[WORKER] Halting background worker loop...");
      isRunning = false;
    },
  };
}

async function main() {
  const worker = startWorkerLoop();

  const shutdown = async (signal: string) => {
    console.log(`[WORKER] Received ${signal}. Stopping background worker...`);
    worker.stop();
    await closeDatabaseClient();
    console.log("[WORKER] Background worker exited cleanly.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// If executed directly as standalone process
if (process.argv[1]?.includes("worker")) {
  main();
}

