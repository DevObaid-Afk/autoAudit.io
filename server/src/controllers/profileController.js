import { Company } from "../models/Company.js";
import { cleanNumber } from "../middleware/validate.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";

export const getMe = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId);

  res.json({
    user: req.user,
    company,
  });
});

export const updateCompanySettings = asyncHandler(async (req, res) => {
  const settings = {
    requireCfoApprovalAbove: cleanNumber(req.body.requireCfoApprovalAbove, { field: "CFO approval threshold", min: 0, max: 100000000 }),
    weeklyRenewalDigest: cleanBoolean(req.body.weeklyRenewalDigest, "Weekly renewal digest"),
    autoDraftCancellationEmails: cleanBoolean(req.body.autoDraftCancellationEmails, "Auto-draft cancellation emails"),
    allowManagedRenegotiation: cleanBoolean(req.body.allowManagedRenegotiation, "Managed renegotiation"),
  };

  const update = Object.fromEntries(
    Object.entries(settings)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [`settings.${key}`, value]),
  );

  if (Object.keys(update).length === 0) {
    throw new AppError("At least one setting is required", 400);
  }

  const company = await Company.findByIdAndUpdate(req.companyId, { $set: update }, { new: true, runValidators: true });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  await recordAuditLog(req, {
    action: "company.settings_updated",
    resourceType: "company",
    resourceId: company._id,
    metadata: { fields: Object.keys(update) },
  });

  res.json({ company });
});

function cleanBoolean(value, field) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new AppError(`${field} must be true or false`, 400);
  }
  return value;
}
