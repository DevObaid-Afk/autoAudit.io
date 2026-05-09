import { Vendor } from "../models/Vendor.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { classifyVendorWaste } from "../services/wasteDetection.js";
import { AppError } from "../utils/AppError.js";
import { cleanDate, cleanNumber, cleanString } from "../middleware/validate.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { buildPagination, parsePagination } from "../utils/query.js";
import { assertCanCreateVendors } from "../services/planLimits.js";

export const listVendors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { company: req.companyId };
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
  });

  await recordAuditLog(req, {
    action: "vendor.created",
    resourceType: "vendor",
    resourceId: vendor._id,
    metadata: { name: vendor.name, monthlySpend: vendor.monthlySpend },
  });

  res.status(201).json({ vendor });
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
  );

  await recordAuditLog(req, {
    action: "vendor.updated",
    resourceType: "vendor",
    resourceId: vendor._id,
    metadata: { fields: Object.keys(update) },
  });

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

  res.status(204).send();
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
