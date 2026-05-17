import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { Vendor } from "../models/Vendor.js";
import { sendRenewalDigestEmail } from "./emailService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

type DigestVendor = {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownerName?: string;
  monthlySpend?: number;
  renewalDate: Date;
};

type DigestBuckets = {
  urgent: DigestVendor[];
  upcoming: DigestVendor[];
  later: DigestVendor[];
};

export async function sendWeeklyRenewalDigests(referenceDate = new Date()) {
  const companies = await Company.find({ "settings.weeklyRenewalDigest": true }).select("_id name").lean();
  const results = [];

  for (const company of companies) {
    results.push(await sendCompanyRenewalDigest(company._id, referenceDate));
  }

  return {
    checked: companies.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    results,
  };
}

type SendCompanyRenewalDigestOptions = {
  requireEnabled?: boolean;
};

export async function sendCompanyRenewalDigest(companyId: mongoose.Types.ObjectId | string, referenceDate = new Date(), options: SendCompanyRenewalDigestOptions = {}) {
  const { requireEnabled = true } = options;
  const company = await Company.findById(companyId).select("_id name settings createdBy").lean();
  if (!company) {
    return { companyId: String(companyId), skipped: true, reason: "Company not found" };
  }

  if (requireEnabled && !company.settings?.weeklyRenewalDigest) {
    return { companyId: String(company._id), companyName: company.name, skipped: true, reason: "Weekly renewal digest is disabled" };
  }

  const owner = await findCompanyOwner(company._id, company.createdBy);
  if (!owner) {
    return { companyId: String(company._id), companyName: company.name, skipped: true, reason: "Company owner not found" };
  }

  const vendors = await findRenewingVendors(company._id, referenceDate);
  if (vendors.length === 0) {
    return { companyId: String(company._id), companyName: company.name, skipped: true, reason: "No vendors renewing in the next 30 days" };
  }

  const buckets = bucketVendors(vendors, referenceDate);
  const totalExposure = vendors.reduce((sum, vendor) => sum + Number(vendor.monthlySpend ?? 0), 0);
  const emailResult = await sendRenewalDigestEmail({
    to: owner.email,
    companyName: company.name,
    dashboardUrl: `${env.appUrl}/dashboard/renewals`,
    urgent: buckets.urgent.map(toEmailVendor),
    upcoming: buckets.upcoming.map(toEmailVendor),
    later: buckets.later.map(toEmailVendor),
    totalExposure,
    companyId: company._id,
  });

  if (!("sent" in emailResult)) {
    return {
      companyId: String(company._id),
      companyName: company.name,
      skipped: true,
      reason: emailResult.reason,
    };
  }

  await ActivityLog.create({
    companyId: company._id,
    userId: owner._id,
    userEmail: owner.email,
    action: "notifications.weekly_renewal_digest_sent",
    entityType: "settings",
    entityId: company._id,
    entityName: company.name,
    metadata: {
      recipient: owner.email,
      vendorCount: vendors.length,
      totalExposure,
      urgentCount: buckets.urgent.length,
      upcomingCount: buckets.upcoming.length,
      laterCount: buckets.later.length,
    },
  });

  return {
    companyId: String(company._id),
    companyName: company.name,
    sent: true,
    recipient: owner.email,
    vendorCount: vendors.length,
    totalExposure,
  };
}

async function findCompanyOwner(companyId: mongoose.Types.ObjectId, createdBy?: mongoose.Types.ObjectId) {
  const owner = await User.findOne({ company: companyId, role: "owner" }).select("_id email").lean();
  if (owner) return owner;
  if (!createdBy) return null;

  return User.findOne({ _id: createdBy, company: companyId }).select("_id email").lean();
}

function findRenewingVendors(companyId: mongoose.Types.ObjectId, referenceDate: Date) {
  const start = referenceDate;
  const end = addDays(referenceDate, 30);

  return Vendor.find({
    company: companyId,
    renewalDate: {
      $gte: start,
      $lte: end,
    },
  })
    .select("_id name ownerName monthlySpend renewalDate")
    .sort({ renewalDate: 1, name: 1 })
    .lean<DigestVendor[]>();
}

function bucketVendors(vendors: DigestVendor[], referenceDate: Date): DigestBuckets {
  const day8 = addDays(referenceDate, 8);
  const day15 = addDays(referenceDate, 15);

  return vendors.reduce<DigestBuckets>(
    (buckets, vendor) => {
      const renewalTime = new Date(vendor.renewalDate).getTime();
      if (renewalTime < day8.getTime()) {
        buckets.urgent.push(vendor);
      } else if (renewalTime < day15.getTime()) {
        buckets.upcoming.push(vendor);
      } else {
        buckets.later.push(vendor);
      }

      return buckets;
    },
    { urgent: [], upcoming: [], later: [] },
  );
}

function toEmailVendor(vendor: DigestVendor) {
  return {
    name: vendor.name,
    renewalDate: new Date(vendor.renewalDate),
    ownerName: vendor.ownerName,
    monthlySpend: Number(vendor.monthlySpend ?? 0),
  };
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}
