import type { Request } from "express";
import mongoose from "mongoose";
import { AnalyticsEvent } from "../models/AnalyticsEvent.js";

export type ActivationEventName =
  | "user_signed_up"
  | "vendor_added"
  | "csv_imported"
  | "waste_signal_viewed"
  | "action_item_created"
  | "report_generated"
  | "ai_email_generated"
  | "savings_confirmed"
  | "teammate_invited"
  | "checkout_started"
  | "checkout_completed"
  | "upgrade_requested";

type TrackActivationEventInput = {
  req?: Request;
  eventName: ActivationEventName;
  userId?: unknown;
  companyId?: unknown;
  properties: Record<string, unknown>;
};

export async function trackActivationEvent({
  req,
  eventName,
  userId,
  companyId,
  properties,
}: TrackActivationEventInput) {
  const timestamp = new Date();
  const resolvedUserId = toObjectId(userId ?? req?.user?._id);
  const resolvedCompanyId = toObjectId(companyId ?? req?.companyId ?? req?.user?.company);

  try {
    await AnalyticsEvent.create({
      eventName,
      metadata: {
        ...properties,
        userId: stringifyId(resolvedUserId),
        companyId: stringifyId(resolvedCompanyId),
        timestamp: timestamp.toISOString(),
      },
      company: resolvedCompanyId,
      user: resolvedUserId,
      ipAddress: req?.ip,
      userAgent: req?.get("user-agent"),
    });
  } catch (error) {
    console.error(`Failed to record activation event ${eventName}`, error);
  }
}

function stringifyId(value: unknown) {
  if (!value) return undefined;
  return String(value);
}

function toObjectId(value: unknown) {
  if (!value) return undefined;
  const stringValue = String(value);
  return mongoose.Types.ObjectId.isValid(stringValue) ? new mongoose.Types.ObjectId(stringValue) : undefined;
}
