# Consolidated Vendor, Subscription, and Renewal Data Model

## Architecture Decision

Keep `Vendor` as the vendor identity and dashboard read model. A vendor is the stable SaaS tool record: name, category, owner, notes, lifecycle status, and computed waste classification. It should not be the write authority for commercial terms, renewal dates, invoice spend, or integration usage.

Keep `Subscription`, but promote it to the authoritative commercial agreement model. It owns plan, billing cycle, committed contract spend, renewal date, notice deadline, payment source, and renewal workflow fields. The collection name can remain `subscriptions` for backward compatibility, but the model should be treated as `VendorContract` in product language.

Deprecate standalone `Renewal`. The old `Renewal` model overlaps with `Subscription.renewalDate` and should become a migration-only/read-only legacy model. Its fields move into `Subscription.renewal`. If a future workflow needs multiple renewal events per contract, add `RenewalEvent` later as an event log, not as another source of the current renewal date.

Add source-aware subdocuments to support integrations. Every authoritative value that can arrive from a user or integration gets provenance: provider, external id, import time, confidence, and whether the value is active. This prevents Google Workspace, Stripe, and QuickBooks from overwriting each other invisibly.

Keep backward-compatible fields on `Vendor`: `monthlySpend`, `seatsPurchased`, `activeSeats`, `lastUsedAt`, and `renewalDate`. These become denormalized compatibility fields maintained from the authoritative `Subscription` record so the current dashboard and `buildAuditSummary()` can keep working while API routes are migrated.

## Source Of Truth

Spend:
`Subscription.spend` is authoritative. `Vendor.monthlySpend` is a display/cache field derived from `Subscription.spend.displayMonthlySpend`.

Renewal date:
`Subscription.renewal.renewalDate` is authoritative. `Vendor.renewalDate` is a display/cache field derived from the active subscription.

Usage:
`Subscription.usage` is authoritative for seats and last activity because usage is tied to a product plan/account, not the vendor identity. `Vendor.seatsPurchased`, `Vendor.activeSeats`, and `Vendor.lastUsedAt` are compatibility cache fields derived from the active subscription.

## Revised Mongoose Schemas

### Vendor

```js
import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["manual", "csv", "google_workspace", "stripe", "quickbooks", "email", "sample", "system"],
      required: true,
    },
    externalId: { type: String, trim: true },
    externalUrl: { type: String, trim: true },
    importedAt: { type: Date, default: Date.now },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
  },
  { _id: false },
);

const vendorSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true, index: true },
    category: { type: String, default: "Uncategorized", trim: true, maxlength: 100 },
    ownerName: { type: String, trim: true, maxlength: 120 },
    ownerEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    status: {
      type: String,
      enum: ["active", "zombie", "duplicate", "renewal_risk", "unused_seats", "cancelled"],
      default: "active",
      index: true,
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, maxlength: 1000 },
    aliases: [{ type: String, trim: true, maxlength: 140 }],
    sources: { type: [sourceSchema], default: [] },
    primarySubscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", index: true },

    // Backward-compatible dashboard read fields. Do not write these directly from new features.
    monthlySpend: { type: Number, default: 0, min: 0 },
    seatsPurchased: { type: Number, default: 0, min: 0 },
    activeSeats: { type: Number, default: 0, min: 0 },
    lastUsedAt: { type: Date },
    renewalDate: { type: Date },
    displayDataUpdatedAt: { type: Date },

    legacy: {
      source: { type: String, enum: ["manual", "csv", "email", "sso", "bank_feed", "sample"] },
      originalMonthlySpend: { type: Number, min: 0 },
      originalRenewalDate: { type: Date },
    },
  },
  { timestamps: true },
);

vendorSchema.pre("validate", function normalizeVendorName(next) {
  if (this.name && !this.normalizedName) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
  next();
});

vendorSchema.index({ company: 1, normalizedName: 1 }, { unique: true });
vendorSchema.index({ company: 1, status: 1, monthlySpend: -1 });
vendorSchema.index({ company: 1, category: 1, monthlySpend: -1 });
vendorSchema.index({ company: 1, renewalDate: 1 });
vendorSchema.index({ name: "text", category: "text", ownerName: "text", ownerEmail: "text", aliases: "text" });

export const Vendor = mongoose.model("Vendor", vendorSchema);
```

### Subscription

