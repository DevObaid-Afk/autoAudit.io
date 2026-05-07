import { Renewal } from "../models/Renewal.js";
import { Report } from "../models/Report.js";
import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { buildAuditSummary } from "../services/wasteDetection.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const generateReport = asyncHandler(async (req, res) => {
  const { title, type = "monthly_waste", periodStart, periodEnd } = req.body;
  const [vendors, subscriptions, renewals] = await Promise.all([
    Vendor.find({ company: req.companyId }),
    Subscription.find({ company: req.companyId }),
    Renewal.find({ company: req.companyId }).populate("vendor"),
  ]);
  const summary = buildAuditSummary({ vendors, subscriptions, renewals });

  const report = await Report.create({
    company: req.companyId,
    requestedBy: req.user._id,
    title: title ?? `${new Date().toLocaleString("en-US", { month: "long" })} SaaS Waste Report`,
    type,
    periodStart,
    periodEnd,
    summary,
    findings: summary.wasteSignals,
    status: "ready",
  });

  res.status(201).json({ report });
});

