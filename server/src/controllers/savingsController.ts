import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { SavingsEntry, type SavingsSignalType, type SavingsStatus } from "../models/SavingsEntry.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { cleanDate, cleanNumber, cleanString } from "../middleware/validate.js";

const signalTypes = new Set<SavingsSignalType>(["zombie", "unused_seats", "duplicate_tool", "negotiated_rate"]);
const statuses = new Set<SavingsStatus>(["identified", "in_progress", "realized", "dismissed"]);
const annualPlanCosts = {
  free: 0,
  starter: 49 * 12,
  standard: 89 * 12,
  growth: 199 * 12,
  enterprise: 0,
  custom: 0,
};

export const createSavingsEntry = asyncHandler(async (req: any, res: any) => {
  const vendorName = cleanString(req.body.vendorName, { required: true, field: "Vendor name", max: 140 });
  const vendorId = cleanObjectId(req.body.vendorId, "Vendor ID");
  const actionItemId = cleanObjectId(req.body.actionItemId, "Action item ID");
  const signalType = cleanSignalType(req.body.signalType ?? legacySavingsTypeToSignalType(req.body.savingsType));
  const estimatedMonthlySavings = cleanNumber(req.body.estimatedMonthlySavings ?? req.body.monthlySavings, { field: "Estimated monthly savings", min: 0, max: 100000000 }) ?? 0;
  const expectedMonthlySavings = cleanNumber(req.body.expectedMonthlySavings, { field: "Expected monthly savings", min: 0, max: 100000000 });
  const realizedMonthlySavings = cleanNumber(req.body.realizedMonthlySavings ?? req.body.monthlySavings, { field: "Realized monthly savings", min: 0, max: 100000000 });
  const status = cleanSavingsStatus(req.body.status ?? (realizedMonthlySavings ? "realized" : expectedMonthlySavings ? "in_progress" : "identified"));
  const notes = cleanString(req.body.notes, { field: "Notes", max: 1000 });
  const nextReviewDate = cleanDate(req.body.nextReviewDate, { field: "Next review date" });
  const evidence = cleanEvidence(req.body.evidence);

  if (estimatedMonthlySavings <= 0 && !expectedMonthlySavings && !realizedMonthlySavings) {
    throw new AppError("Savings entry needs an estimated, expected, or realized monthly amount", 400);
  }

  const entry = await SavingsEntry.create({
    actionItemId,
    vendorId,
    vendorName,
    signalType,
    estimatedMonthlySavings,
    estimatedAnnualSavings: estimatedMonthlySavings * 12,
    expectedMonthlySavings,
    realizedMonthlySavings: status === "realized" ? realizedMonthlySavings : undefined,
    currency: cleanString(req.body.currency, { field: "Currency", max: 3 }) ?? "USD",
    status,
    evidence,
    notes,
    realizedAt: status === "realized" ? new Date() : undefined,
    createdBy: req.user?._id,
    confirmedBy: status === "realized" ? req.user?._id : undefined,
    nextReviewDate: nextReviewDate ?? defaultNextReviewDate(status),
    companyId: req.companyId,
  });

  await recordAuditLog(req, {
    action: status === "realized" ? "savings.realized" : "savings.identified",
    resourceType: "savings_entry",
    resourceId: entry._id,
    metadata: {
      vendorName,
      signalType,
      estimatedMonthlySavings,
      expectedMonthlySavings,
      realizedMonthlySavings,
      status,
    },
  });
  await recordActivity(req, {
    action: status === "realized" ? "savings.realized" : "savings.identified",
    entityType: "savings",
    entityId: entry._id,
    entityName: vendorName,
    metadata: {
      signalType,
      estimatedMonthlySavings,
      expectedMonthlySavings,
      realizedMonthlySavings,
      status,
    },
  });

  const populated = await entry.populate("createdBy confirmedBy", "name email role");
  res.status(201).json({ entry: serializeEntry(populated) });
});

export const listSavingsEntries = asyncHandler(async (req: any, res: any) => {
  const entries = await SavingsEntry.find({ companyId: req.companyId })
    .populate("createdBy confirmedBy", "name email role")
    .sort({ status: 1, realizedAt: -1, createdAt: -1 });

  res.json({ entries: entries.map(serializeEntry) });
});

