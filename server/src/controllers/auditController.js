import { Renewal } from "../models/Renewal.js";
import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { buildAuditSummary } from "../services/wasteDetection.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAuditSummary = asyncHandler(async (req, res) => {
  const [vendors, subscriptions, renewals] = await Promise.all([
    Vendor.find({ company: req.companyId }),
    Subscription.find({ company: req.companyId }),
    Renewal.find({ company: req.companyId }).populate("vendor"),
  ]);

  res.json({
    summary: buildAuditSummary({ vendors, subscriptions, renewals }),
  });
});

