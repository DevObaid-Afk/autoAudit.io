import { ActivityLog } from "../models/ActivityLog.js";
import { ActionItem } from "../models/ActionItem.js";
import { AuditLog } from "../models/AuditLog.js";
import { Company } from "../models/Company.js";
import { Renewal } from "../models/Renewal.js";
import { Report } from "../models/Report.js";
import { SavingsEntry } from "../models/SavingsEntry.js";
import { Subscription } from "../models/Subscription.js";
import { TeamInvite } from "../models/TeamInvite.js";
import { User } from "../models/User.js";
import { Vendor } from "../models/Vendor.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cleanString } from "../middleware/validate.js";

export const exportWorkspace = asyncHandler(async (req, res) => {
  const [company, vendors, reports, savingsEntries, actionItems, activityLogs] = await Promise.all([
    Company.findById(req.companyId).lean(),
    Vendor.find({ company: req.companyId }).sort({ name: 1 }).lean(),
    Report.find({ company: req.companyId }).sort({ createdAt: -1 }).lean(),
    SavingsEntry.find({ companyId: req.companyId }).sort({ confirmedAt: -1 }).lean(),
    ActionItem.find({ companyId: req.companyId }).sort({ createdAt: -1 }).lean(),
    ActivityLog.find({ companyId: req.companyId }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!company) {
    throw new AppError("Workspace not found", 404);
  }

  res.json({
    exportedAt: new Date().toISOString(),
    company: {
      id: company._id,
      name: company.name,
      domain: company.domain,
      plan: company.plan,
      subscriptionStatus: company.subscriptionStatus,
      settings: company.settings,
      onboarding: company.onboarding,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    },
    vendors,
    reports,
    savingsEntries,
    actionItems,
    activityLogs,
  });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  const confirmationName = cleanString(req.body.companyName, { required: true, field: "Company name", max: 120 });
  const company = await Company.findById(req.companyId);

  if (!company) {
    throw new AppError("Workspace not found", 404);
  }

  if (confirmationName !== company.name) {
    throw new AppError("Company name confirmation does not match", 400);
  }

  const companyFilter = { company: req.companyId };
  const companyIdFilter = { companyId: req.companyId };

  const results = await Promise.all([
    Vendor.deleteMany(companyFilter),
    Subscription.deleteMany(companyFilter),
    Renewal.deleteMany(companyFilter),
    Report.deleteMany(companyFilter),
    SavingsEntry.deleteMany(companyIdFilter),
    ActionItem.deleteMany(companyIdFilter),
    TeamInvite.deleteMany(companyIdFilter),
    ActivityLog.deleteMany(companyIdFilter),
    AuditLog.deleteMany(companyFilter),
    User.deleteMany(companyFilter),
  ]);

  await Company.deleteOne({ _id: req.companyId });

  res.json({
    deleted: true,
    counts: {
      vendors: results[0].deletedCount,
      subscriptions: results[1].deletedCount,
      renewals: results[2].deletedCount,
      reports: results[3].deletedCount,
      savingsEntries: results[4].deletedCount,
      actionItems: results[5].deletedCount,
      teamInvites: results[6].deletedCount,
      activityLogs: results[7].deletedCount,
      auditLogs: results[8].deletedCount,
      users: results[9].deletedCount,
    },
  });
});
