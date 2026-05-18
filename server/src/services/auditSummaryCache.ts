import type { Types } from "mongoose";
import { AuditSummaryCache } from "../models/AuditSummaryCache.js";
import { Renewal } from "../models/Renewal.js";
import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { buildAuditSummary } from "./wasteDetection.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const activeRecomputes = new Map<string, Promise<unknown>>();

type CompanyId = Types.ObjectId | string;

export function isAuditSummaryCacheFresh(cache: { computedAt?: Date | string; isStale?: boolean } | null) {
  if (!cache || cache.isStale || !cache.computedAt) return false;

  const computedAt = new Date(cache.computedAt).getTime();
  return Number.isFinite(computedAt) && Date.now() - computedAt < CACHE_TTL_MS;
}

export async function recomputeAuditSummary(companyId: CompanyId) {
  const [vendors, subscriptions, renewals] = await Promise.all([
    Vendor.find({ company: companyId }).lean(),
    Subscription.find({ company: companyId }).lean(),
    Renewal.find({ company: companyId }).populate("vendor").lean(),
  ]);

  const summary = buildAuditSummary({
    vendors,
    subscriptions: subscriptions as Record<string, unknown>[],
    renewals: renewals as any,
  });
  const computedAt = new Date();

  await AuditSummaryCache.findOneAndUpdate(
    { companyId },
    {
      companyId,
      summary,
      computedAt,
      isStale: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return summary;
}

export async function markAuditSummaryStale(companyId: CompanyId) {
  await AuditSummaryCache.findOneAndUpdate(
    { companyId },
    {
      $set: { isStale: true },
      $setOnInsert: { companyId, summary: {}, computedAt: new Date(0) },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

export function recomputeAuditSummaryInBackground(companyId: CompanyId) {
  const key = String(companyId);
  if (activeRecomputes.has(key)) return;

  const run = recomputeAuditSummary(companyId)
    .catch((error) => {
      console.error("Background audit summary recompute failed", { companyId: key, error });
    })
    .finally(() => {
      activeRecomputes.delete(key);
    });

  activeRecomputes.set(key, run);
}
