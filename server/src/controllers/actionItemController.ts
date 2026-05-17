import mongoose from "mongoose";
import { ActionItem, type ActionItemPriority, type ActionItemStatus } from "../models/ActionItem.js";
import { Vendor } from "../models/Vendor.js";
import { cleanNumber, cleanString } from "../middleware/validate.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";

const actionStatuses = new Set<ActionItemStatus>(["open", "in_progress", "done"]);
const actionPriorities = new Set<ActionItemPriority>(["low", "medium", "high"]);

export const listActionItems = asyncHandler(async (req, res) => {
  const status = cleanString(req.query.status, { field: "Status", max: 40 });
  const filter: Record<string, unknown> = { companyId: req.companyId };

  if (status && status !== "all") {
    filter.status = cleanActionStatus(status);
  }

  const actions = await ActionItem.find(filter)
    .populate("createdBy", "name email role")
    .sort({ status: 1, createdAt: -1 })
    .lean();

  res.json({ actions: actions.map(serializeActionItem) });
});

export const createActionItem = asyncHandler(async (req, res) => {
  const vendorName = cleanString(req.body.vendorName, { required: true, field: "Vendor name", max: 140 });
  const title = cleanString(req.body.title, { required: true, field: "Title", max: 180 });
  const detail = cleanString(req.body.detail, { field: "Detail", max: 1000 });
  const signalType = cleanString(req.body.signalType, { field: "Signal type", max: 80 });
  const priority = cleanActionPriority(req.body.priority);
  const impact = cleanNumber(req.body.impact, { field: "Impact", min: 0, max: 100000000 }) ?? 0;
  const vendorId = cleanVendorId(req.body.vendorId);

  if (vendorId) {
    const vendorExists = await Vendor.exists({ _id: vendorId, company: req.companyId });
    if (!vendorExists) {
      throw new AppError("Vendor not found", 404);
    }
  }

  const action = await ActionItem.create({
    companyId: req.companyId,
    vendorId,
    vendorName,
    title,
    detail,
    signalType,
    impact,
    priority,
    status: "open",
    createdBy: req.user?._id,
  });

  await recordAuditLog(req, {
    action: "action_item.created",
    resourceType: "action_item",
    resourceId: action._id,
    metadata: { vendorName, signalType, impact, priority },
  });
  await recordActivity(req, {
    action: "action_item.created",
    entityType: "action_item",
    entityId: action._id,
    entityName: title,
    metadata: { vendorName, signalType, impact, priority },
  });

  const populated = await action.populate("createdBy", "name email role");
  res.status(201).json({ action: serializeActionItem(populated) });
});

export const updateActionItem = asyncHandler(async (req, res) => {
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
  ).populate("createdBy", "name email role");

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

export const deleteActionItem = asyncHandler(async (req, res) => {
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
    completedAt: action.completedAt,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}
