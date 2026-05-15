import { apiClient } from "./client";
import type { ActivityEntityType, ApiActivityLog, ApiContactRequest, ApiOnboardingState, ApiRenewal, ApiReport, ApiSavingsEntry, ApiTeamInvite, ApiTeamMember, ApiUser, ApiVendor, AuditSummary, AuthResponse, AvatarAccess, AvatarStyle, CreateVendorInput, PaginationMeta, SavingsSummary, SavingsType, TeamRole } from "../types/api";

export const authApi = {
  async signup(input: { name: string; email: string; password: string; companyName: string; companyDomain?: string; plan?: string }) {
    const { data } = await apiClient.post<AuthResponse>("/api/auth/signup", input);
    return data;
  },

  async login(input: { email: string; password: string }) {
    const { data } = await apiClient.post<AuthResponse>("/api/auth/login", input);
    return data;
  },

  async forgotPassword(input: { email: string }) {
    const { data } = await apiClient.post<{ message: string }>("/api/auth/forgot-password", input);
    return data;
  },

  async resetPassword(input: { token: string; password: string }) {
    const { data } = await apiClient.post<{ message: string }>("/api/auth/reset-password", input);
    return data;
  },

  async verifyEmail(input: { token: string }) {
    const { data } = await apiClient.post<{ message: string }>("/api/auth/verify-email", input);
    return data;
  },

  async requestEmailVerification(input: { email: string }) {
    const { data } = await apiClient.post<{ message: string }>("/api/auth/request-email-verification", input);
    return data;
  },

  async me() {
    const { data } = await apiClient.get<Pick<AuthResponse, "user" | "company">>("/api/profile/me");
    return data;
  },
};

export const profileApi = {
  async avatarAccess() {
    const { data } = await apiClient.get<{ avatar: AvatarAccess }>("/api/profile/avatar-access");
    return data.avatar;
  },

  async uploadAvatar(imageData: string) {
    const { data } = await apiClient.post<{ user: ApiUser }>("/api/profile/avatar-upload", { imageData });
    return data.user;
  },

  async removeAvatar() {
    const { data } = await apiClient.delete<{ user: ApiUser }>("/api/profile/avatar");
    return data.user;
  },

  async generateAvatar(style: AvatarStyle) {
    const { data } = await apiClient.post<{ generatedUrl: string; avatar: AvatarAccess }>("/api/profile/avatar-generate", { style });
    return data;
  },

  async saveGeneratedAvatar(avatarUrl: string) {
    const { data } = await apiClient.post<{ user: ApiUser }>("/api/profile/avatar-save", { avatarUrl });
    return data.user;
  },

  async updateCompanySettings(input: {
    requireCfoApprovalAbove: number;
    weeklyRenewalDigest: boolean;
    autoDraftCancellationEmails: boolean;
    allowManagedRenegotiation: boolean;
  }) {
    const { data } = await apiClient.patch<Pick<AuthResponse, "company">>("/api/profile/company-settings", input);
    return data.company;
  },
};

export const teamApi = {
  async members() {
    const { data } = await apiClient.get<{ members: ApiTeamMember[] }>("/api/team/members");
    return data.members;
  },

  async invites() {
    const { data } = await apiClient.get<{ invites: ApiTeamInvite[] }>("/api/team/invites");
    return data.invites;
  },

  async invite(input: { email: string; role: TeamRole }) {
    const { data } = await apiClient.post<{ invite: ApiTeamInvite }>("/api/team/invite", input);
    return data.invite;
  },

  async acceptInvite(token: string) {
    const { data } = await apiClient.get<{ member: ApiTeamMember; invite: ApiTeamInvite }>(`/api/team/invite/${encodeURIComponent(token)}`);
    return data;
  },

  async updateRole(userId: string, role: TeamRole) {
    const { data } = await apiClient.patch<{ member: ApiTeamMember }>(`/api/team/members/${userId}/role`, { role });
    return data.member;
  },

  async removeMember(userId: string) {
    await apiClient.delete(`/api/team/members/${userId}`);
  },

  async cancelInvite(inviteId: string) {
    await apiClient.delete(`/api/team/invite/${inviteId}`);
  },
};

export const savingsApi = {
  async list() {
    const { data } = await apiClient.get<{ entries: ApiSavingsEntry[] }>("/api/savings");
    return data.entries;
  },

  async summary() {
    const { data } = await apiClient.get<{ summary: SavingsSummary }>("/api/savings/summary");
    return data.summary;
  },

  async create(input: { vendorId?: string; vendorName: string; savingsType: SavingsType; monthlySavings: number; notes?: string }) {
    const { data } = await apiClient.post<{ entry: ApiSavingsEntry }>("/api/savings", input);
    return data.entry;
  },

  async remove(id: string) {
    await apiClient.delete(`/api/savings/${id}`);
  },
};

