import { Renewal } from "../models/Renewal.js";
import { sendCompanyRenewalDigest } from "../services/renewalDigestService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const sendTestRenewalDigest = asyncHandler(async (req: any, res: any) => {
  const result = await sendCompanyRenewalDigest(req.companyId, new Date(), { requireEnabled: false });

  res.json({ digest: result });
});

export const listUrgentRenewals = asyncHandler(async (req: any, res: any) => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * DAY_MS);
  const renewals = await Renewal.find({
    company: req.companyId,
    status: { $ne: "reviewed" },
    renewalDate: { $gte: now, $lte: sevenDaysFromNow },
  })
    .populate("vendor")
    .sort({ renewalDate: 1 })
    .lean();

  res.json({
    renewals: renewals.map((renewal) => {
      const vendor = renewal.vendor as any;
      const renewalDate = new Date(renewal.renewalDate);
      const contractValue = Number(renewal.contractValue || Number(vendor?.monthlySpend ?? 0) * 12 || 0);

      return {
        id: renewal._id,
        vendorId: vendor?._id,
        vendorName: vendor?.name ?? "Vendor",
        renewalDate,
        noticeDeadline: renewal.noticeDeadline,
        contractValue,
        status: renewal.status,
        riskLevel: renewal.riskLevel,
        daysUntilRenewal: Math.max(0, Math.ceil((renewalDate.getTime() - now.getTime()) / DAY_MS)),
      };
    }),
  });
});
