import { Company } from "../models/Company.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { completeOnboardingStep, normalizeOnboarding } from "../utils/onboarding.js";

export const getOnboarding = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId).select("onboarding").lean();
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  res.json({ onboarding: normalizeOnboarding(company.onboarding) });
});

export const dismissOnboarding = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(
    req.companyId,
    { $set: { "onboarding.dismissed": true } },
    { new: true, runValidators: true },
  ).select("onboarding").lean();

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  res.json({ onboarding: normalizeOnboarding(company.onboarding) });
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  const step = req.body.step;
  const allowedSteps = new Set(["reviewedWaste"]);

  if (!allowedSteps.has(step)) {
    throw new AppError("Onboarding step cannot be completed from this route", 400);
  }

  await completeOnboardingStep(req.companyId, step);

  const company = await Company.findById(req.companyId).select("onboarding").lean();
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  res.json({ onboarding: normalizeOnboarding(company.onboarding) });
});
