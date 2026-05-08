import { Renewal } from "../models/Renewal.js";
import { cleanString } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, parsePagination } from "../utils/query.js";

export const listRenewals = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { company: req.companyId };
  const status = cleanString(req.query.status, { field: "Status", max: 40 });
  const riskLevel = cleanString(req.query.riskLevel, { field: "Risk level", max: 40 });
  if (status && status !== "All") filter.status = status;
  if (riskLevel && riskLevel !== "All") filter.riskLevel = riskLevel;

  const [renewals, total] = await Promise.all([
    Renewal.find(filter).populate("vendor subscription").sort({ renewalDate: 1 }).skip(skip).limit(limit),
    Renewal.countDocuments(filter),
  ]);

  res.json({ renewals, pagination: buildPagination({ page, limit, total }) });
});
