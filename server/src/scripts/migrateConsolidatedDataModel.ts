import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ quiet: true });

type AnyDoc = Record<string, any>;

const PROVIDERS = {
  manual: "manual",
  csv: "csv",
  sample: "sample",
  system: "system",
} as const;

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection did not expose a database");
  }

  const vendors = db.collection("vendors");
  const subscriptions = db.collection("subscriptions");
  const renewals = db.collection("renewals");

  const allVendors = await vendors.find({}).toArray();
  let vendorsUpdated = 0;
  let subscriptionsUpdated = 0;
  let subscriptionsCreated = 0;
  let renewalsDeprecated = 0;

  for (const vendor of allVendors) {
    const vendorSubscriptions = await subscriptions
      .find({ company: vendor.company, vendor: vendor._id })
      .sort({ status: 1, updatedAt: -1, createdAt: -1 })
      .toArray();
    const vendorRenewals = await renewals
      .find({ company: vendor.company, vendor: vendor._id, deprecatedAt: { $exists: false } })
      .sort({ renewalDate: 1, updatedAt: -1 })
      .toArray();

    const primarySubscription = pickPrimarySubscription(vendorSubscriptions);
    const renewal = pickPrimaryRenewal(vendorRenewals, primarySubscription);
    const now = new Date();

    let subscription: AnyDoc | undefined = primarySubscription;
    if (!subscription) {
      const inserted = await subscriptions.insertOne(
        buildSubscriptionFromVendor({ vendor, renewal, now }),
      );
      subscription = (await subscriptions.findOne({ _id: inserted.insertedId })) ?? undefined;
      subscriptionsCreated += 1;
    }

    if (!subscription) {
      continue;
    }

    const consolidated = buildConsolidatedSubscriptionUpdate({ vendor, subscription, renewal, now });
    const subscriptionResult = await subscriptions.updateOne(
      { _id: subscription._id },
      {
        $set: consolidated.$set,
        $setOnInsert: consolidated.$setOnInsert,
      },
    );
    subscriptionsUpdated += subscriptionResult.modifiedCount;

    const displayMonthlySpend = consolidated.$set["spend.displayMonthlySpend"];
    const renewalDate = consolidated.$set["renewal.renewalDate"];
    const seatsPurchased = consolidated.$set["usage.seatsPurchased.value"];
    const activeSeats = consolidated.$set["usage.activeSeats.value"];
    const lastUsedAt = consolidated.$set["usage.lastUsedAt.value"];

    const vendorResult = await vendors.updateOne(
      { _id: vendor._id },
      {
        $set: {
          normalizedName: normalizeName(vendor.name),
          primarySubscription: subscription._id,
          monthlySpend: displayMonthlySpend,
          renewalDate,
          seatsPurchased,
          activeSeats,
          lastUsedAt,
          displayDataUpdatedAt: now,
          "legacy.source": vendor.source,
          "legacy.originalMonthlySpend": numberValue(vendor.monthlySpend),
          "legacy.originalRenewalDate": vendor.renewalDate,
        },
        $addToSet: {
          sources: buildSource(vendor.source ?? PROVIDERS.manual, undefined, vendor.updatedAt ?? vendor.createdAt ?? now),
        },
      },
    );
    vendorsUpdated += vendorResult.modifiedCount;

    if (vendorRenewals.length > 0) {
      const renewalResult = await renewals.updateMany(
        { _id: { $in: vendorRenewals.map((item) => item._id) } },
        {
          $set: {
            status: "migrated",
            deprecatedAt: now,
            supersededBySubscription: subscription._id,
            migrationNote: "Merged into Subscription.renewal by migrateConsolidatedDataModel.",
          },
        },
      );
      renewalsDeprecated += renewalResult.modifiedCount;
    }
  }

  console.log(JSON.stringify({
    vendorsScanned: allVendors.length,
    vendorsUpdated,
    subscriptionsUpdated,
    subscriptionsCreated,
    renewalsDeprecated,
  }, null, 2));

  await mongoose.disconnect();
}

function buildSubscriptionFromVendor({ vendor, renewal, now }: { vendor: AnyDoc; renewal?: AnyDoc; now: Date }) {
  const monthlySpend = numberValue(vendor.monthlySpend);
  const source = buildSource(vendor.source ?? PROVIDERS.manual, undefined, vendor.updatedAt ?? vendor.createdAt ?? now);

  return {
    company: vendor.company,
    vendor: vendor._id,
    planName: "Default",
    billingCycle: "monthly",
    cost: monthlySpend,
    seatsPurchased: numberValue(vendor.seatsPurchased),
    activeSeats: numberValue(vendor.activeSeats),
    renewalDate: renewal?.renewalDate ?? vendor.renewalDate,
    autoRenew: true,
    status: vendor.status === "cancelled" ? "cancelled" : "active",
    spend: {
      committed: moneySource({
        amount: monthlySpend,
        period: "monthly",
        source,
      }),
      observed: [],
      displayPolicy: "prefer_observed_recent",
      displayMonthlySpend: monthlySpend,
      displaySource: source,
    },
    usage: {
      seatsPurchased: { value: numberValue(vendor.seatsPurchased), source },
      activeSeats: { value: numberValue(vendor.activeSeats), source },
      lastUsedAt: { value: vendor.lastUsedAt, source },
    },
    renewal: buildRenewalSubdocument({ vendor, renewal, monthlySpend, source }),
    metadata: {
      migration: {
        createdFromVendor: true,
        originalVendorMonthlySpend: vendor.monthlySpend,
        originalVendorRenewalDate: vendor.renewalDate,
        originalRenewalId: renewal?._id,
      },
    },
    createdAt: vendor.createdAt ?? now,
    updatedAt: now,
  };
}

