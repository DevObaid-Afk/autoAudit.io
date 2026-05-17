import cron from "node-cron";
import { sendWeeklyRenewalDigests } from "../services/renewalDigestService.js";

export function startWeeklyRenewalDigestJob() {
  return cron.schedule(
    "0 8 * * 1",
    async () => {
      try {
        const result = await sendWeeklyRenewalDigests();
        console.log(`Weekly renewal digest completed: ${result.sent} sent, ${result.skipped} skipped`);
      } catch (error) {
        console.error("Weekly renewal digest failed", error);
      }
    },
    { timezone: "UTC" },
  );
}
