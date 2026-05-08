import { apiClient } from "./client";
import type { ApiRenewal, ApiVendor, AuditSummary, AuthResponse, CreateVendorInput, PaginationMeta } from "../types/api";

export const authApi = {
  async signup(input: { name: string; email: string; password: string; companyName: string; companyDomain?: string }) {
    const { data } = await apiClient.post<AuthResponse>("/api/auth/signup", input);
    return data;
  },

  async login(input: { email: string; password: string }) {
    const { data } = await apiClient.post<AuthResponse>("/api/auth/login", input);
    return data;
  },

  async me() {
    const { data } = await apiClient.get<Pick<AuthResponse, "user" | "company">>("/api/profile/me");
    return data;
  },
};

export const profileApi = {
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

export const vendorApi = {
  async list(params: { page?: number; limit?: number; search?: string; status?: string; category?: string } = {}) {
    const { data } = await apiClient.get<{ vendors: ApiVendor[]; pagination: PaginationMeta }>("/api/vendors", { params });
    return data;
  },

  async create(input: CreateVendorInput) {
    const { data } = await apiClient.post<{ vendor: ApiVendor }>("/api/vendors", input);
    return data.vendor;
  },

  async update(id: string, input: Partial<CreateVendorInput>) {
    const { data } = await apiClient.patch<{ vendor: ApiVendor }>(`/api/vendors/${id}`, input);
    return data.vendor;
  },

  async remove(id: string) {
    await apiClient.delete(`/api/vendors/${id}`);
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
