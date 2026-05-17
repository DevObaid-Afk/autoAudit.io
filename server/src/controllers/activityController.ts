import { ActivityLog } from "../models/ActivityLog.js";
import { cleanString } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, parsePagination } from "../utils/query.js";

const allowedEntityTypes = new Set(["vendor", "report", "email_draft", "savings", "team", "settings", "action_item"]);

export const listActivity = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination({ ...req.query, limit: req.query.limit ?? 50 });
  const filter: Record<string, unknown> = { companyId: req.companyId };
  const entityType = cleanString(req.query.entityType, { field: "Entity type", max: 40 });

  if (entityType && entityType !== "all" && allowedEntityTypes.has(entityType)) {
    filter.entityType = entityType;
  }

  const [activity, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ activity, pagination: buildPagination({ page, limit, total }) });
});
