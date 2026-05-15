import { Company } from "../models/Company.js";

export type OnboardingStep = "addedFirstVendor" | "importedCsv" | "reviewedWaste" | "generatedReport" | "createdEmailDraft" | "invitedTeammate";

export const defaultOnboarding = {
  addedFirstVendor: false,
  importedCsv: false,
  reviewedWaste: false,
  generatedReport: false,
  createdEmailDraft: false,
  invitedTeammate: false,
  dismissed: false,
};

export async function completeOnboardingStep(companyId, step: OnboardingStep) {
  if (!companyId) return;
  await Company.findByIdAndUpdate(companyId, { $set: { [`onboarding.${step}`]: true } });
}

export function normalizeOnboarding(onboarding = {}) {
  return {
    ...defaultOnboarding,
    ...Object.fromEntries(Object.entries(onboarding).filter(([, value]) => typeof value === "boolean")),
  };
}
