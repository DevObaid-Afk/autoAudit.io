import type { Request, Response } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AnalyticsEvent } from "../models/AnalyticsEvent.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const funnelEvents = [
  "user_signed_up",
  "vendor_added",
  "waste_signal_viewed",
  "report_generated",
  "checkout_started",
  "checkout_completed",
] as const;

export const getFunnelAnalytics = asyncHandler(async (req: Request, res: Response) => {
  requireInternalAnalyticsToken(req);

  const { startDate, endDate, rangeLabel } = parseDateRange(req.query.range, req.query.startDate, req.query.endDate);
  const signupEvents = await AnalyticsEvent.find({
    eventName: "user_signed_up",
    createdAt: { $gte: startDate, $lte: endDate },
  }).sort({ createdAt: 1 }).lean();
  const signupByUser = new Map<string, { userId: string; companyId?: string; signupAt: Date }>();

  for (const event of signupEvents) {
    const userId = eventUserId(event);
    if (!userId || signupByUser.has(userId)) continue;
    signupByUser.set(userId, {
      userId,
      companyId: eventCompanyId(event),
      signupAt: new Date(event.createdAt),
    });
  }

  const signups = Array.from(signupByUser.values());
  const totalSignups = signups.length;
  const userIds = signups.map((signup) => new mongoose.Types.ObjectId(signup.userId));
  const allEvents = totalSignups
    ? await AnalyticsEvent.find({
        user: { $in: userIds },
        createdAt: { $gte: startDate },
      }).sort({ createdAt: 1 }).lean()
    : [];
  const eventsByUser = new Map<string, typeof allEvents>();

  for (const event of allEvents) {
    const userId = eventUserId(event);
    if (!userId || !signupByUser.has(userId)) continue;
    const bucket = eventsByUser.get(userId) ?? [];
    bucket.push(event);
    eventsByUser.set(userId, bucket);
  }

  const firstEventByName = new Map<string, Map<string, Date>>();
  const durationsToVendor: number[] = [];
  const durationsToCheckout: number[] = [];

  for (const signup of signups) {
    const events = eventsByUser.get(signup.userId) ?? [];
    const firsts = new Map<string, Date>();

    for (const eventName of funnelEvents) {
      const first = events.find((event) => event.eventName === eventName && new Date(event.createdAt).getTime() >= signup.signupAt.getTime());
      if (first) firsts.set(eventName, new Date(first.createdAt));
    }

    firstEventByName.set(signup.userId, firsts);
    const firstVendor = firsts.get("vendor_added");
    const firstCheckout = firsts.get("checkout_started");
    if (firstVendor) durationsToVendor.push(firstVendor.getTime() - signup.signupAt.getTime());
    if (firstCheckout) durationsToCheckout.push(firstCheckout.getTime() - signup.signupAt.getTime());
  }

  const checkoutCompletedEvents = allEvents.filter((event) => event.eventName === "checkout_completed");
  const latestCheckoutByCompany = new Map<string, any>();
  for (const event of checkoutCompletedEvents) {
    const companyId = eventCompanyId(event);
    if (!companyId) continue;
    latestCheckoutByCompany.set(companyId, event);
  }

  res.json({
    range: {
      label: rangeLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totals: {
      signups: totalSignups,
      paying: latestCheckoutByCompany.size,
      mrr: Math.round(Array.from(latestCheckoutByCompany.values()).reduce((sum, event) => sum + Number(event.metadata?.amount ?? 0), 0)),
    },
    funnel: [
      buildStep("Signed up", totalSignups, totalSignups),
      buildStep("Added first vendor", countUsersWith(firstEventByName, "vendor_added"), totalSignups),
      buildStep("Viewed first waste signal", countUsersWith(firstEventByName, "waste_signal_viewed"), totalSignups),
      buildStep("Generated first report", countUsersWith(firstEventByName, "report_generated"), totalSignups),
      buildStep("Started checkout", countUsersWith(firstEventByName, "checkout_started"), totalSignups),
      buildStep("Completed checkout", countUsersWith(firstEventByName, "checkout_completed"), totalSignups),
    ],
    medianTime: {
      signupToFirstVendorMs: median(durationsToVendor),
      signupToFirstCheckoutMs: median(durationsToCheckout),
    },
    retention: {
      week1: retentionFor(signups, eventsByUser, 7),
      week2: retentionFor(signups, eventsByUser, 14),
      week4: retentionFor(signups, eventsByUser, 28),
    },
  });
});

function requireInternalAnalyticsToken(req: Request) {
  if (!env.internalAnalyticsToken) {
    throw new AppError("Internal analytics token is not configured", 503);
  }

  const token = String(req.query.token ?? req.get("x-admin-token") ?? "");
  if (token !== env.internalAnalyticsToken) {
    throw new AppError("Internal analytics token is invalid", 401);
  }
}

function parseDateRange(rangeValue: unknown, startValue: unknown, endValue: unknown) {
  const now = new Date();
  const endDate = parseDate(endValue) ?? now;
  const range = typeof rangeValue === "string" ? rangeValue : "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? null : 30;
  const startDate = parseDate(startValue) ?? (days ? new Date(endDate.getTime() - days * DAY_MS) : new Date(0));

  return { startDate, endDate, rangeLabel: days ? `last_${days}_days` : "all_time" };
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventUserId(event: any) {
  return event.user ? String(event.user) : event.metadata?.userId ? String(event.metadata.userId) : "";
}

function eventCompanyId(event: any) {
  return event.company ? String(event.company) : event.metadata?.companyId ? String(event.metadata.companyId) : "";
}

function countUsersWith(firstEventByName: Map<string, Map<string, Date>>, eventName: string) {
  return Array.from(firstEventByName.values()).filter((firsts) => firsts.has(eventName)).length;
}

function buildStep(label: string, count: number, total: number) {
  return {
    label,
    count,
    percent: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  };
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

function retentionFor(signups: Array<{ userId: string; signupAt: Date }>, eventsByUser: Map<string, any[]>, days: number) {
  const now = Date.now();
  const eligible = signups.filter((signup) => signup.signupAt.getTime() + days * DAY_MS <= now);
  const retained = eligible.filter((signup) => {
    const threshold = signup.signupAt.getTime() + days * DAY_MS;
    return (eventsByUser.get(signup.userId) ?? []).some((event) => new Date(event.createdAt).getTime() >= threshold);
  }).length;

  return {
    retained,
    eligible: eligible.length,
    percent: eligible.length > 0 ? Number(((retained / eligible.length) * 100).toFixed(1)) : 0,
  };
}