export const realizeSavingsEntry = asyncHandler(async (req: any, res: any) => {
  const realizedMonthlySavings = cleanNumber(req.body.realizedMonthlySavings, { field: "Realized monthly savings", min: 0, max: 100000000 });
  const notes = cleanString(req.body.notes, { field: "Notes", max: 1000 });

  if (!realizedMonthlySavings || realizedMonthlySavings <= 0) {
    throw new AppError("Realized monthly savings must be greater than zero", 400);
  }

  const entry = await SavingsEntry.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    {
      $set: {
        realizedMonthlySavings,
        status: "realized",
        realizedAt: new Date(),
        confirmedBy: req.user?._id,
        nextReviewDate: defaultNextReviewDate("realized"),
        ...(notes ? { notes } : {}),
      },
    },
    { new: true, runValidators: true },
  ).populate("createdBy confirmedBy", "name email role");

  if (!entry) {
    throw new AppError("Savings entry not found", 404);
  }

  await recordActivity(req, {
    action: "savings.realized",
    entityType: "savings",
    entityId: entry._id,
    entityName: entry.vendorName,
    metadata: { realizedMonthlySavings, realizedAnnualSavings: realizedMonthlySavings * 12 },
  });

  res.json({ entry: serializeEntry(entry) });
});

export const dismissSavingsEntry = asyncHandler(async (req: any, res: any) => {
  const reason = cleanString(req.body.reason ?? req.body.dismissalReason, { required: true, field: "Dismissal reason", max: 1000 });

  const entry = await SavingsEntry.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    {
      $set: {
        status: "dismissed",
        dismissalReason: reason,
        notes: reason,
      },
    },
    { new: true, runValidators: true },
  ).populate("createdBy confirmedBy", "name email role");

  if (!entry) {
    throw new AppError("Savings entry not found", 404);
  }

  await recordActivity(req, {
    action: "savings.dismissed",
    entityType: "savings",
    entityId: entry._id,
    entityName: entry.vendorName,
    metadata: { reason },
  });

  res.json({ entry: serializeEntry(entry) });
});

export const deleteSavingsEntry = asyncHandler(async (req: any, res: any) => {
  const entry = await SavingsEntry.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });

  if (!entry) {
    throw new AppError("Savings entry not found", 404);
  }

  res.status(204).send();
});

export const getSavingsSummary = asyncHandler(async (req: any, res: any) => {
  const company = await Company.findById(req.companyId).lean();
  const annualPlanCost = annualPlanCosts[company?.plan ?? "free"] ?? 0;
  const [summary] = await SavingsEntry.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(String(req.companyId)) } },
    {
      $group: {
        _id: "$companyId",
        totalEstimatedAnnualSavings: {
          $sum: { $cond: [{ $eq: ["$status", "identified"] }, "$estimatedAnnualSavings", 0] },
        },
        totalExpectedAnnualSavings: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, { $multiply: [{ $ifNull: ["$expectedMonthlySavings", 0] }, 12] }, 0] },
        },
        totalRealizedAnnualSavings: {
          $sum: { $cond: [{ $eq: ["$status", "realized"] }, { $multiply: [{ $ifNull: ["$realizedMonthlySavings", 0] }, 12] }, 0] },
        },
        allEstimatedAnnualSavings: { $sum: "$estimatedAnnualSavings" },
        identifiedCount: { $sum: { $cond: [{ $eq: ["$status", "identified"] }, 1, 0] } },
        inProgressCount: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
        realizedCount: { $sum: { $cond: [{ $eq: ["$status", "realized"] }, 1, 0] } },
        dismissedCount: { $sum: { $cond: [{ $eq: ["$status", "dismissed"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        totalEstimatedAnnualSavings: 1,
        totalExpectedAnnualSavings: 1,
        totalRealizedAnnualSavings: 1,
        identifiedCount: 1,
        inProgressCount: 1,
        realizedCount: 1,
        dismissedCount: 1,
        savingsRealizationRate: {
          $cond: [
            { $gt: ["$allEstimatedAnnualSavings", 0] },
            { $multiply: [{ $divide: ["$totalRealizedAnnualSavings", "$allEstimatedAnnualSavings"] }, 100] },
            0,
          ],
        },
      },
    },
  ]);

  const normalized = {
    totalEstimatedAnnualSavings: Number(summary?.totalEstimatedAnnualSavings ?? 0),
    totalExpectedAnnualSavings: Number(summary?.totalExpectedAnnualSavings ?? 0),
    totalRealizedAnnualSavings: Number(summary?.totalRealizedAnnualSavings ?? 0),
    savingsRealizationRate: Math.round(Number(summary?.savingsRealizationRate ?? 0)),
    AutoAuditROI: annualPlanCost > 0 ? Number((Number(summary?.totalRealizedAnnualSavings ?? 0) / annualPlanCost).toFixed(1)) : 0,
    identifiedCount: Number(summary?.identifiedCount ?? 0),
    inProgressCount: Number(summary?.inProgressCount ?? 0),
    realizedCount: Number(summary?.realizedCount ?? 0),
    dismissedCount: Number(summary?.dismissedCount ?? 0),

    // Backward-compatible fields for older UI paths.
    totalMonthlySavings: Math.round(Number(summary?.totalRealizedAnnualSavings ?? 0) / 12),
    totalAnnualSavings: Number(summary?.totalRealizedAnnualSavings ?? 0),
    confirmedActionsCount: Number(summary?.realizedCount ?? 0),
    breakdown: {},
  };

  res.json({ summary: normalized });
});

