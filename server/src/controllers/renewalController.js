import { Renewal } from "../models/Renewal.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listRenewals = asyncHandler(async (req, res) => {
  const renewals = await Renewal.find({ company: req.companyId }).populate("vendor subscription").sort({ renewalDate: 1 });

  res.json({ renewals });
});

