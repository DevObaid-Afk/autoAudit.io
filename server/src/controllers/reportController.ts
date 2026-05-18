import { Company } from "../models/Company.js";
import { Renewal } from "../models/Renewal.js";
import { Report } from "../models/Report.js";
import { SavingsEntry } from "../models/SavingsEntry.js";
import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { generateAuditReportPdf } from "../services/pdfService.js";
import { buildAuditSummary } from "../services/wasteDetection.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { completeOnboardingStep } from "../utils/onboarding.js";
import { buildPagination, parsePagination } from "../utils/query.js";

export const listReports = asyncHandler(async (req: any, res: any) => {
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

export const generateReport = asyncHandler(async (req: any, res: any) => {
  const { title, type = "monthly_waste", periodStart, periodEnd } = req.body;
  const [vendors, subscriptions, renewals] = await Promise.all([
    Vendor.find({ company: req.companyId }),
    Subscription.find({ company: req.companyId }),
    Renewal.find({ company: req.companyId }).populate("vendor"),
  ]);
  const summary = buildAuditSummary({ vendors, subscriptions: subscriptions as any, renewals: renewals as any });

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

export const deleteReport = asyncHandler(async (req: any, res: any) => {
  const report = await Report.findOneAndDelete({ _id: req.params.id, company: req.companyId });

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  await recordActivity(req, {
    action: "report.deleted",
    entityType: "report",
    entityId: report._id,
    entityName: report.title,
    metadata: { type: report.type },
  });

  res.status(204).send();
});

export const exportReportPdf = asyncHandler(async (req: any, res: any) => {
  const report = await Report.findOne({ _id: req.params.id, company: req.companyId }).lean();

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  const [company, savingsEntries, renewals] = await Promise.all([
    Company.findById(req.companyId).lean(),
    SavingsEntry.find({ companyId: req.companyId }).sort({ confirmedAt: -1 }).limit(50).lean(),
    Renewal.find({
      company: req.companyId,
      renewalDate: { $gte: new Date(), $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    }).populate("vendor").sort({ renewalDate: 1 }).lean(),
  ]);

  const pdf = await generateAuditReportPdf({
    id: report._id,
    title: report.title,
    companyName: company?.name ?? "Workspace",
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    generatedAt: new Date(),
    summary: report.summary,
    findings: report.findings,
    content: report.content,
    savingsData: {
      entries: savingsEntries,
      totalMonthlySavings: savingsEntries.reduce((sum, entry) => sum + Number(entry.realizedMonthlySavings ?? 0), 0),
      totalAnnualSavings: savingsEntries.reduce((sum, entry) => sum + Number(entry.realizedMonthlySavings ?? 0) * 12, 0),
    },
    renewals: renewals.map((renewal) => ({
      ...renewal,
      vendorName: (renewal.vendor as any)?.name,
      window: renewalWindow(renewal.renewalDate),
    })),
  });

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="autoaudit-report-${date}.pdf"`);
  res.setHeader("Content-Length", String(pdf.length));
  res.send(pdf);
});

function buildManualReportContent(summary: any) {
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

function renewalWindow(value: any) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 30) return "Next 30 days";
  if (days <= 60) return "Next 60 days";
  return "Next 90 days";
}
