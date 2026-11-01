import { buildApp } from "./app.js";
import { getBackendEnv } from "./config/env.js";
import { closeDatabaseClient } from "./plugins/database.js";
import { startWorkerLoop } from "./worker.js";

async function main() {
  const env = getBackendEnv();
  const app = await buildApp();

  let worker: { stop: () => void } | null = null;
  if (process.env.START_WORKER !== "false") {
    app.log.info("Starting background worker loop within server process...");
    worker = startWorkerLoop();
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    if (worker) {
      worker.stop();
    }
    try {
      await app.close();
      await closeDatabaseClient();
      app.log.info("Server and database connections closed successfully.");
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 UMEED Backend API running at ${address}`);
  } catch (err) {
    app.log.error(err, "Fatal error during startup");
    process.exit(1);
  }
}

main();

