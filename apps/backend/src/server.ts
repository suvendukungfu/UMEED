import { buildApp } from "./app.js";
import { getBackendEnv } from "./config/env.js";
import { closeDatabaseClient } from "./plugins/database.js";

async function main() {
  const env = getBackendEnv();
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
    try {
      await app.close();
      await closeDatabaseClient();
      app.log.info("Server closed successfully.");
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
    app.log.info(`🚀 UMEED Backend API running in region '${env.FLY_REGION}' at ${address}`);
  } catch (err) {
    app.log.error(err, "Fatal error during startup");
    process.exit(1);
  }
}

main();

