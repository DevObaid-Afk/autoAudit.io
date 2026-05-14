import { AnalyticsEvent } from "../models/AnalyticsEvent.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cleanString } from "../middleware/validate.js";

export const createAnalyticsEvent = asyncHandler(async (req, res) => {
  const eventName = cleanString(req.body.eventName, { required: true, field: "Event name", max: 120 });
  const path = cleanString(req.body.path, { field: "Path", max: 300 });
  const metadata = typeof req.body.metadata === "object" && req.body.metadata !== null ? req.body.metadata : {};

  await AnalyticsEvent.create({
    eventName,
    path,
    metadata,
    company: req.user?.company,
    user: req.user?._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(201).json({ ok: true });
});
