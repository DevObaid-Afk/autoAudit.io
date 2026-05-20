import { Vendor } from "../models/Vendor.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { classifyVendorWaste } from "../services/wasteDetection.js";
import { AppError } from "../utils/AppError.js";
import { cleanDate, cleanNumber, cleanString } from "../middleware/validate.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { recordActivity } from "../utils/activityLogger.js";
import { completeOnboardingStep } from "../utils/onboarding.js";
import { buildPagination, parsePagination } from "../utils/query.js";
import { assertCanCreateVendors } from "../services/planLimits.js";
import { markAuditSummaryStale } from "../services/auditSummaryCache.js";
import { trackActivationEvent } from "../services/activationAnalytics.js";

export const listVendors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter: Record<string, unknown> = { company: req.companyId };
  const search = cleanString(req.query.search, { field: "Search", max: 120 });
  const category = cleanString(req.query.category, { field: "Category", max: 100 });
  const status = cleanString(req.query.status, { field: "Status", max: 40 });

  if (search) {
    filter.$or = [
      { name: new RegExp(escapeRegex(search), "i") },
      { category: new RegExp(escapeRegex(search), "i") },
      { ownerName: new RegExp(escapeRegex(search), "i") },
      { ownerEmail: new RegExp(escapeRegex(search), "i") },
    ];
  }
  if (category && category !== "All") filter.category = category;
  if (status && status !== "All") filter.status = status;

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort({ monthlySpend: -1, name: 1 }).skip(skip).limit(limit),
    Vendor.countDocuments(filter),
  ]);

  res.json({ vendors, pagination: buildPagination({ page, limit, total }) });
});

export const createVendor = asyncHandler(async (req, res) => {
  await assertCanCreateVendors(req.companyId);

  const input = sanitizeVendorInput(req.body, { partial: false });
  const classification = classifyVendorWaste(input);
  const vendor = await Vendor.create({
    ...input,
    ...classification,
    company: req.companyId,
  } as any);

  await recordAuditLog(req, {
    action: "vendor.created",
    resourceType: "vendor",
    resourceId: vendor._id,
    metadata: { name: vendor.name, monthlySpend: vendor.monthlySpend },
  });
  await recordActivity(req, {
    action: "vendor.created",
    entityType: "vendor",
    entityId: vendor._id,
    entityName: vendor.name,
    metadata: { monthlySpend: vendor.monthlySpend },
  });
  await completeOnboardingStep(req.companyId, "addedFirstVendor");
  await markAuditSummaryStale(req.companyId);
  const vendorCount = await Vendor.countDocuments({ company: req.companyId });
  await trackActivationEvent({
    req,
    eventName: "vendor_added",
    properties: { source: "manual", vendorCount },
  });

  res.status(201).json({ vendor });
});

export const importVendors = asyncHandler(async (req, res) => {
  const rawVendors = Array.isArray(req.body.vendors) ? req.body.vendors : [];
  if (rawVendors.length === 0) {
    throw new AppError("At least one vendor is required", 400);
  }

  await assertCanCreateVendors(req.companyId, rawVendors.length);

  const vendorsToCreate = rawVendors.map((rawVendor) => {
    const input = sanitizeVendorInput(rawVendor, { partial: false });
    const classification = classifyVendorWaste(input);
    return {
      ...input,
      ...classification,
      source: "csv",
      company: req.companyId,
    };
  });

  const vendors = await Vendor.insertMany(vendorsToCreate, { ordered: false });

  await recordAuditLog(req, {
    action: "vendor.csv_imported",
    resourceType: "vendor",
    resourceId: undefined,
    metadata: { count: vendors.length },
  });
  await recordActivity(req, {
    action: "vendor.csv_imported",
    entityType: "vendor",
    entityName: "CSV import",
    metadata: { count: vendors.length },
  });
  await completeOnboardingStep(req.companyId, "addedFirstVendor");
  await completeOnboardingStep(req.companyId, "importedCsv");
  await markAuditSummaryStale(req.companyId);
  const totalVendorCount = await Vendor.countDocuments({ company: req.companyId });
  await trackActivationEvent({
    req,
    eventName: "csv_imported",
    properties: {
      vendorCount: vendors.length,
      successCount: vendors.length,
      failCount: rawVendors.length - vendors.length,
    },
  });
  await trackActivationEvent({
    req,
    eventName: "vendor_added",
    properties: { source: "csv", vendorCount: totalVendorCount },
  });

  res.status(201).json({ vendors, count: vendors.length });
});

