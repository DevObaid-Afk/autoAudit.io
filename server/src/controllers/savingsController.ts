import { SavingsEntry, type SavingsType } from "../models/SavingsEntry.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { cleanNumber, cleanString } from "../middleware/validate.js";

const savingsTypes = new Set<SavingsType>(["cancelled", "renegotiated", "seat_reduced", "other"]);

export const createSavingsEntry = asyncHandler(async (req, res) => {
  const vendorName = cleanString(req.body.vendorName, { required: true, field: "Vendor name", max: 140 });
  const vendorId = cleanString(req.body.vendorId, { field: "Vendor ID", max: 80 });
  const savingsType = cleanSavingsType(req.body.savingsType);
  const monthlySavings = cleanNumber(req.body.monthlySavings, { field: "Monthly savings", min: 0, max: 100000000 });
  const notes = cleanString(req.body.notes, { field: "Notes", max: 1000 });

  if (!monthlySavings || monthlySavings <= 0) {
    throw new AppError("Monthly savings must be greater than zero", 400);
  }

  const entry = await SavingsEntry.create({
    vendorId: vendorId || undefined,
    vendorName,
    savingsType,
    monthlySavings,
    annualSavings: monthlySavings * 12,
    confirmedBy: req.user?._id,
    confirmedAt: new Date(),
    notes,
    companyId: req.companyId,
  });

  await recordAuditLog(req, {
    action: "savings.confirmed",
    resourceType: "savings_entry",
    resourceId: entry._id,
    metadata: {
      vendorName,
      savingsType,
      monthlySavings,
      annualSavings: monthlySavings * 12,
    },
  });

  const populated = await entry.populate("confirmedBy", "name email role");
  res.status(201).json({ entry: serializeEntry(populated) });
});

export const listSavingsEntries = asyncHandler(async (req, res) => {
  const entries = await SavingsEntry.find({ companyId: req.companyId })
    .populate("confirmedBy", "name email role")
    .sort({ confirmedAt: -1 });

  res.json({ entries: entries.map(serializeEntry) });
});

export const deleteSavingsEntry = asyncHandler(async (req, res) => {
  const entry = await SavingsEntry.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });

  if (!entry) {
    throw new AppError("Savings entry not found", 404);
  }

  res.status(204).send();
});

export const getSavingsSummary = asyncHandler(async (req, res) => {
  const entries = await SavingsEntry.find({ companyId: req.companyId }).lean();
  const breakdown = Object.fromEntries(Array.from(savingsTypes).map((type) => [type, { monthlySavings: 0, annualSavings: 0, count: 0 }]));

  const summary = entries.reduce(
    (totals, entry) => {
      totals.totalMonthlySavings += Number(entry.monthlySavings ?? 0);
      totals.totalAnnualSavings += Number(entry.annualSavings ?? 0);
      totals.confirmedActionsCount += 1;

      const type = entry.savingsType as SavingsType;
      breakdown[type].monthlySavings += Number(entry.monthlySavings ?? 0);
      breakdown[type].annualSavings += Number(entry.annualSavings ?? 0);
      breakdown[type].count += 1;

      return totals;
    },
    { totalMonthlySavings: 0, totalAnnualSavings: 0, confirmedActionsCount: 0 },
  );

  res.json({ summary: { ...summary, breakdown } });
});

function cleanSavingsType(value: unknown): SavingsType {
  if (typeof value === "string" && savingsTypes.has(value as SavingsType)) {
    return value as SavingsType;
  }

  throw new AppError("Savings type must be cancelled, renegotiated, seat_reduced, or other", 400);
}

function serializeEntry(entry: any) {
  return {
    id: entry._id,
    vendorId: entry.vendorId,
    vendorName: entry.vendorName,
    savingsType: entry.savingsType,
    monthlySavings: entry.monthlySavings,
    annualSavings: entry.annualSavings,
    confirmedBy: entry.confirmedBy,
    confirmedAt: entry.confirmedAt,
    notes: entry.notes,
    companyId: entry.companyId,
  };
}