function cleanSignalType(value: unknown): SavingsSignalType {
  if (typeof value === "string" && signalTypes.has(value as SavingsSignalType)) {
    return value as SavingsSignalType;
  }

  throw new AppError("Signal type must be zombie, unused_seats, duplicate_tool, or negotiated_rate", 400);
}

function cleanSavingsStatus(value: unknown): SavingsStatus {
  if (typeof value === "string" && statuses.has(value as SavingsStatus)) {
    return value as SavingsStatus;
  }

  throw new AppError("Savings status must be identified, in_progress, realized, or dismissed", 400);
}

function cleanObjectId(value: unknown, field: string) {
  if (!value) return undefined;
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`${field} is invalid`, 400);
  }

  return value;
}

function cleanEvidence(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 20)
    .map((item) => {
      if (typeof item === "string") return { type: "evidence", value: item.slice(0, 500) };
      return {
        type: cleanString(item?.type, { field: "Evidence type", max: 80 }) ?? "evidence",
        value: cleanString(item?.value, { field: "Evidence value", max: 500 }) ?? "",
      };
    })
    .filter((item) => item.value);
}

function legacySavingsTypeToSignalType(value: unknown): SavingsSignalType {
  if (value === "cancelled") return "zombie";
  if (value === "seat_reduced") return "unused_seats";
  if (value === "renegotiated") return "negotiated_rate";
  return "negotiated_rate";
}

function defaultNextReviewDate(status: SavingsStatus) {
  if (status === "dismissed") return undefined;
  const days = status === "realized" ? 90 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function serializeEntry(entry: any) {
  const realizedAnnualSavings = Number(entry.realizedMonthlySavings ?? 0) * 12;
  return {
    id: entry._id,
    companyId: entry.companyId,
    actionItemId: entry.actionItemId,
    vendorId: entry.vendorId,
    vendorName: entry.vendorName,
    signalType: entry.signalType,
    estimatedMonthlySavings: Number(entry.estimatedMonthlySavings ?? 0),
    estimatedAnnualSavings: Number(entry.estimatedAnnualSavings ?? 0),
    expectedMonthlySavings: entry.expectedMonthlySavings,
    expectedAnnualSavings: entry.expectedMonthlySavings ? Number(entry.expectedMonthlySavings) * 12 : undefined,
    realizedMonthlySavings: entry.realizedMonthlySavings,
    realizedAnnualSavings: entry.realizedMonthlySavings ? realizedAnnualSavings : undefined,
    currency: entry.currency ?? "USD",
    status: entry.status,
    evidence: entry.evidence ?? [],
    notes: entry.notes,
    dismissalReason: entry.dismissalReason,
    realizedAt: entry.realizedAt,
    createdBy: entry.createdBy,
    confirmedBy: entry.confirmedBy,
    nextReviewDate: entry.nextReviewDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,

    // Backward-compatible fields for older PDF/export/UI paths.
    savingsType: entry.signalType,
    monthlySavings: Number(entry.realizedMonthlySavings ?? entry.expectedMonthlySavings ?? entry.estimatedMonthlySavings ?? 0),
    annualSavings: Number(entry.realizedMonthlySavings ?? entry.expectedMonthlySavings ?? entry.estimatedMonthlySavings ?? 0) * 12,
    confirmedAt: entry.realizedAt ?? entry.updatedAt ?? entry.createdAt,
  };
}