export const updateVendor = asyncHandler(async (req, res) => {
  const existingVendor = await Vendor.findOne({ _id: req.params.id, company: req.companyId });

  if (!existingVendor) {
    res.status(404).json({ error: { message: "Vendor not found" } });
    return;
  }

  const update = sanitizeVendorInput(req.body, { partial: true });
  const mergedVendor = { ...existingVendor.toObject(), ...update };
  const classification = classifyVendorWaste(mergedVendor);

  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId },
    { ...update, ...classification },
    { new: true, runValidators: true },
  ) as any;

  await recordAuditLog(req, {
    action: "vendor.updated",
    resourceType: "vendor",
    resourceId: vendor._id,
    metadata: { fields: Object.keys(update) },
  });
  await recordActivity(req, {
    action: "vendor.updated",
    entityType: "vendor",
    entityId: vendor._id,
    entityName: vendor.name,
    metadata: { fields: Object.keys(update) },
  });
  await markAuditSummaryStale(req.companyId);

  res.json({ vendor });
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, company: req.companyId });

  if (!vendor) {
    res.status(404).json({ error: { message: "Vendor not found" } });
    return;
  }

  await recordAuditLog(req, {
    action: "vendor.deleted",
    resourceType: "vendor",
    resourceId: vendor._id,
    metadata: { name: vendor.name },
  });
  await recordActivity(req, {
    action: "vendor.deleted",
    entityType: "vendor",
    entityId: vendor._id,
    entityName: vendor.name,
  });
  await markAuditSummaryStale(req.companyId);

  res.status(204).send();
});

export const bulkDeleteVendors = asyncHandler(async (req, res) => {
  const vendorIds = cleanVendorIds(req.body.vendorIds);
  const result = await Vendor.deleteMany({ _id: { $in: vendorIds }, company: req.companyId });

  await recordAuditLog(req, {
    action: "vendor.bulk_deleted",
    resourceType: "vendor",
    resourceId: undefined,
    metadata: { count: result.deletedCount, vendorIds },
  });
  await recordActivity(req, {
    action: "vendor.bulk_deleted",
    entityType: "vendor",
    entityName: "Bulk delete",
    metadata: { count: result.deletedCount },
  });
  await markAuditSummaryStale(req.companyId);

  res.json({ deletedCount: result.deletedCount });
});

export const clearSampleVendors = asyncHandler(async (req, res) => {
  const result = await Vendor.deleteMany({ company: req.companyId, source: "sample" });

  await recordAuditLog(req, {
    action: "vendor.sample_data_cleared",
    resourceType: "vendor",
    resourceId: undefined,
    metadata: { count: result.deletedCount },
  });
  await recordActivity(req, {
    action: "vendor.sample_data_cleared",
    entityType: "vendor",
    entityName: "Sample data",
    metadata: { count: result.deletedCount },
  });
  await markAuditSummaryStale(req.companyId);

  res.json({ deletedCount: result.deletedCount });
});

function sanitizeVendorInput(body, { partial }) {
  const input = {
    name: cleanString(body.name, { required: !partial, field: "Vendor name", max: 140 }),
    category: cleanString(body.category, { field: "Category", max: 100 }),
    ownerName: cleanString(body.ownerName, { field: "Owner name", max: 120 }),
    ownerEmail: cleanString(body.ownerEmail, { field: "Owner email", max: 254 })?.toLowerCase(),
    monthlySpend: cleanNumber(body.monthlySpend, { field: "Monthly spend", min: 0, max: 100000000 }),
    seatsPurchased: cleanNumber(body.seatsPurchased, { field: "Seats purchased", min: 0, max: 1000000 }),
    activeSeats: cleanNumber(body.activeSeats, { field: "Active seats", min: 0, max: 1000000 }),
    lastUsedAt: cleanDate(body.lastUsedAt, { field: "Last used date" }),
    renewalDate: cleanDate(body.renewalDate, { field: "Renewal date" }),
    notes: cleanString(body.notes, { field: "Notes", max: 1000 }),
  };

  if (input.ownerEmail && !/^\S+@\S+\.\S+$/.test(input.ownerEmail)) {
    throw new AppError("Owner email must be valid", 400);
  }

  if (input.activeSeats !== undefined && input.seatsPurchased !== undefined && input.activeSeats > input.seatsPurchased) {
    throw new AppError("Active seats cannot exceed seats purchased", 400);
  }

  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanVendorIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError("Choose at least one vendor to delete", 400);
  }

  const ids = value.map((item) => String(item));
  if (ids.length > 500) {
    throw new AppError("Bulk delete supports up to 500 vendors at a time", 400);
  }

  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError("One or more vendor IDs are invalid", 400);
  }

  return Array.from(new Set(ids));
}
