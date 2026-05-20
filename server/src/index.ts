import { connectDatabase } from "./config/db.js";
import { env, validateEnv } from "./config/env.js";
import { initSentry } from "./config/sentry.js";
import { createApp } from "./app.js";
import { startUrgentRenewalAlertJob } from "./jobs/urgentRenewalAlertJob.js";
import { startWeeklyRenewalDigestJob } from "./jobs/weeklyRenewalDigestJob.js";

validateEnv();
initSentry();

const app = createApp();

try {
  await connectDatabase();
  startWeeklyRenewalDigestJob();
  startUrgentRenewalAlertJob();

  app.listen(env.port, () => {
    console.log(`AutoAudit API listening on port ${env.port}`);
  });
} catch (error) {
  console.error("Failed to start AutoAudit API", error);
  process.exit(1);
}
