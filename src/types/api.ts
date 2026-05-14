export type ApiUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  company: string;
  emailVerifiedAt?: string;
  avatarUrl?: string;
  avatarSource?: "initials" | "upload" | "ai";
  avatarUpdatedAt?: string;
  avatarGenerationUsage?: {
    periodStart?: string;
    count?: number;
  };
};

export type AvatarStyle =
  | "professional_executive"
  | "minimal_3d"
  | "modern_gradient_portrait"
  | "abstract_corporate"
  | "founder_style"
  | "cyber_minimal"
  | "clean_illustrated"
  | "finance_ops";

export type AvatarAccess = {
  plan: ApiCompany["plan"];
  canGenerate: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetDate: string;
  styles: AvatarStyle[];
};

export type ApiCompany = {
  _id: string;
  name: string;
  domain?: string;
  plan: "free" | "starter" | "standard" | "growth" | "enterprise" | "custom";
  trialStartedAt?: string;
  trialEndsAt?: string;
  subscriptionStatus?: "trialing" | "active" | "expired";
  stripeCustomerId?: string;
  planUsage?: {
    reportsGenerated?: number;
    aiEmailsGenerated?: number;
    vendorAnalysesGenerated?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  settings?: {
    requireCfoApprovalAbove: number;
    weeklyRenewalDigest: boolean;
    autoDraftCancellationEmails: boolean;
    allowManagedRenegotiation?: boolean;
  };
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
  company: ApiCompany;
};

export type TeamRole = "viewer" | "member" | "admin";

export type ApiTeamMember = {
  id: string;
  name: string;
  email: string;
  role: ApiUser["role"];
  joinedAt?: string;
  emailVerifiedAt?: string;
  avatarUrl?: string;
  avatarSource?: ApiUser["avatarSource"];
};

export type ApiTeamInvite = {
  id: string;
  email: string;
  role: TeamRole;
  expiresAt: string;
  acceptedAt?: string;
  createdAt?: string;
  createdBy?: {
    name?: string;
    email?: string;
  };
};

export type SavingsType = "cancelled" | "renegotiated" | "seat_reduced" | "other";

export type ApiSavingsEntry = {
  id: string;
  vendorId?: string;
  vendorName: string;
  savingsType: SavingsType;
  monthlySavings: number;
  annualSavings: number;
  confirmedBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: ApiUser["role"];
  };
  confirmedAt: string;
  notes?: string;
  companyId: string;
};

export type SavingsSummary = {
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  confirmedActionsCount: number;
  breakdown: Record<SavingsType, { monthlySavings: number; annualSavings: number; count: number }>;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
    evidence?: string[];
  }>;
  duplicateTools: Array<{
    category: string;
    vendorNames: string[];
    estimatedWaste: number;
    recommendation: string;
    evidence?: string[];
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
    evidence?: string[];
  }>;
};

export type AiEmailGoal = "cancel" | "renegotiate" | "reduce_seats";

export type AiTextMetadata = {
  mode?: string;
  vendorId?: string;
  vendorName?: string;
  generatedAt?: string;
  savedReportId?: string;
};

export type ApiContactRequest = {
  _id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  source: "contact" | "custom_plan" | "upgrade_request";
  requestedPlan?: "starter" | "standard" | "custom" | "";
  status: "new" | "reviewed" | "closed";
  createdAt: string;
  updatedAt: string;
};

export type ApiReport = {
  _id: string;
  title: string;
  type: "monthly_waste" | "renewal_risk" | "unused_seats" | "custom";
  summary?: Partial<AuditSummary>;
  findings?: Array<Record<string, unknown>>;
  content?: string;
  status: "draft" | "ready" | "archived";
  createdAt: string;
  updatedAt: string;
};
