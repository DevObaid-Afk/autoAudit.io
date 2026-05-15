import { Company } from "../models/Company.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeOnboarding } from "../utils/onboarding.js";

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
