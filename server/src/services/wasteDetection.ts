import type { Types } from "mongoose";
import type { VendorStatus } from "../models/Vendor.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type WasteSignalType = "zombie_subscription" | "unused_seats" | "duplicate_tools";
export type RenewalRiskLevel = "low" | "medium" | "high" | "critical";
export type UpcomingRenewalSource = "renewal" | "vendor";

export type AuditVendor = {
  _id?: Types.ObjectId | string;
  name: string;
  category?: string;
  ownerName?: string;
  monthlySpend?: number | null;
  seatsPurchased?: number | null;
  activeSeats?: number | null;
  lastUsedAt?: Date | string | null;
  renewalDate?: Date | string | null;
  status?: VendorStatus | string;
};

export type AuditSubscription = Record<string, unknown>;

export type AuditRenewal = {
  _id?: Types.ObjectId | string;
  vendor?: { name?: string } | null;
  vendorName?: string;
  renewalDate?: Date | string | null;
  contractValue?: number | null;
  riskLevel?: RenewalRiskLevel;
};

export type UnusedSeatFinding = {
  vendorId?: Types.ObjectId | string;
  vendorName: string;
  ownerName?: string;
  unusedSeats: number;
  annualWaste: number;
  recommendation: string;
  evidence: string[];
};

export type DuplicateToolFinding = {
  category: string;
  vendorNames: string[];
  estimatedWaste: number;
  recommendation: string;
  evidence: string[];
};

export type UpcomingRenewal = {
  id?: Types.ObjectId | string;
  vendorName?: string;
  renewalDate?: Date | string | null;
  contractValue: number;
  riskLevel: RenewalRiskLevel;
  source: UpcomingRenewalSource;
};

export type WasteSignal = {
  type: WasteSignalType;
  vendorId?: Types.ObjectId | string;
  vendorName?: string;
  category?: string;
  vendorNames?: string[];
  annualImpact: number;
  confidence: number;
  recommendation: string;
  evidence: string[];
};

export type AuditSummary = {
  monthlySpend: number;
  estimatedAnnualSavings: number;
  monthlyWasteFound: number;
  activeVendors: number;
  vendorCount: number;
  subscriptionCount: number;
  zombieSubscriptionCount: number;
  unusedSeatCount: number;
  upcomingRenewalCount: number;
  unusedSeats: UnusedSeatFinding[];
  duplicateTools: DuplicateToolFinding[];
  upcomingRenewals: UpcomingRenewal[];
  wasteSignals: WasteSignal[];
};

export type VendorClassification = {
  status: VendorStatus;
  riskScore: number;
};

