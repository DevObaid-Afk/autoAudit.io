import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { Renewal } from "../models/Renewal.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ company: req.companyId }).populate("vendor").sort({ renewalDate: 1, createdAt: -1 });

  res.json({ subscriptions });
});

export const createSubscription = asyncHandler(async (req, res) => {
  const { vendor: vendorId, renewalDate, cost, billingCycle } = req.body;
  const vendor = await Vendor.findOne({ _id: vendorId, company: req.companyId });

  if (!vendor) {
    throw new AppError("Vendor not found for this company", 404);
  }

  const subscription = await Subscription.create({
    ...req.body,
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

  res.status(201).json({ subscription });
});

