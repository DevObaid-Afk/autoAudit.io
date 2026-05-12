import { connectDatabase } from "./src/config/db.js";
import { env, validateEnv } from "./src/config/env.js";
import { initSentry } from "./src/config/sentry.js";
import { createApp } from "./src/app.js";

validateEnv();
initSentry();

const app = createApp();

try {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`AutoAudit API listening on port ${env.port}`);
  });
} catch (error) {
  console.error("Failed to start AutoAudit API", error);
  process.exit(1);
}
