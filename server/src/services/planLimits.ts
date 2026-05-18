import { Company } from "../models/Company.js";
import { Report } from "../models/Report.js";
import { Vendor } from "../models/Vendor.js";
import { AppError } from "../utils/AppError.js";
import { PlanLimitError, type PlanLimitType } from "../utils/PlanLimitError.js";

type PlanName = keyof typeof planLimits;
type PlanUsageField = "reportsGenerated" | "aiEmailsGenerated" | "vendorAnalysesGenerated";

export const planLimits = {
  free: {
    label: "Free trial",
    vendors: 10,
    reports: 1,
    aiEmails: 3,
    vendorAnalyses: 3,
  },
  starter: {
    label: "Starter",
    vendors: 50,
    reports: 5,
    aiEmails: 20,
    vendorAnalyses: 15,
  },
  standard: {
    label: "Standard",
    vendors: 200,
    reports: 25,
    aiEmails: 100,
    vendorAnalyses: 50,
  },
  growth: {
    label: "Growth",
    vendors: 500,
    reports: 75,
    aiEmails: 300,
    vendorAnalyses: 150,
  },
  enterprise: {
    label: "Enterprise",
    vendors: null,
    reports: null,
    aiEmails: null,
    vendorAnalyses: null,
  },
  custom: {
    label: "Custom",
    vendors: null,
    reports: null,
    aiEmails: null,
    vendorAnalyses: null,
  },
};

export async function assertCanCreateVendors(companyId: unknown, amount = 1) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);

  const limits = getPlanLimits(company.plan);
  if (limits.vendors === null) return company;

  const vendorCount = await Vendor.countDocuments({ company: company._id, source: { $ne: "sample" } });
  if (vendorCount + amount > limits.vendors) {
    throw buildPlanLimitError({
      company,
      limitType: "vendors",
      currentUsage: vendorCount,
      planLimit: limits.vendors,
      message: `You have reached the vendor limit on your ${limits.label.toLowerCase()}.`,
    });
  }

  return company;
}

export async function assertCanGenerateReport(companyId: unknown) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);
  if (isTrialing(company)) return company;

  const limits = getPlanLimits(company.plan);
  if (limits.reports === null) return company;

  const reportCount = await Report.countDocuments({ company: company._id });
  if (reportCount >= limits.reports) {
    throw buildPlanLimitError({
      company,
      limitType: "reports",
      currentUsage: reportCount,
      planLimit: limits.reports,
      message: `You have reached the report limit on your ${limits.label.toLowerCase()}.`,
    });
  }

  return company;
}

export async function assertCanGenerateAiEmail(companyId: unknown) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);
  if (isTrialing(company)) return company;

  const limits = getPlanLimits(company.plan);
  if (limits.aiEmails === null) return company;

  const used = Number(company.planUsage?.aiEmailsGenerated ?? 0);
  if (used >= limits.aiEmails) {
    throw buildPlanLimitError({
      company,
      limitType: "aiEmails",
      currentUsage: used,
      planLimit: limits.aiEmails,
      message: `You have reached the AI email limit on your ${limits.label.toLowerCase()}.`,
    });
  }

  return company;
}

export async function assertCanAnalyzeVendor(companyId: unknown) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);
  if (isTrialing(company)) return company;

  const limits = getPlanLimits(company.plan);
  if (limits.vendorAnalyses === null) return company;

  const used = Number(company.planUsage?.vendorAnalysesGenerated ?? 0);
  if (used >= limits.vendorAnalyses) {
    throw buildPlanLimitError({
      company,
      limitType: "vendorAnalyses",
      currentUsage: used,
      planLimit: limits.vendorAnalyses,
      message: `You have reached the AI analysis limit on your ${limits.label.toLowerCase()}.`,
    });
  }

  return company;
}

export async function incrementPlanUsage(companyId: unknown, field: PlanUsageField) {
  await Company.findByIdAndUpdate(companyId, { $inc: { [`planUsage.${field}`]: 1 } });
}

export function getPlanLimits(plan: unknown) {
  return planLimits[plan as PlanName] ?? planLimits.free;
}

function assertTrialActive(company: any) {
  if (company.subscriptionStatus === "active") return;

  const trialEndsAt = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
  if (trialEndsAt && trialEndsAt.getTime() < Date.now()) {
    throw new PlanLimitError({
      limitType: "trial",
      currentUsage: 0,
      planLimit: 0,
      upgradeToUnlock: "starter",
      message: "Your trial has ended. Choose a plan to continue using AutoAudit.ai.",
    });
  }
}

function isTrialing(company: any) {
  return company.subscriptionStatus !== "active";
}

async function getCompanyOrThrow(companyId: unknown) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  return company;
}

function buildPlanLimitError({
  company,
  limitType,
  currentUsage,
  planLimit,
  message,
}: {
  company: any;
  limitType: PlanLimitType;
  currentUsage: number;
  planLimit: number;
  message: string;
}) {
  return new PlanLimitError({
    limitType,
    currentUsage,
    planLimit,
    upgradeToUnlock: getUpgradeToUnlock(company.plan, limitType),
    message,
  });
}

function getUpgradeToUnlock(currentPlan: unknown, limitType: PlanLimitType) {
  if (limitType === "trial") return "starter";

  const orderedPlans = ["free", "starter", "standard", "growth", "enterprise"];
  const currentIndex = Math.max(0, orderedPlans.indexOf(String(currentPlan)));
  const currentLimit = getPlanLimits(currentPlan)[limitType];

  for (const plan of orderedPlans.slice(currentIndex + 1)) {
    const nextLimit = getPlanLimits(plan)[limitType];
    if (nextLimit === null || currentLimit === null || Number(nextLimit) > Number(currentLimit)) {
      return plan;
    }
  }

  return "custom";
}
