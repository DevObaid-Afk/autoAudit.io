import { Renewal } from "../models/Renewal.js";
import { cleanDate, cleanEnum, cleanNumber, cleanString } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPagination, parsePagination } from "../utils/query.js";
import { markAuditSummaryStale } from "../services/auditSummaryCache.js";

export const listRenewals = asyncHandler(async (req: any, res: any) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter: Record<string, unknown> = { company: req.companyId };
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

export const updateRenewal = asyncHandler(async (req: any, res: any) => {
  const input = sanitizeRenewalInput(req.body);

  const renewal = await Renewal.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId },
    input,
    { new: true, runValidators: true },
  ).populate("vendor subscription");

  if (!renewal) {
    res.status(404).json({ error: { message: "Renewal not found" } });
    return;
  }

  await markAuditSummaryStale(req.companyId);

  res.json({ renewal });
});

function sanitizeRenewalInput(body: any) {
  const input = {
    renewalDate: cleanDate(body.renewalDate, { field: "Renewal date" }),
    noticeDeadline: cleanDate(body.noticeDeadline, { field: "Notice deadline" }),
    contractValue: cleanNumber(body.contractValue, { field: "Contract value", min: 0, max: 100000000 }),
    status: cleanEnum(body.status, ["upcoming", "in_review", "negotiating", "cancelled", "renewed"], { field: "Status" }),
    riskLevel: cleanEnum(body.riskLevel, ["low", "medium", "high", "critical"], { field: "Risk level" }),
    recommendation: cleanString(body.recommendation, { field: "Recommendation", max: 1000 }),
  };

  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
