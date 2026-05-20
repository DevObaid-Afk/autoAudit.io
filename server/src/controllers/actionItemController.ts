import mongoose from "mongoose";
import { ActionItem, type ActionItemPriority, type ActionItemStatus } from "../models/ActionItem.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { Vendor } from "../models/Vendor.js";
import { cleanDate, cleanNumber, cleanString } from "../middleware/validate.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { trackActivationEvent } from "../services/activationAnalytics.js";

const actionStatuses = new Set<ActionItemStatus>(["open", "in_progress", "done"]);
const actionPriorities = new Set<ActionItemPriority>(["low", "medium", "high"]);

export const listActionItems = asyncHandler(async (req: any, res: any) => {
  const status = cleanString(req.query.status, { field: "Status", max: 40 });
  const filter: Record<string, unknown> = { companyId: req.companyId };

  if (status && status !== "all") {
    filter.status = cleanActionStatus(status);
  }

  const actions = await ActionItem.find(filter)
    .populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource")
    .sort({ status: 1, createdAt: -1 })
    .lean();

  res.json({ actions: actions.map(serializeActionItem) });
});

export const createActionItem = asyncHandler(async (req: any, res: any) => {
  const vendorName = cleanString(req.body.vendorName, { required: true, field: "Vendor name", max: 140 });
  const title = cleanString(req.body.title, { required: true, field: "Title", max: 180 });
  const detail = cleanString(req.body.detail, { field: "Detail", max: 1000 });
  const signalType = cleanString(req.body.signalType, { field: "Signal type", max: 80 });
  const priority = cleanActionPriority(req.body.priority);
  const impact = cleanNumber(req.body.impact, { field: "Impact", min: 0, max: 100000000 }) ?? 0;
  const estimatedSavings = cleanNumber(req.body.estimatedSavings, { field: "Estimated savings", min: 0, max: 100000000 }) ?? impact;
  const dueDate = cleanDate(req.body.dueDate, { field: "Due date" });
  const assignedTo = cleanUserId(req.body.assignedTo);
  const vendorId = cleanVendorId(req.body.vendorId);

  if (vendorId) {
    const vendorExists = await Vendor.exists({ _id: vendorId, company: req.companyId });
    if (!vendorExists) {
      throw new AppError("Vendor not found", 404);
    }
  }

  if (assignedTo) {
    await assertCompanyUser(assignedTo, req.companyId);
  }

  const company = await Company.findById(req.companyId).lean();
  const approvalThreshold = Number(company?.settings?.requireCfoApprovalAbove ?? 0);
  const approvalStatus = approvalThreshold > 0 && estimatedSavings > approvalThreshold ? "pending" : "not_required";

  const action = await ActionItem.create({
    companyId: req.companyId,
    vendorId,
    vendorName,
    title,
    detail,
    signalType,
    impact,
    estimatedSavings,
    priority,
    status: "open",
    createdBy: req.user?._id,
    assignedTo,
    dueDate,
    approvalStatus,
  });

  await recordAuditLog(req, {
    action: "action_item.created",
    resourceType: "action_item",
    resourceId: action._id,
    metadata: { vendorName, signalType, impact, estimatedSavings, priority, approvalStatus },
  });
  await recordActivity(req, {
    action: "action_item.created",
    entityType: "action_item",
    entityId: action._id,
    entityName: title,
    metadata: { vendorName, signalType, impact, estimatedSavings, priority, approvalStatus },
  });
  await trackActivationEvent({
    req,
    eventName: "action_item_created",
    properties: { signalType: signalType ?? "unknown", impact },
  });

  const populated = await action.populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");
  res.status(201).json({ action: serializeActionItem(populated) });
});

export const updateActionItem = asyncHandler(async (req: any, res: any) => {
  const status = cleanActionStatus(req.body.status);
  const update: Record<string, unknown> = { status };

  if (status === "done") {
    update.completedAt = new Date();
  } else {
    update.completedAt = undefined;
  }

  const action = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { $set: update },
    { new: true, runValidators: true },
  ).populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  await recordActivity(req, {
    action: "action_item.status_changed",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { status },
  });

  res.json({ action: serializeActionItem(action) });
});

export const assignActionItem = asyncHandler(async (req: any, res: any) => {
  const assignedTo = cleanUserId(req.body.assignedTo);
  const dueDate = cleanDate(req.body.dueDate, { field: "Due date" });

  if (assignedTo) {
    await assertCompanyUser(assignedTo, req.companyId);
  }

  const update: Record<string, unknown> = { assignedTo: assignedTo ?? null };
  if (req.body.dueDate !== undefined) update.dueDate = dueDate ?? null;

  const action = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { $set: update },
    { new: true, runValidators: true },
  ).populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  await recordActivity(req, {
    action: "action_item.assigned",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { assignedTo, dueDate },
  });

  res.json({ action: serializeActionItem(action) });
});

