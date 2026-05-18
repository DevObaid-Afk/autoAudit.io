import { AuditSummaryCache } from "../models/AuditSummaryCache.js";
import {
  isAuditSummaryCacheFresh,
  markAuditSummaryStale,
  recomputeAuditSummary,
  recomputeAuditSummaryInBackground,
} from "../services/auditSummaryCache.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAuditSummary = asyncHandler(async (req: any, res: any) => {
  const cache = await AuditSummaryCache.findOne({ companyId: req.companyId }).lean();

  if (cache && isAuditSummaryCacheFresh(cache)) {
    res.json({ summary: cache.summary, cache: { hit: true, stale: false, computedAt: cache.computedAt } });
    return;
  }

  if (cache?.isStale && cache.summary && Object.keys(cache.summary).length > 0) {
    setImmediate(() => recomputeAuditSummaryInBackground(req.companyId));
    res.json({ summary: cache.summary, cache: { hit: true, stale: true, computedAt: cache.computedAt } });
    return;
  }

  const summary = await recomputeAuditSummary(req.companyId);
  res.json({ summary, cache: { hit: false, stale: false, computedAt: new Date() } });
});

export const flushAuditSummaryCache = asyncHandler(async (req: any, res: any) => {
  await markAuditSummaryStale(req.companyId);
  res.json({ ok: true });
});