export function buildAuditSummary({
  vendors = [],
  subscriptions = [],
  renewals = [],
}: {
  vendors?: AuditVendor[];
  subscriptions?: AuditSubscription[];
  renewals?: AuditRenewal[];
} = {}): AuditSummary {
  const monthlySpend = vendors.reduce((sum, vendor) => sum + numberValue(vendor.monthlySpend), 0);
  const activeVendors = vendors.filter((vendor) => vendor.status !== "cancelled").length;
  const zombieSubscriptions = vendors.filter(isZombieVendor);
  const unusedSeatFindings = vendors.map(buildUnusedSeatFinding).filter(isPresent);
  const duplicateTools = buildDuplicateToolFindings(vendors);
  const upcomingRenewals = buildUpcomingRenewals({ vendors, renewals });

  const zombieSavings = zombieSubscriptions.reduce((sum, vendor) => sum + numberValue(vendor.monthlySpend) * 12, 0);
  const unusedSeatSavings = unusedSeatFindings.reduce((sum, finding) => sum + finding.annualWaste, 0);
  const duplicateSavings = duplicateTools.reduce((sum, finding) => sum + finding.estimatedWaste, 0);

  const wasteSignals: WasteSignal[] = [
    ...zombieSubscriptions.map((vendor) => ({
      type: "zombie_subscription" as const,
      vendorId: vendor._id,
      vendorName: vendor.name,
      annualImpact: numberValue(vendor.monthlySpend) * 12,
      confidence: 94,
      recommendation: `Cancel or downgrade ${vendor.name}; no meaningful usage detected.`,
      evidence: buildZombieEvidence(vendor),
    })),
    ...unusedSeatFindings.map((finding) => ({
      type: "unused_seats" as const,
      vendorId: finding.vendorId,
      vendorName: finding.vendorName,
      annualImpact: finding.annualWaste,
      confidence: 88,
      recommendation: `Remove ${finding.unusedSeats} unused ${finding.vendorName} seats.`,
      evidence: finding.evidence,
    })),
    ...duplicateTools.map((finding) => ({
      type: "duplicate_tools" as const,
      category: finding.category,
      vendorNames: finding.vendorNames,
      annualImpact: finding.estimatedWaste,
      confidence: 81,
      recommendation: `Consolidate ${finding.category} tools: ${finding.vendorNames.join(", ")}.`,
      evidence: finding.evidence,
    })),
  ].sort((a, b) => b.annualImpact - a.annualImpact);

  return {
    monthlySpend,
    estimatedAnnualSavings: Math.round(zombieSavings + unusedSeatSavings + duplicateSavings),
    monthlyWasteFound: Math.round((zombieSavings + unusedSeatSavings + duplicateSavings) / 12),
    activeVendors,
    vendorCount: vendors.length,
    subscriptionCount: subscriptions.length,
    zombieSubscriptionCount: zombieSubscriptions.length,
    unusedSeatCount: unusedSeatFindings.reduce((sum, finding) => sum + finding.unusedSeats, 0),
    upcomingRenewalCount: upcomingRenewals.length,
    unusedSeats: unusedSeatFindings,
    duplicateTools,
    upcomingRenewals,
    wasteSignals,
  };
}

export function classifyVendorWaste(vendor: AuditVendor): VendorClassification {
  if (isZombieVendor(vendor)) {
    return { status: "zombie", riskScore: 95 };
  }

  const unusedSeats = numberValue(vendor.seatsPurchased) - numberValue(vendor.activeSeats);
  if (unusedSeats > 0 && numberValue(vendor.seatsPurchased) > 0) {
    const unusedRatio = unusedSeats / numberValue(vendor.seatsPurchased);
    if (unusedRatio >= 0.25) {
      return { status: "unused_seats", riskScore: Math.round(unusedRatio * 100) };
    }
  }

  if (isRenewalSoon(vendor.renewalDate, 60)) {
    return { status: "renewal_risk", riskScore: 78 };
  }

  return { status: "active", riskScore: 20 };
}

function buildUnusedSeatFinding(vendor: AuditVendor): UnusedSeatFinding | null {
  const seatsPurchased = numberValue(vendor.seatsPurchased);
  const activeSeats = numberValue(vendor.activeSeats);
  const unusedSeats = Math.max(seatsPurchased - activeSeats, 0);

  if (!unusedSeats || !seatsPurchased || !numberValue(vendor.monthlySpend)) {
    return null;
  }

  const monthlySeatCost = numberValue(vendor.monthlySpend) / seatsPurchased;
  const annualWaste = Math.round(monthlySeatCost * unusedSeats * 12);

  if (annualWaste <= 0) {
    return null;
  }

  return {
    vendorId: vendor._id,
    vendorName: vendor.name,
    ownerName: vendor.ownerName,
    unusedSeats,
    annualWaste,
    recommendation: `Reduce ${vendor.name} by ${unusedSeats} seats.`,
    evidence: [
      `${seatsPurchased} seats purchased`,
      `${activeSeats} active seats`,
      `${unusedSeats} unused seats`,
      `$${Math.round(monthlySeatCost).toLocaleString("en-US")} estimated monthly cost per seat`,
      `$${annualWaste.toLocaleString("en-US")} estimated annual waste`,
    ],
  };
}

