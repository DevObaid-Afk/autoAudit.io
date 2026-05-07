export type ApiUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  company: string;
};

export type ApiCompany = {
  _id: string;
  name: string;
  domain?: string;
  plan: "free" | "starter" | "growth" | "enterprise";
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
  company: ApiCompany;
};

export type ApiVendor = {
  _id: string;
  name: string;
  category: string;
  ownerName?: string;
  ownerEmail?: string;
  monthlySpend: number;
  seatsPurchased: number;
  activeSeats: number;
  lastUsedAt?: string;
  renewalDate?: string;
  status: "active" | "zombie" | "duplicate" | "renewal_risk" | "unused_seats" | "cancelled";
  riskScore: number;
  source: "manual" | "csv" | "email" | "sso" | "bank_feed";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateVendorInput = {
  name: string;
  category?: string;
  ownerName?: string;
  ownerEmail?: string;
  monthlySpend?: number;
  seatsPurchased?: number;
  activeSeats?: number;
  lastUsedAt?: string;
  renewalDate?: string;
  notes?: string;
};

export type ApiRenewal = {
  _id: string;
  vendor?: ApiVendor;
  renewalDate: string;
  noticeDeadline?: string;
  contractValue: number;
  status: "upcoming" | "in_review" | "negotiating" | "cancelled" | "renewed";
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendation?: string;
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
  unusedSeats: Array<{
    vendorId: string;
    vendorName: string;
    ownerName?: string;
    unusedSeats: number;
    annualWaste: number;
    recommendation: string;
  }>;
  duplicateTools: Array<{
    category: string;
    vendorNames: string[];
    estimatedWaste: number;
    recommendation: string;
  }>;
  upcomingRenewals: Array<{
    id: string;
    vendorName?: string;
    renewalDate: string;
    contractValue: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    source: "renewal" | "vendor";
  }>;
  wasteSignals: Array<{
    type: "zombie_subscription" | "unused_seats" | "duplicate_tools";
    vendorId?: string;
    vendorName?: string;
    category?: string;
    vendorNames?: string[];
    annualImpact: number;
    confidence: number;
    recommendation: string;
  }>;
};

