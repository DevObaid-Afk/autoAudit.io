import { AuditLog } from "../models/AuditLog.js";
import { cleanString } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, parsePagination } from "../utils/query.js";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { company: req.companyId };
  const action = cleanString(req.query.action, { field: "Action", max: 120 });
  const resourceType = cleanString(req.query.resourceType, { field: "Resource type", max: 80 });

  if (action) filter.action = action;
  if (resourceType) filter.resourceType = resourceType;

  const [auditLogs, total] = await Promise.all([
    AuditLog.find(filter).populate("actor", "name email role").sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ auditLogs, pagination: buildPagination({ page, limit, total }) });
});