function buildDuplicateToolFindings(vendors: AuditVendor[]): DuplicateToolFinding[] {
  const byCategory = vendors.reduce<Map<string, AuditVendor[]>>((groups, vendor) => {
    const key = (vendor.category || "Uncategorized").trim();
    const bucket = groups.get(key) ?? [];
    bucket.push(vendor);
    groups.set(key, bucket);
    return groups;
  }, new Map());

  return Array.from(byCategory.entries())
    .filter(([, group]) => group.length > 1)
    .map(([category, group]) => {
      const sortedBySpend = [...group].sort((a, b) => numberValue(b.monthlySpend) - numberValue(a.monthlySpend));
      const keeper = sortedBySpend[0];
      const duplicateVendors = sortedBySpend.slice(1);
      const estimatedWaste = Math.round(duplicateVendors.reduce((sum, vendor) => sum + numberValue(vendor.monthlySpend) * 12, 0));

      return {
        category,
        vendorNames: group.map((vendor) => vendor.name),
        estimatedWaste,
        recommendation: `Keep ${keeper.name}; review ${duplicateVendors.map((vendor) => vendor.name).join(", ")}.`,
        evidence: [
          `${group.length} tools share the ${category} category`,
          `${keeper.name} has the highest monthly spend in this group`,
          `${duplicateVendors.map((vendor) => vendor.name).join(", ")} creates $${estimatedWaste.toLocaleString("en-US")} estimated annual overlap`,
        ],
      };
    })
    .filter((finding) => finding.estimatedWaste > 0);
}

function buildZombieEvidence(vendor: AuditVendor): string[] {
  const evidence: string[] = [];
  const monthlySpend = numberValue(vendor.monthlySpend);
  const seatsPurchased = numberValue(vendor.seatsPurchased);
  const activeSeats = numberValue(vendor.activeSeats);
  const inactiveDays = daysSince(vendor.lastUsedAt);

  if (monthlySpend > 0) {
    evidence.push(`$${monthlySpend.toLocaleString("en-US")} monthly spend`);
    evidence.push(`$${(monthlySpend * 12).toLocaleString("en-US")} estimated annual exposure`);
  }

  if (seatsPurchased > 0) {
    evidence.push(`${seatsPurchased} seats purchased`);
    evidence.push(`${activeSeats} active seats`);
  }

  if (Number.isFinite(inactiveDays)) {
    evidence.push(`Last usage was ${inactiveDays} days ago`);
  }

  if (vendor.status === "zombie") {
    evidence.push("Vendor status is marked as zombie");
  }

  return evidence;
}

function buildUpcomingRenewals({ vendors, renewals }: { vendors: AuditVendor[]; renewals: AuditRenewal[] }): UpcomingRenewal[] {
  const renewalItems: UpcomingRenewal[] = [
    ...renewals.map((renewal) => ({
      id: renewal._id,
      vendorName: renewal.vendor?.name ?? renewal.vendorName,
      renewalDate: renewal.renewalDate,
      contractValue: numberValue(renewal.contractValue),
      riskLevel: renewal.riskLevel ?? "medium",
      source: "renewal" as const,
    })),
    ...vendors
      .filter((vendor) => vendor.renewalDate)
      .map((vendor) => ({
        id: vendor._id,
        vendorName: vendor.name,
        renewalDate: vendor.renewalDate,
        contractValue: numberValue(vendor.monthlySpend) * 12,
        riskLevel: isRenewalSoon(vendor.renewalDate, 30) ? "high" as const : "medium" as const,
        source: "vendor" as const,
      })),
  ];

  return renewalItems
    .filter((item) => isRenewalSoon(item.renewalDate, 60))
    .sort((a, b) => new Date(a.renewalDate ?? 0).getTime() - new Date(b.renewalDate ?? 0).getTime());
}

function isZombieVendor(vendor: AuditVendor): boolean {
  const hasNoActiveSeats = numberValue(vendor.seatsPurchased) > 0 && numberValue(vendor.activeSeats) === 0;
  const daysInactive = daysSince(vendor.lastUsedAt);

  return vendor.status === "zombie" || hasNoActiveSeats || Boolean(vendor.lastUsedAt) && daysInactive >= 90;
}

function isRenewalSoon(date: Date | string | null | undefined, days: number): boolean {
  if (!date) return false;

  const now = new Date();
  const renewalDate = new Date(date);
  const diffDays = Math.ceil((renewalDate.getTime() - now.getTime()) / DAY_MS);

  return diffDays >= 0 && diffDays <= days;
}

function daysSince(date: Date | string | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY;

  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

function numberValue(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
