import { Renewal } from "../models/Renewal.js";
import { Report } from "../models/Report.js";
import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { buildAuditSummary } from "../services/wasteDetection.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { completeOnboardingStep } from "../utils/onboarding.js";
import { buildPagination, parsePagination } from "../utils/query.js";

export const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [reports, total] = await Promise.all([
    Report.find({ company: req.companyId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments({ company: req.companyId }),
  ]);

  res.json({
    reports,
    pagination: buildPagination({ page, limit, total }),
  });
});

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
    content: buildManualReportContent(summary),
    status: "ready",
  });

  await recordActivity(req, {
    action: "report.generated",
    entityType: "report",
    entityId: report._id,
    entityName: report.title,
    metadata: { type: report.type },
  });
  await completeOnboardingStep(req.companyId, "generatedReport");

  res.status(201).json({ report });
});

function buildManualReportContent(summary) {
  return [
    "SaaS Waste Report",
    "",
    `Monthly spend: $${Number(summary.monthlySpend ?? 0).toLocaleString("en-US")}`,
    `Estimated annual savings: $${Number(summary.estimatedAnnualSavings ?? 0).toLocaleString("en-US")}`,
    `Monthly waste found: $${Number(summary.monthlyWasteFound ?? 0).toLocaleString("en-US")}`,
    `Zombie subscriptions: ${summary.zombieSubscriptionCount ?? 0}`,
    `Unused seats: ${summary.unusedSeatCount ?? 0}`,
    `Upcoming renewals: ${summary.upcomingRenewalCount ?? 0}`,
  ].join("\n");
}
