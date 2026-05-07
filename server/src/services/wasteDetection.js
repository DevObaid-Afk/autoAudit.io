const DAY_MS = 24 * 60 * 60 * 1000;

export function buildAuditSummary({ vendors = [], subscriptions = [], renewals = [] }) {
  const monthlySpend = vendors.reduce((sum, vendor) => sum + numberValue(vendor.monthlySpend), 0);
  const activeVendors = vendors.filter((vendor) => vendor.status !== "cancelled").length;
  const zombieSubscriptions = vendors.filter(isZombieVendor);
  const unusedSeatFindings = vendors.map(buildUnusedSeatFinding).filter(Boolean);
  const duplicateTools = buildDuplicateToolFindings(vendors);
  const upcomingRenewals = buildUpcomingRenewals({ vendors, renewals });

  const zombieSavings = zombieSubscriptions.reduce((sum, vendor) => sum + numberValue(vendor.monthlySpend) * 12, 0);
  const unusedSeatSavings = unusedSeatFindings.reduce((sum, finding) => sum + finding.annualWaste, 0);
  const duplicateSavings = duplicateTools.reduce((sum, finding) => sum + finding.estimatedWaste, 0);

  const wasteSignals = [
    ...zombieSubscriptions.map((vendor) => ({
      type: "zombie_subscription",
      vendorId: vendor._id,
      vendorName: vendor.name,
      annualImpact: numberValue(vendor.monthlySpend) * 12,
      confidence: 94,
      recommendation: `Cancel or downgrade ${vendor.name}; no meaningful usage detected.`,
    })),
    ...unusedSeatFindings.map((finding) => ({
      type: "unused_seats",
      vendorId: finding.vendorId,
      vendorName: finding.vendorName,
      annualImpact: finding.annualWaste,
      confidence: 88,
      recommendation: `Remove ${finding.unusedSeats} unused ${finding.vendorName} seats.`,
    })),
    ...duplicateTools.map((finding) => ({
      type: "duplicate_tools",
      category: finding.category,
      vendorNames: finding.vendorNames,
      annualImpact: finding.estimatedWaste,
      confidence: 81,
      recommendation: `Consolidate ${finding.category} tools: ${finding.vendorNames.join(", ")}.`,
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

export function classifyVendorWaste(vendor) {
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

function buildUnusedSeatFinding(vendor) {
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
  };
}

function buildDuplicateToolFindings(vendors) {
  const byCategory = vendors.reduce((groups, vendor) => {
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
      const duplicateVendors = sortedBySpend.slice(1);
      const estimatedWaste = Math.round(duplicateVendors.reduce((sum, vendor) => sum + numberValue(vendor.monthlySpend) * 12, 0));

      return {
        category,
        vendorNames: group.map((vendor) => vendor.name),
        estimatedWaste,
        recommendation: `Keep ${sortedBySpend[0].name}; review ${duplicateVendors.map((vendor) => vendor.name).join(", ")}.`,
      };
    })
    .filter((finding) => finding.estimatedWaste > 0);
}

function buildUpcomingRenewals({ vendors, renewals }) {
  const renewalItems = [
    ...renewals.map((renewal) => ({
      id: renewal._id,
      vendorName: renewal.vendor?.name ?? renewal.vendorName,
      renewalDate: renewal.renewalDate,
      contractValue: numberValue(renewal.contractValue),
      riskLevel: renewal.riskLevel,
      source: "renewal",
    })),
    ...vendors
      .filter((vendor) => vendor.renewalDate)
      .map((vendor) => ({
        id: vendor._id,
        vendorName: vendor.name,
        renewalDate: vendor.renewalDate,
        contractValue: numberValue(vendor.monthlySpend) * 12,
        riskLevel: isRenewalSoon(vendor.renewalDate, 30) ? "high" : "medium",
        source: "vendor",
      })),
  ];

  return renewalItems
    .filter((item) => isRenewalSoon(item.renewalDate, 60))
    .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
}

function isZombieVendor(vendor) {
  const hasNoActiveSeats = numberValue(vendor.seatsPurchased) > 0 && numberValue(vendor.activeSeats) === 0;
  const daysInactive = daysSince(vendor.lastUsedAt);

  return vendor.status === "zombie" || hasNoActiveSeats || Boolean(vendor.lastUsedAt) && daysInactive >= 90;
}

function isRenewalSoon(date, days) {
  if (!date) return false;

  const now = new Date();
  const renewalDate = new Date(date);
  const diffDays = Math.ceil((renewalDate.getTime() - now.getTime()) / DAY_MS);

  return diffDays >= 0 && diffDays <= days;
}

function daysSince(date) {
  if (!date) return Number.POSITIVE_INFINITY;

  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

function numberValue(value) {
  return Number(value ?? 0);
}
