import { Company } from "../models/Company.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getMe = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId);

  res.json({
    user: req.user,
    company,
  });
});

