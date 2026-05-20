import cron from "node-cron";
import { sendDailyUrgentRenewalAlerts } from "../services/urgentRenewalAlertService.js";

export function startUrgentRenewalAlertJob() {
  return cron.schedule(
    "0 9 * * *",
    async () => {
      try {
        const result = await sendDailyUrgentRenewalAlerts();
        console.log(`Urgent renewal alerts completed: ${result.sent} sent, ${result.skipped} skipped`);
      } catch (error) {
        console.error("Urgent renewal alerts failed", error);
      }
    },
    { timezone: "UTC" },
  );
}
