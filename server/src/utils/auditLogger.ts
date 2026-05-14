import { AuditLog } from "../models/AuditLog.js";

export async function recordAuditLog(req, { action, resourceType, resourceId, metadata = {} }) {
  if (!req.user || !req.companyId) return;

  await AuditLog.create({
    company: req.companyId,
    actor: req.user._id,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}
