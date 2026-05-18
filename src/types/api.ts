export type ApiUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  company: string;
  emailVerifiedAt?: string;
  storeIpAddresses?: boolean;
  mfaEnabled?: boolean;
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
  stripeSubscriptionId?: string;
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
  onboarding?: ApiOnboardingState;
};

export type AuthResponse = {
  token?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaSessionToken?: string;
  message?: string;
  user: ApiUser;
  company: ApiCompany;
};

export type PlanLimitType = "vendors" | "reports" | "aiEmails" | "vendorAnalyses" | "trial";

export type PlanLimitErrorPayload = {
  error: "plan_limit_reached";
  limitType: PlanLimitType;
  currentUsage: number;
  planLimit: number;
  upgradeToUnlock: ApiCompany["plan"] | "starter" | "standard" | "custom";
  message: string;
  requestId?: string;
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

export type ApiSession = {
  id: string;
  device: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type SavingsType = "cancelled" | "renegotiated" | "seat_reduced" | "other";
export type SavingsSignalType = "zombie" | "unused_seats" | "duplicate_tool" | "negotiated_rate";
export type SavingsStatus = "identified" | "in_progress" | "realized" | "dismissed";

export type ApiSavingsEntry = {
  id: string;
  actionItemId?: string;
  vendorId?: string;
  vendorName: string;
  signalType: SavingsSignalType;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  expectedMonthlySavings?: number;
  expectedAnnualSavings?: number;
  realizedMonthlySavings?: number;
  realizedAnnualSavings?: number;
  currency: string;
  status: SavingsStatus;
  evidence?: Array<{ type: string; value: string }>;
  notes?: string;
  dismissalReason?: string;
  realizedAt?: string;
  createdBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: ApiUser["role"];
  };
  confirmedBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: ApiUser["role"];
  };
  nextReviewDate?: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;

  // Backward-compatible aliases.
  savingsType: SavingsType | SavingsSignalType;
  monthlySavings: number;
  annualSavings: number;
  confirmedAt: string;
};

export type ActivityEntityType = "vendor" | "report" | "email_draft" | "savings" | "team" | "settings" | "action_item";

export type ApiActivityLog = {
  _id: string;
  companyId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: ActivityEntityType;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type ApiOnboardingState = {
  addedFirstVendor: boolean;
  importedCsv: boolean;
  reviewedWaste: boolean;
  generatedReport: boolean;
  createdEmailDraft: boolean;
  invitedTeammate: boolean;
  dismissed?: boolean;
};

export type SavingsSummary = {
  totalEstimatedAnnualSavings: number;
  totalExpectedAnnualSavings: number;
  totalRealizedAnnualSavings: number;
  savingsRealizationRate: number;
  AutoAuditROI: number;
  identifiedCount: number;
  inProgressCount: number;
  realizedCount: number;
  dismissedCount: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  confirmedActionsCount: number;
  breakdown: Record<string, { monthlySavings: number; annualSavings: number; count: number }>;
};

export type ActionItemStatus = "open" | "in_progress" | "done";
export type ActionItemPriority = "low" | "medium" | "high";
export type ActionItemApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export type ApiActionItem = {
  id: string;
  companyId: string;
  vendorId?: string;
  vendorName: string;
  title: string;
  detail?: string;
  signalType?: string;
  impact: number;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  assignedTo?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: ApiUser["role"];
    avatarUrl?: string;
  };
  dueDate?: string;
  approvalStatus: ActionItemApprovalStatus;
  approvedBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: ApiUser["role"];
  };
  approvedAt?: string;
  rejectionReason?: string;
  comments?: Array<{
    _id?: string;
    author?: {
      _id?: string;
      id?: string;
      name?: string;
      email?: string;
      role?: ApiUser["role"];
      avatarUrl?: string;
    };
    text: string;
    createdAt: string;
  }>;
  estimatedSavings: number;
  confirmedSavings?: number;
  createdBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: ApiUser["role"];
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  source: "manual" | "csv" | "email" | "sso" | "bank_feed" | "sample";
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
export type ReportType = "cfo_summary" | "board_summary" | "owner_action_list" | "full_audit";

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
  reportType?: ReportType;
  summary?: Partial<AuditSummary>;
  findings?: Array<Record<string, unknown>>;
  content?: string;
  status: "draft" | "ready" | "archived";
  createdAt: string;
  updatedAt: string;
};