function buildConsolidatedSubscriptionUpdate({
  vendor,
  subscription,
  renewal,
  now,
}: {
  vendor: AnyDoc;
  subscription: AnyDoc;
  renewal?: AnyDoc;
  now: Date;
}): { $set: AnyDoc; $setOnInsert: AnyDoc } {
  const billingCycle = subscription.billingCycle ?? "monthly";
  const committedAmount = numberValue(subscription.cost || vendor.monthlySpend);
  const committedMonthlyAmount = normalizeToMonthly(committedAmount, billingCycle);
  const source = buildSource(vendor.source ?? PROVIDERS.manual, undefined, subscription.updatedAt ?? vendor.updatedAt ?? now);
  const renewalDate = subscription.renewal?.renewalDate ?? subscription.renewalDate ?? renewal?.renewalDate ?? vendor.renewalDate;
  const contractValue = numberValue(renewal?.contractValue) || committedMonthlyAmount * 12;

  return {
    $set: {
      billingCycle,
      cost: committedAmount,
      renewalDate,
      seatsPurchased: numberValue(subscription.seatsPurchased ?? vendor.seatsPurchased),
      activeSeats: numberValue(subscription.activeSeats ?? vendor.activeSeats),
      "spend.committed": moneySource({
        amount: committedAmount,
        period: billingCycle,
        source,
      }),
      "spend.displayPolicy": subscription.spend?.displayPolicy ?? "prefer_observed_recent",
      "spend.displayMonthlySpend": numberValue(subscription.spend?.displayMonthlySpend) || committedMonthlyAmount,
      "spend.displaySource": subscription.spend?.displaySource ?? source,
      "usage.seatsPurchased": {
        value: numberValue(subscription.seatsPurchased ?? vendor.seatsPurchased),
        source,
      },
      "usage.activeSeats": {
        value: numberValue(subscription.activeSeats ?? vendor.activeSeats),
        source,
      },
      "usage.lastUsedAt": {
        value: vendor.lastUsedAt,
        source,
      },
      "renewal.renewalDate": renewalDate,
      "renewal.noticeDeadline": renewal?.noticeDeadline ?? subscription.renewal?.noticeDeadline,
      "renewal.contractValue": numberValue(subscription.renewal?.contractValue) || contractValue,
      "renewal.status": renewal?.status ?? subscription.renewal?.status ?? (renewalDate ? "upcoming" : "none"),
      "renewal.riskLevel": renewal?.riskLevel ?? subscription.renewal?.riskLevel ?? "medium",
      "renewal.recommendation": renewal?.recommendation ?? subscription.renewal?.recommendation,
      "renewal.source": renewal ? buildSource(PROVIDERS.manual, String(renewal._id), renewal.updatedAt ?? now) : source,
      "metadata.migration.consolidatedAt": now,
      "metadata.migration.originalVendorMonthlySpend": vendor.monthlySpend,
      "metadata.migration.originalVendorRenewalDate": vendor.renewalDate,
      "metadata.migration.originalRenewalIds": renewal ? [renewal._id] : [],
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  };
}

function buildRenewalSubdocument({
  vendor,
  renewal,
  monthlySpend,
  source,
}: {
  vendor: AnyDoc;
  renewal?: AnyDoc;
  monthlySpend: number;
  source: AnyDoc;
}) {
  const renewalDate = renewal?.renewalDate ?? vendor.renewalDate;

  return {
    renewalDate,
    noticeDeadline: renewal?.noticeDeadline,
    contractValue: numberValue(renewal?.contractValue) || monthlySpend * 12,
    status: renewal?.status ?? (renewalDate ? "upcoming" : "none"),
    riskLevel: renewal?.riskLevel ?? "medium",
    recommendation: renewal?.recommendation,
    source: renewal ? buildSource(PROVIDERS.manual, String(renewal._id), renewal.updatedAt) : source,
  };
}

function pickPrimarySubscription(subscriptions: AnyDoc[]) {
  return (
    subscriptions.find((subscription) => subscription.status === "active") ??
    subscriptions.find((subscription) => subscription.status !== "cancelled") ??
    subscriptions[0]
  );
}

function pickPrimaryRenewal(renewals: AnyDoc[], subscription?: AnyDoc) {
  if (!renewals.length) return undefined;
  if (subscription?._id) {
    return renewals.find((renewal) => String(renewal.subscription) === String(subscription._id)) ?? renewals[0];
  }
  return renewals[0];
}

function moneySource({
  amount,
  period,
  source,
}: {
  amount: number;
  period: string;
  source: AnyDoc;
}) {
  return {
    amount,
    currency: "USD",
    period,
    monthlyAmount: normalizeToMonthly(amount, period),
    source,
    active: true,
  };
}

function normalizeToMonthly(amount: number, period: string) {
  if (period === "annual") return Math.round((amount / 12) * 100) / 100;
  if (period === "quarterly") return Math.round((amount / 3) * 100) / 100;
  return amount;
}

function buildSource(provider: string, externalId?: string, importedAt?: Date) {
  return {
    provider: normalizeProvider(provider),
    externalId,
    importedAt: importedAt ?? new Date(),
    confidence: 1,
  };
}

function normalizeProvider(provider: string) {
  if (provider === "bank_feed") return "quickbooks";
  if (provider === "sso") return "google_workspace";
  if (provider === "email") return "email";
  if (provider === "csv") return "csv";
  if (provider === "sample") return "sample";
  return "manual";
}

function normalizeName(name: string) {
  return String(name ?? "").trim().toLowerCase();
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