export const approveActionItem = asyncHandler(async (req: any, res: any) => {
  const action = await ActionItem.findOne({ _id: req.params.id, companyId: req.companyId });

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  if (action.approvalStatus !== "pending") {
    throw new AppError("Only pending action items can be approved", 400);
  }

  action.approvalStatus = "approved";
  action.approvedBy = req.user?._id;
  action.approvedAt = new Date();
  action.rejectionReason = undefined;
  await action.save();
  await action.populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");

  await recordActivity(req, {
    action: "action_item.approved",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { approvedBy: req.user?._id },
  });

  res.json({ action: serializeActionItem(action) });
});

export const rejectActionItem = asyncHandler(async (req: any, res: any) => {
  const rejectionReason = cleanString(req.body.rejectionReason ?? req.body.reason, { required: true, field: "Rejection reason", max: 1000 });
  const action = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    {
      $set: {
        approvalStatus: "rejected",
        rejectionReason,
        approvedBy: req.user?._id,
        approvedAt: new Date(),
      },
    },
    { new: true, runValidators: true },
  ).populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  await recordActivity(req, {
    action: "action_item.rejected",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { rejectionReason },
  });

  res.json({ action: serializeActionItem(action) });
});

export const addActionItemComment = asyncHandler(async (req: any, res: any) => {
  const text = cleanString(req.body.text, { required: true, field: "Comment", max: 1000 }) as string;
  const action = await ActionItem.findOne({ _id: req.params.id, companyId: req.companyId });

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  if (action.comments.length >= 100) {
    throw new AppError("Action items support up to 100 comments", 400);
  }

  action.comments.push({ author: req.user._id, text, createdAt: new Date() });
  await action.save();
  await action.populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");

  await recordActivity(req, {
    action: "action_item.commented",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { commentLength: text.length },
  });

  res.status(201).json({ action: serializeActionItem(action) });
});

export const completeActionItem = asyncHandler(async (req: any, res: any) => {
  const confirmedSavings = cleanNumber(req.body.confirmedSavings, { field: "Confirmed savings", min: 0, max: 100000000 });
  const action = await ActionItem.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    {
      $set: {
        status: "done",
        completedAt: new Date(),
        ...(confirmedSavings !== undefined ? { confirmedSavings } : {}),
      },
    },
    { new: true, runValidators: true },
  ).populate("createdBy assignedTo approvedBy comments.author", "name email role avatarUrl avatarSource");

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  await recordActivity(req, {
    action: "action_item.completed",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { confirmedSavings },
  });

  res.json({ action: serializeActionItem(action) });
});

export const deleteActionItem = asyncHandler(async (req: any, res: any) => {
  const action = await ActionItem.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });

  if (!action) {
    throw new AppError("Action item not found", 404);
  }

  await recordActivity(req, {
    action: "action_item.deleted",
    entityType: "action_item",
    entityId: action._id,
    entityName: action.title,
    metadata: { vendorName: action.vendorName },
  });

  res.status(204).send();
});

function cleanVendorId(value: unknown) {
  if (!value) return undefined;
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError("Vendor ID is invalid", 400);
  }

  return value;
}

function cleanUserId(value: unknown) {
  if (!value) return undefined;
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError("User ID is invalid", 400);
  }

  return value;
}

async function assertCompanyUser(userId: string, companyId: unknown) {
  const user = await User.exists({ _id: userId, company: companyId as any });
  if (!user) {
    throw new AppError("Assigned user must belong to this company", 404);
  }
}

function cleanActionStatus(value: unknown): ActionItemStatus {
  if (typeof value === "string" && actionStatuses.has(value as ActionItemStatus)) {
    return value as ActionItemStatus;
  }

  throw new AppError("Action status must be open, in_progress, or done", 400);
}

function cleanActionPriority(value: unknown): ActionItemPriority {
  if (value === undefined || value === null || value === "") {
    return "medium";
  }

  if (typeof value === "string" && actionPriorities.has(value as ActionItemPriority)) {
    return value as ActionItemPriority;
  }

  throw new AppError("Action priority must be low, medium, or high", 400);
}

function serializeActionItem(action: any) {
  return {
    id: action._id,
    companyId: action.companyId,
    vendorId: action.vendorId,
    vendorName: action.vendorName,
    title: action.title,
    detail: action.detail,
    signalType: action.signalType,
    impact: action.impact,
    priority: action.priority,
    status: action.status,
    createdBy: action.createdBy,
    assignedTo: action.assignedTo,
    dueDate: action.dueDate,
    approvalStatus: action.approvalStatus,
    approvedBy: action.approvedBy,
    approvedAt: action.approvedAt,
    rejectionReason: action.rejectionReason,
    comments: action.comments ?? [],
    estimatedSavings: action.estimatedSavings ?? action.impact ?? 0,
    confirmedSavings: action.confirmedSavings,
    completedAt: action.completedAt,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}
