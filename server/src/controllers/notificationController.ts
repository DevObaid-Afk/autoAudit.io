import { sendCompanyRenewalDigest } from "../services/renewalDigestService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sendTestRenewalDigest = asyncHandler(async (req, res) => {
  const result = await sendCompanyRenewalDigest(req.companyId, new Date(), { requireEnabled: false });

  res.json({ digest: result });
});
