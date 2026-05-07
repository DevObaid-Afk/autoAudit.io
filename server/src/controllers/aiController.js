import { Vendor } from "../models/Vendor.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const generateCancelEmail = asyncHandler(async (req, res) => {
  const { vendorId, vendorName, tone = "direct", requestedAction = "cancel renewal" } = req.body;
  const vendor = vendorId ? await Vendor.findOne({ _id: vendorId, company: req.companyId }) : null;

  if (vendorId && !vendor) {
    throw new AppError("Vendor not found", 404);
  }

  const targetVendorName = vendor?.name ?? vendorName;
  if (!targetVendorName) {
    throw new AppError("vendorId or vendorName is required", 400);
  }

  const monthlySpend = vendor?.monthlySpend ? `$${Number(vendor.monthlySpend).toLocaleString("en-US")}/mo` : "the current contract amount";
  const lastUsed = vendor?.lastUsedAt ? `${daysSince(vendor.lastUsedAt)} days ago` : "not recently detected";
  const signoff = tone === "friendly" ? "Thanks again," : "Thank you,";

  const draft = `Hi ${targetVendorName} team,

We are reviewing our SaaS stack and would like to ${requestedAction} for our ${targetVendorName} account.

Our internal audit shows current spend of ${monthlySpend}, with last meaningful usage ${lastUsed}. Please confirm the final service date, any required notice steps, and whether there are outstanding obligations before cancellation.

If there is a lower-commitment option that better fits our current usage, please send that pricing for review.

${signoff}
Finance Team`;

  res.json({
    draft,
    metadata: {
      vendorId: vendor?._id,
      vendorName: targetVendorName,
      tone,
      generatedAt: new Date().toISOString(),
    },
  });
});

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

