import { ActivityLog, type ActivityEntityType } from "../models/ActivityLog.js";

type ActivityInput = {
  action: string;
  entityType: ActivityEntityType;
  entityId?: any;
  entityName?: string;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(req, { action, entityType, entityId, entityName, metadata = {} }: ActivityInput) {
  if (!req.companyId) return;

  await ActivityLog.create({
    companyId: req.companyId,
    userId: req.user?._id,
    userEmail: req.user?.email,
    action,
    entityType,
    entityId,
    entityName,
    metadata,
  });
}
