import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { Renewal } from "../models/Renewal.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cleanDate, cleanEnum, cleanNumber, cleanString } from "../middleware/validate.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { buildPagination, parsePagination } from "../utils/query.js";
import { markAuditSummaryStale } from "../services/auditSummaryCache.js";

export const listSubscriptions = asyncHandler(async (req: any, res: any) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter: Record<string, unknown> = { company: req.companyId };
  const status = cleanString(req.query.status, { field: "Status", max: 40 });
  if (status && status !== "All") filter.status = status;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter).populate("vendor").sort({ renewalDate: 1, createdAt: -1 }).skip(skip).limit(limit),
    Subscription.countDocuments(filter),
  ]);

  res.json({ subscriptions, pagination: buildPagination({ page, limit, total }) });
});

export const createSubscription = asyncHandler(async (req: any, res: any) => {
  const input = sanitizeSubscriptionInput(req.body);
  const { vendor: vendorId, renewalDate, cost, billingCycle } = input;
  const vendor = await Vendor.findOne({ _id: vendorId, company: req.companyId });

  if (!vendor) {
    throw new AppError("Vendor not found for this company", 404);
  }

  const subscription = await Subscription.create({
    ...input,
    company: req.companyId,
  });

  if (renewalDate) {
    const annualValue = billingCycle === "annual" ? Number(cost) : Number(cost) * 12;

    await Renewal.create({
      company: req.companyId,
      vendor: vendor._id,
      subscription: subscription._id,
      renewalDate,
      contractValue: annualValue,
      riskLevel: "medium",
      recommendation: `Review ${vendor.name} renewal before auto-renewal.`,
    });
  }

  await recordAuditLog(req, {
    action: "subscription.created",
    resourceType: "subscription",
    resourceId: subscription._id,
    metadata: { vendorId, cost, billingCycle },
  });
  await markAuditSummaryStale(req.companyId);

  res.status(201).json({ subscription });
});

export const updateSubscription = asyncHandler(async (req: any, res: any) => {
  const existingSubscription = await Subscription.findOne({ _id: req.params.id, company: req.companyId });

  if (!existingSubscription) {
    res.status(404).json({ error: { message: "Subscription not found" } });
    return;
  }

  const input = sanitizeSubscriptionInput(req.body, { partial: true });

  if (input.vendor) {
    const vendor = await Vendor.findOne({ _id: input.vendor, company: req.companyId });
    if (!vendor) {
      throw new AppError("Vendor not found for this company", 404);
    }
  }

  const subscription = await Subscription.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId },
    input,
    { new: true, runValidators: true },
  );

  await recordAuditLog(req, {
    action: "subscription.updated",
    resourceType: "subscription",
    resourceId: subscription?._id,
    metadata: { fields: Object.keys(input) },
  });
  await markAuditSummaryStale(req.companyId);

  res.json({ subscription });
});

function sanitizeSubscriptionInput(body: any, { partial } = { partial: false }) {
  const input = {
    vendor: cleanString(body.vendor, { required: !partial, field: "Vendor", max: 80 }),
    planName: cleanString(body.planName, { required: !partial, field: "Plan name", max: 140 }),
    billingCycle: cleanEnum(body.billingCycle, ["monthly", "annual", "quarterly"], { field: "Billing cycle", defaultValue: partial ? undefined : "monthly" }),
    cost: cleanNumber(body.cost, { field: "Subscription cost", min: 0, max: 100000000 }),
    seatsPurchased: cleanNumber(body.seatsPurchased, { field: "Seats purchased", min: 0, max: 1000000 }),
    activeSeats: cleanNumber(body.activeSeats, { field: "Active seats", min: 0, max: 1000000 }),
    startDate: cleanDate(body.startDate, { field: "Start date" }),
    renewalDate: cleanDate(body.renewalDate, { field: "Renewal date" }),
    autoRenew: body.autoRenew === undefined && partial ? undefined : Boolean(body.autoRenew ?? true),
    paymentSource: cleanString(body.paymentSource, { field: "Payment source", max: 100 }),
    status: cleanEnum(body.status, ["active", "cancelled", "paused"], { field: "Status", defaultValue: partial ? undefined : "active" }),
  };

  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
