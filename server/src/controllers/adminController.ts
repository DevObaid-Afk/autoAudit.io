import { EmailLog } from "../models/EmailLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listEmailLogs = asyncHandler(async (_req, res) => {
  const emailLogs = await EmailLog.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ emailLogs });
});