```js
import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["manual", "csv", "google_workspace", "stripe", "quickbooks", "email", "sample", "system"],
      required: true,
    },
    externalId: { type: String, trim: true },
    externalUrl: { type: String, trim: true },
    importedAt: { type: Date, default: Date.now },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
  },
  { _id: false },
);

const moneySourceSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, minlength: 3, maxlength: 3 },
    period: { type: String, enum: ["monthly", "quarterly", "annual", "one_time"], default: "monthly" },
    monthlyAmount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 240 },
    invoiceDate: { type: Date },
    source: { type: sourceSchema, required: true },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const subscriptionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    planName: { type: String, required: true, trim: true, maxlength: 140 },
    status: { type: String, enum: ["active", "cancelled", "paused"], default: "active", index: true },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: true },
    billingCycle: { type: String, enum: ["monthly", "annual", "quarterly"], default: "monthly" },
    paymentSource: { type: String, trim: true, maxlength: 100 },

    spend: {
      committed: moneySourceSchema,
      observed: { type: [moneySourceSchema], default: [] },
      override: moneySourceSchema,
      displayPolicy: {
        type: String,
        enum: ["manual_override", "prefer_observed_recent", "prefer_committed"],
        default: "prefer_observed_recent",
      },
      displayMonthlySpend: { type: Number, default: 0, min: 0 },
      displaySource: { type: sourceSchema },
    },

    usage: {
      seatsPurchased: { value: { type: Number, default: 0, min: 0 }, source: sourceSchema },
      activeSeats: { value: { type: Number, default: 0, min: 0 }, source: sourceSchema },
      lastUsedAt: { value: { type: Date }, source: sourceSchema },
      accountExternalId: { type: String, trim: true },
    },

    renewal: {
      renewalDate: { type: Date, index: true },
      noticeDeadline: { type: Date },
      contractValue: { type: Number, default: 0, min: 0 },
      status: {
        type: String,
        enum: ["upcoming", "in_review", "negotiating", "cancelled", "renewed", "none"],
        default: "none",
      },
      riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
      recommendation: { type: String, maxlength: 1000 },
      source: { type: sourceSchema },
    },

    integrations: {
      stripeSubscriptionId: { type: String, trim: true, index: true },
      quickBooksVendorId: { type: String, trim: true, index: true },
      googleWorkspaceAppId: { type: String, trim: true, index: true },
    },

    // Legacy fields remain readable during rollout.
    cost: { type: Number, default: 0, min: 0 },
    renewalDate: { type: Date },
    seatsPurchased: { type: Number, default: 0, min: 0 },
    activeSeats: { type: Number, default: 0, min: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

subscriptionSchema.index({ company: 1, status: 1, "renewal.renewalDate": 1 });
subscriptionSchema.index({ company: 1, vendor: 1, status: 1 });
subscriptionSchema.index({ company: 1, "spend.displayMonthlySpend": -1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
```

### Renewal

```js
import mongoose from "mongoose";

const renewalSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", index: true },

    // Legacy snapshot fields retained for old records and auditability.
    renewalDate: { type: Date, required: true, index: true },
    noticeDeadline: { type: Date },
    contractValue: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["upcoming", "in_review", "negotiating", "cancelled", "renewed", "migrated"],
      default: "upcoming",
    },
    riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    recommendation: { type: String, maxlength: 1000 },

    deprecatedAt: { type: Date },
    supersededBySubscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    migrationNote: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

renewalSchema.index({ company: 1, status: 1, renewalDate: 1 });
renewalSchema.index({ company: 1, riskLevel: 1, renewalDate: 1 });
renewalSchema.index({ company: 1, supersededBySubscription: 1 });

export const Renewal = mongoose.model("Renewal", renewalSchema);
```

## Updated `buildAuditSummary()` Query

The function should receive vendor summaries built from `Vendor` plus active `Subscription` records. The old call shape can remain as a compatibility wrapper, but new code should query `Subscription` as the commercial source.

```js
export async function getAuditSummaryForCompany(companyId) {
  const subscriptions = await Subscription.find({ company: companyId, status: { $ne: "cancelled" } })
    .populate("vendor")
    .lean();

  return buildAuditSummary({
    vendors: subscriptions.map((subscription) => ({
      _id: subscription.vendor._id,
      name: subscription.vendor.name,
      category: subscription.vendor.category,
      ownerName: subscription.vendor.ownerName,
      status: subscription.vendor.status,
      riskScore: subscription.vendor.riskScore,
      monthlySpend: subscription.spend?.displayMonthlySpend ?? subscription.cost ?? 0,
      seatsPurchased: subscription.usage?.seatsPurchased?.value ?? subscription.seatsPurchased ?? 0,
      activeSeats: subscription.usage?.activeSeats?.value ?? subscription.activeSeats ?? 0,
      lastUsedAt: subscription.usage?.lastUsedAt?.value,
      renewalDate: subscription.renewal?.renewalDate ?? subscription.renewalDate,
    })),
    subscriptions,
    renewals: subscriptions
      .filter((subscription) => subscription.renewal?.renewalDate)
      .map((subscription) => ({
        _id: subscription._id,
        vendor: subscription.vendor,
        renewalDate: subscription.renewal.renewalDate,
        contractValue:
          subscription.renewal.contractValue ||
          (subscription.spend?.displayMonthlySpend ?? subscription.cost ?? 0) * 12,
        riskLevel: subscription.renewal.riskLevel,
      })),
  });
}
```

## User Spend vs QuickBooks Spend

Do not silently overwrite manual spend with QuickBooks spend.

The display winner is determined by `Subscription.spend.displayPolicy`:

- `manual_override`: show the user-entered override as the dashboard spend.
- `prefer_observed_recent`: show recent QuickBooks observed spend when it exists; otherwise show committed/manual contract spend.
- `prefer_committed`: show the contract amount even if observed invoice spend exists.

Recommended default:

Use QuickBooks as the displayed spend when it is recent, recurring, and mapped with high confidence. Keep the user-entered value as `spend.committed` or `spend.override`. Show both values in UI copy such as: "Displayed spend: $1,240/mo from QuickBooks. Contract estimate: $1,000/mo entered manually."

For savings calculations, use `displayMonthlySpend` and include provenance in evidence. This keeps reports honest: the number has one winner, but reviewers can see the competing values and the source behind each.