export const vendorApi = {
  async list(params: { page?: number; limit?: number; search?: string; status?: string; category?: string } = {}) {
    const { data } = await apiClient.get<{ vendors: ApiVendor[]; pagination: PaginationMeta }>("/api/vendors", { params });
    return data;
  },

  async create(input: CreateVendorInput) {
    const { data } = await apiClient.post<{ vendor: ApiVendor }>("/api/vendors", input);
    return data.vendor;
  },

  async import(vendors: CreateVendorInput[]) {
    const { data } = await apiClient.post<{ vendors: ApiVendor[]; count: number }>("/api/vendors/import", { vendors });
    return data;
  },

  async update(id: string, input: Partial<CreateVendorInput>) {
    const { data } = await apiClient.patch<{ vendor: ApiVendor }>(`/api/vendors/${id}`, input);
    return data.vendor;
  },

  async remove(id: string) {
    await apiClient.delete(`/api/vendors/${id}`);
  },
};

export const activityApi = {
  async list(params: { page?: number; limit?: number; entityType?: ActivityEntityType | "all" } = {}) {
    const { data } = await apiClient.get<{ activity: ApiActivityLog[]; pagination: PaginationMeta }>("/api/activity", { params });
    return data;
  },
};

export const onboardingApi = {
  async get() {
    const { data } = await apiClient.get<{ onboarding: ApiOnboardingState }>("/api/onboarding");
    return data.onboarding;
  },

  async dismiss() {
    const { data } = await apiClient.patch<{ onboarding: ApiOnboardingState }>("/api/onboarding/dismiss");
    return data.onboarding;
  },
};

export const auditApi = {
  async summary() {
    const { data } = await apiClient.get<{ summary: AuditSummary }>("/api/audit/summary");
    return data.summary;
  },
};

export const renewalApi = {
  async list(params: { page?: number; limit?: number; status?: string; riskLevel?: string } = {}) {
    const { data } = await apiClient.get<{ renewals: ApiRenewal[]; pagination: PaginationMeta }>("/api/renewals", { params });
    return data;
  },
};

export const aiApi = {
  async cancelEmail(input: { vendorId?: string; vendorName?: string; tone?: string; requestedAction?: string }) {
    const { data } = await apiClient.post<{ draft: string }>("/api/ai/cancel-email", input);
    return data.draft;
  },

  async renegotiateEmail(input: { vendorId?: string; vendorName?: string; renewalId?: string; tone?: string; negotiationGoal?: string }) {
    const { data } = await apiClient.post<{ draft: string }>("/api/ai/renegotiate-email", input);
    return data.draft;
  },

  async monthlyReport(input: { periodStart?: string; periodEnd?: string; audience?: string } = {}) {
    const { data } = await apiClient.post<{ report: string; savedReportId?: string; summary: AuditSummary }>("/api/ai/monthly-report", input);
    return data;
  },

  async vendorAnalysis(input: { vendorId?: string; vendorName?: string; mode?: "duplicate_tools" | "waste_explanation" }) {
    const { data } = await apiClient.post<{ analysis: string }>("/api/ai/vendor-analysis", input);
    return data.analysis;
  },
};

export const contactApi = {
  async create(input: { name: string; email: string; company?: string; message: string }) {
    const { data } = await apiClient.post<{ message: string; request: { id: string; status: string } }>("/api/contact", input);
    return data;
  },

  async requestUpgrade(requestedPlan: "starter" | "standard" | "custom") {
    const { data } = await apiClient.post<{ message: string; request: { id: string; status: string; requestedPlan: string } }>("/api/contact/upgrade", { requestedPlan });
    return data;
  },

  async list(params: { page?: number; limit?: number } = {}) {
    const { data } = await apiClient.get<{ contactRequests: ApiContactRequest[]; pagination: PaginationMeta }>("/api/contact", { params });
    return data;
  },

  async updateStatus(id: string, status: ApiContactRequest["status"]) {
    const { data } = await apiClient.patch<{ contactRequest: ApiContactRequest }>(`/api/contact/${id}`, { status });
    return data.contactRequest;
  },
};

export const reportApi = {
  async list(params: { page?: number; limit?: number } = {}) {
    const { data } = await apiClient.get<{ reports: ApiReport[]; pagination: PaginationMeta }>("/api/reports", { params });
    return data;
  },
};

export const billingApi = {
  async createCheckoutSession(input: { plan: "starter" | "standard" }) {
    const { data } = await apiClient.post<{ url: string }>("/api/billing/checkout", input);
    return data;
  },
};

export const analyticsApi = {
  async track(eventName: string, metadata: Record<string, unknown> = {}) {
    try {
      await apiClient.post("/api/analytics", {
        eventName,
        metadata,
        path: window.location.pathname,
      });
    } catch {
      // Analytics should never block the core product flow.
    }
  },
};
