import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Company } from "../models/Company.js";
import { Renewal } from "../models/Renewal.js";
import { User } from "../models/User.js";
import { sendUrgentRenewalEmail } from "./emailService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function sendDailyUrgentRenewalAlerts(referenceDate = new Date()) {
  const companies = await Company.find({}).select("_id name createdBy").lean();
  const results = [];

  for (const company of companies) {
    results.push(await sendCompanyUrgentRenewalAlerts(company, referenceDate));
  }

  return {
    checked: companies.length,
    sent: results.reduce((sum, result) => sum + result.sent, 0),
    skipped: results.reduce((sum, result) => sum + result.skipped, 0),
    results,
  };
}

async function sendCompanyUrgentRenewalAlerts(company: any, referenceDate: Date) {
  const owner = await findCompanyOwner(company._id, company.createdBy);
  if (!owner) {
    return { companyId: String(company._id), sent: 0, skipped: 1, reason: "Company owner not found" };
  }

  const start = referenceDate;
  const end = addDays(referenceDate, 7);
  const last24Hours = new Date(referenceDate.getTime() - DAY_MS);
  const renewals = await Renewal.find({
    company: company._id,
    status: { $ne: "reviewed" },
    renewalDate: { $gte: start, $lte: end },
    $or: [{ urgentEmailSentAt: { $exists: false } }, { urgentEmailSentAt: null }, { urgentEmailSentAt: { $lte: last24Hours } }],
  })
    .populate("vendor")
    .sort({ renewalDate: 1 })
    .lean();

  let sent = 0;
  let skipped = 0;

  for (const renewal of renewals) {
    const vendor = renewal.vendor as any;
    const renewalDate = new Date(renewal.renewalDate);
    const contractValue = Number(renewal.contractValue || Number(vendor?.monthlySpend ?? 0) * 12 || 0);
    const estimatedAnnualCost = contractValue || Number(vendor?.monthlySpend ?? 0) * 12;
    const noticeDeadline = renewal.noticeDeadline ? new Date(renewal.noticeDeadline) : addDays(renewalDate, -30);
    const daysUntilRenewal = Math.max(0, Math.ceil((renewalDate.getTime() - referenceDate.getTime()) / DAY_MS));

    const emailResult = await sendUrgentRenewalEmail({
      to: owner.email,
      companyName: company.name,
      vendorName: vendor?.name ?? "Vendor",
      renewalDate,
      contractValue,
      estimatedAnnualCost,
      noticeDeadline,
      dashboardUrl: `${env.appUrl}/dashboard/renewals?filter=urgent`,
      daysUntilRenewal,
      companyId: company._id,
    });

    if ("sent" in emailResult) {
      await Renewal.updateOne({ _id: renewal._id }, { $set: { urgentEmailSentAt: referenceDate } });
      await ActivityLog.create({
        companyId: company._id,
        userId: owner._id,
        userEmail: owner.email,
        action: "notifications.urgent_renewal_email_sent",
        entityType: "settings",
        entityId: renewal._id,
        entityName: vendor?.name ?? "Renewal",
        metadata: { renewalDate, contractValue, daysUntilRenewal },
      });
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { companyId: String(company._id), sent, skipped };
}

async function findCompanyOwner(companyId: mongoose.Types.ObjectId, createdBy?: mongoose.Types.ObjectId) {
  const owner = await User.findOne({ company: companyId, role: "owner" }).select("_id email").lean();
  if (owner) return owner;
  if (!createdBy) return null;

  return User.findOne({ _id: createdBy, company: companyId }).select("_id email").lean();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}
