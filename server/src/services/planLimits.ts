import { Company } from "../models/Company.js";
import { Report } from "../models/Report.js";
import { Vendor } from "../models/Vendor.js";
import { AppError } from "../utils/AppError.js";

export const planLimits = {
  free: {
    label: "Free trial",
    vendors: 10,
    reports: 1,
    aiEmails: 3,
    vendorAnalyses: 3,
  },
  starter: {
    label: "Starter trial",
    vendors: 50,
    reports: 3,
    aiEmails: 0,
    vendorAnalyses: 0,
  },
  standard: {
    label: "Standard trial",
    vendors: 200,
    reports: 25,
    aiEmails: 100,
    vendorAnalyses: 50,
  },
  custom: {
    label: "Custom trial",
    vendors: null,
    reports: null,
    aiEmails: null,
    vendorAnalyses: null,
  },
};

export async function assertCanCreateVendors(companyId, amount = 1) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);

  const limits = getPlanLimits(company.plan);
  if (limits.vendors === null) return company;

  const vendorCount = await Vendor.countDocuments({ company: companyId });
  if (vendorCount + amount > limits.vendors) {
    throw new AppError(`${limits.label} allows up to ${limits.vendors} vendors. Choose a paid plan to add more.`, 403);
  }

  return company;
}

export async function assertCanGenerateReport(companyId) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);

  const limits = getPlanLimits(company.plan);
  if (limits.reports === null) return company;

  const reportCount = await Report.countDocuments({ company: companyId });
  if (reportCount >= limits.reports) {
    throw new AppError(`${limits.label} includes ${limits.reports} report${limits.reports === 1 ? "" : "s"}. Choose a plan to generate more.`, 403);
  }

  return company;
}

export async function assertCanGenerateAiEmail(companyId) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);

  const limits = getPlanLimits(company.plan);
  if (limits.aiEmails === null) return company;

  const used = Number(company.planUsage?.aiEmailsGenerated ?? 0);
  if (used >= limits.aiEmails) {
    throw new AppError(`${limits.label} includes ${limits.aiEmails} AI email draft${limits.aiEmails === 1 ? "" : "s"}. Choose Standard for AI email generation.`, 403);
  }

  return company;
}

export async function assertCanAnalyzeVendor(companyId) {
  const company = await getCompanyOrThrow(companyId);
  assertTrialActive(company);

  const limits = getPlanLimits(company.plan);
  if (limits.vendorAnalyses === null) return company;

  const used = Number(company.planUsage?.vendorAnalysesGenerated ?? 0);
  if (used >= limits.vendorAnalyses) {
    throw new AppError(`${limits.label} includes ${limits.vendorAnalyses} AI analysis run${limits.vendorAnalyses === 1 ? "" : "s"}. Choose Standard for more analysis.`, 403);
  }

  return company;
}

export async function incrementPlanUsage(companyId, field) {
  await Company.findByIdAndUpdate(companyId, { $inc: { [`planUsage.${field}`]: 1 } });
}

export function getPlanLimits(plan) {
  return planLimits[plan] ?? planLimits.free;
}

function assertTrialActive(company) {
  if (company.subscriptionStatus === "active") return;

  const trialEndsAt = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
  if (trialEndsAt && trialEndsAt.getTime() < Date.now()) {
    throw new AppError("Your trial has ended. Choose a plan to continue using AutoAudit.ai.", 403);
  }
}

async function getCompanyOrThrow(companyId) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  return company;
}
