import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertOctagon,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  Bot,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Edit3,
  FileText,
  Filter,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent, ReactNode } from "react";
import { actionItemApi, activityApi, aiApi, analyticsApi, auditApi, authApi, billingApi, contactApi, notificationApi, onboardingApi, profileApi, renewalApi, reportApi, savingsApi, teamApi, vendorApi, workspaceApi } from "../api/services";
import { getApiErrorMessage, resolveApiAssetUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageMeta } from "../components/PageMeta";
import { PlanLimitModal } from "../components/PlanLimitModal";
import { PublicFooter } from "../components/PublicFooter";
import { useTheme } from "../theme/ThemeContext";
import { usePlanLimit } from "../hooks/usePlanLimit";
import type { ActionItemStatus, ActivityEntityType, AiEmailGoal, AiEmailVerifiedOverrides, ApiActionItem, ApiActivityLog, ApiCompany, ApiContactRequest, ApiOnboardingState, ApiRenewal, ApiReport, ApiSavingsEntry, ApiSession, ApiTeamInvite, ApiTeamMember, ApiUrgentRenewalNotification, ApiUser, ApiVendor, AuditSummary, CreateVendorInput, PaginationMeta, ReportType, SavingsSignalType, SavingsSummary, SavingsType, TeamRole } from "../types/api";

type PageId = "overview" | "vendors" | "waste" | "renewals" | "reports" | "savings" | "activity" | "email" | "team" | "billing" | "settings";
type RiskLevel = "critical" | "high" | "medium" | "low";
type VendorStatus = "Healthy" | "Zombie" | "Duplicate" | "Renewal risk" | "Unused seats";
type VendorQueryState = {
  page: number;
  limit: number;
  search: string;
  status: string;
  category: string;
};

type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

type DashboardTotals = {
  monthlySpend: number;
  estimatedSavings: number;
  zombieCount: number;
  activeVendors: number;
  vendorCount: number;
  unusedSeatCount: number;
  renewalRisk: number;
  monthlyWaste: number;
};

type Vendor = {
  id: string;
  name: string;
  category: string;
  owner: string;
  spend: number;
  seats: number;
  activeSeats: number;
  lastUsed: string;
  renewal: string;
  status: VendorStatus;
  risk: RiskLevel;
  savings: number;
};

type RenewalRow = {
  id: string;
  vendor: string;
  date: string;
  renewalDate?: string;
  owner: string;
  amount: number;
  risk: RiskLevel;
  status?: ApiRenewal["status"];
  reviewedAt?: string;
};

type UnusedSeatRow = {
  tool: string;
  owner: string;
  unused: number;
  cost: number;
  action: string;
};

type DuplicateToolRow = {
  group: string;
  tools: string;
  owner: string;
  waste: number;
  recommendation: string;
};

type WasteSignal = {
  vendorId?: string;
  title: string;
  vendor: string;
  impact: number;
  confidence: number;
  detail: string;
  evidence: string[];
  type: "Zombie app" | "Unused seats" | "Duplicate tool" | "Renewal";
};

type PlanLimitSet = {
  vendors: number | null;
  reports: number | null;
  aiEmails: number | null;
  vendorAnalyses: number | null;
};

type PlanUsage = {
  vendors: number;
  reports: number;
  aiEmails: number;
  vendorAnalyses: number;
};

type PlanUsageWarning = {
  type: keyof PlanUsage;
  label: string;
  used: number;
  limit: number;
  nextPlan: ApiCompany["plan"];
  multiplier: number;
};

type OnboardingItem = {
  label: string;
  done: boolean;
  page: PageId;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "vendors", label: "Vendors", icon: Inbox },
  { id: "waste", label: "Waste Detection", icon: AlertTriangle },
  { id: "renewals", label: "Renewals", icon: CalendarClock },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "savings", label: "Savings", icon: CircleDollarSign },
  { id: "activity", label: "Activity", icon: ListChecks },
  { id: "email", label: "AI Email Generator", icon: Mail },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Plan", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

const spendTrend = [
  { month: "Nov", spend: 84200, waste: 6800, savings: 9100 },
  { month: "Dec", spend: 89100, waste: 9100, savings: 11300 },
  { month: "Jan", spend: 92700, waste: 12800, savings: 16100 },
  { month: "Feb", spend: 98600, waste: 15400, savings: 21300 },
  { month: "Mar", spend: 103900, waste: 18100, savings: 29400 },
  { month: "Apr", spend: 108200, waste: 21300, savings: 38200 },
  { month: "May", spend: 112400, waste: 24700, savings: 48320 },
];

const categorySpend = [
  { name: "Sales", value: 31200, color: "#38bdf8" },
  { name: "Ops", value: 22600, color: "#7dd3fc" },
  { name: "Product", value: 18400, color: "#f59e0b" },
  { name: "Marketing", value: 15600, color: "#ef4444" },
  { name: "People", value: 9400, color: "#10b981" },
];

const renewalChart = [
  { window: "0-15d", amount: 17600 },
  { window: "16-30d", amount: 31900 },
  { window: "31-45d", amount: 20400 },
  { window: "46-60d", amount: 28600 },
  { window: "61-90d", amount: 13200 },
];

const reports = [
  { name: "May SaaS Waste Report", owner: "Finance", status: "Ready", savings: 48320, date: "May 07, 2026" },
  { name: "Renewal Risk Brief", owner: "Ops", status: "Scheduled", savings: 31900, date: "May 15, 2026" },
  { name: "Unused Seat Audit", owner: "IT", status: "Draft", savings: 20520, date: "May 21, 2026" },
];

type ReportCard = {
  id?: string;
  name: string;
  owner: string;
  status: string;
  reportType?: ReportType;
  savings: number;
  date: string;
  content?: string;
};

const integrations = [
  { name: "CSV import", status: "Available", detail: "Manual vendor and spend uploads are ready now." },
  { name: "Google Workspace", status: "Coming soon", detail: "Future account, app usage, and renewal-notice discovery." },
  { name: "Microsoft 365", status: "Coming soon", detail: "Future workspace and user activity signals." },
  { name: "QuickBooks", status: "Coming soon", detail: "Future accounting-side SaaS spend checks." },
  { name: "Stripe", status: "Available", detail: "Hosted checkout, subscription activation, and billing portal." },
  { name: "Okta", status: "Coming soon", detail: "Future login activity and seat usage signals." },
  { name: "Slack alerts", status: "Coming soon", detail: "Future renewal and owner follow-up notifications." },
];

const planLimitSets = {
  free: { vendors: 10, reports: 1, aiEmails: 3, vendorAnalyses: 3 },
  starter: { vendors: 50, reports: 5, aiEmails: 20, vendorAnalyses: 15 },
  standard: { vendors: 200, reports: 25, aiEmails: 100, vendorAnalyses: 50 },
  growth: { vendors: 500, reports: 75, aiEmails: 300, vendorAnalyses: 150 },
  enterprise: { vendors: null, reports: null, aiEmails: null, vendorAnalyses: null },
  custom: { vendors: null, reports: null, aiEmails: null, vendorAnalyses: null },
} satisfies Record<ApiCompany["plan"], PlanLimitSet>;

const demoVendors: CreateVendorInput[] = [
  { name: "Slack", category: "Collaboration", ownerName: "Ops", monthlySpend: 890, seatsPurchased: 80, activeSeats: 52, lastUsedAt: daysAgoIso(5), renewalDate: daysFromNowIso(24), notes: "Demo vendor with unused seats." },
  { name: "Notion", category: "Knowledge", ownerName: "Product", monthlySpend: 420, seatsPurchased: 45, activeSeats: 31, lastUsedAt: daysAgoIso(12), renewalDate: daysFromNowIso(61), notes: "Demo workspace documentation tool." },
  { name: "Clearbit", category: "Sales", ownerName: "Revenue", monthlySpend: 1200, seatsPurchased: 12, activeSeats: 0, lastUsedAt: daysAgoIso(124), renewalDate: daysFromNowIso(18), notes: "Demo zombie subscription candidate." },
  { name: "Zoom", category: "Communication", ownerName: "People", monthlySpend: 650, seatsPurchased: 70, activeSeats: 69, lastUsedAt: daysAgoIso(1), renewalDate: daysFromNowIso(95), notes: "Demo healthy vendor." },
  { name: "Asana", category: "Project Management", ownerName: "Ops", monthlySpend: 510, seatsPurchased: 40, activeSeats: 17, lastUsedAt: daysAgoIso(36), renewalDate: daysFromNowIso(43), notes: "Demo unused-seat signal." },
  { name: "Monday.com", category: "Project Management", ownerName: "Ops", monthlySpend: 380, seatsPurchased: 25, activeSeats: 8, lastUsedAt: daysAgoIso(52), renewalDate: daysFromNowIso(44), notes: "Demo duplicate-tool signal." },
];

const emailGoalOptions: Array<{ value: AiEmailGoal; label: string; actionLabel: string }> = [
  { value: "cancel", label: "Cancel subscription", actionLabel: "cancel renewal" },
  { value: "renegotiate", label: "Renegotiate contract", actionLabel: "reduce renewal cost" },
  { value: "reduce_seats", label: "Reduce seat count", actionLabel: "right-size seat count" },
];

const reportTypeOptions: Array<{ value: ReportType; label: string; detail: string }> = [
  { value: "cfo_summary", label: "CFO Summary", detail: "Savings opportunity, ROI, and recommended actions." },
  { value: "board_summary", label: "Board Summary", detail: "High-level spend overview and risk areas." },
  { value: "owner_action_list", label: "Owner Action List", detail: "Per-vendor actions grouped by owner." },
  { value: "full_audit", label: "Full Audit", detail: "Complete vendor breakdown with evidence." },
];

const vendorStatusFilters = ["All", "Healthy", "Zombie", "Duplicate", "Renewal risk", "Unused seats"];
const defaultVendorQuery: VendorQueryState = {
  page: 1,
  limit: 10,
  search: "",
  status: "All",
  category: "All",
};

const defaultDraft = `Hi Clearbit team,

We are reviewing our SaaS stack and found no meaningful Clearbit usage in the last quarter.

Please cancel renewal for the current contract and confirm the final service date. If there is a lower-commitment option, please send pricing for 5 active seats.

Thank you,
Finance Team`;

export function DashboardPage() {
  const { user, company, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const sectionParam = params.section as PageId | undefined;
  const [activePage, setActivePage] = useState<PageId>(isPageId(sectionParam) ? sectionParam : "overview");
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);
  const [emailTone, setEmailTone] = useState("Direct");
  const [emailVendorName, setEmailVendorName] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorQuery, setVendorQuery] = useState<VendorQueryState>(defaultVendorQuery);
  const [toast, setToast] = useState("");
  const [apiVendors, setApiVendors] = useState<ApiVendor[]>([]);
  const [apiRenewals, setApiRenewals] = useState<ApiRenewal[]>([]);
  const [urgentRenewals, setUrgentRenewals] = useState<ApiUrgentRenewalNotification[]>([]);
  const [showUrgentRenewalsOnly, setShowUrgentRenewalsOnly] = useState(false);
  const [apiReports, setApiReports] = useState<ApiReport[]>([]);
  const [savingsEntries, setSavingsEntries] = useState<ApiSavingsEntry[]>([]);
  const [savingsSummary, setSavingsSummary] = useState<SavingsSummary | null>(null);
  const [actionItems, setActionItems] = useState<ApiActionItem[]>([]);
  const [activityEntries, setActivityEntries] = useState<ApiActivityLog[]>([]);
  const [activityPagination, setActivityPagination] = useState<PaginationMeta | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityEntityType | "all">("all");
  const [onboarding, setOnboarding] = useState<ApiOnboardingState | null>(null);
  const [teamMemberCount, setTeamMemberCount] = useState(1);
  const [teamMembers, setTeamMembers] = useState<ApiTeamMember[]>([]);
  const [vendorPagination, setVendorPagination] = useState<PaginationMeta | null>(null);
  const [vendorCategoryOptions, setVendorCategoryOptions] = useState<string[]>(["All"]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [isDataLoading, setDataLoading] = useState(true);
  const [isVendorLoading, setVendorLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [monthlyReportDraft, setMonthlyReportDraft] = useState("");
  const [isReportGenerating, setReportGenerating] = useState(false);
  const [wasteAnalysis, setWasteAnalysis] = useState("");
  const [isWasteAnalyzing, setWasteAnalyzing] = useState(false);
  const [isLoadingDemo, setLoadingDemo] = useState(false);
  const [isSampleBannerDismissed, setSampleBannerDismissed] = useState(false);
  const [isPlanWarningDismissed, setPlanWarningDismissed] = useState(false);
  const [isClearingSampleData, setClearingSampleData] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const { closePlanLimitModal, planLimitError } = usePlanLimit();

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? "Overview";
  const isTrialExpired = company ? getTrialState(company).isExpired : false;
  const canManageTeam = user?.role === "owner" || user?.role === "admin";

  const dashboardVendors = useMemo(() => apiVendors.map(mapApiVendorToDashboardVendor), [apiVendors]);
  const hasSampleVendors = useMemo(() => apiVendors.some((vendor) => vendor.source === "sample"), [apiVendors]);
  const sampleBannerKey = company?._id ? `autoaudit.sampleDataBannerDismissed.${company._id}` : "";
  const renewalRows = useMemo(() => buildRenewalRows({ renewals: apiRenewals, auditSummary }), [apiRenewals, auditSummary]);
  const unusedSeatRows = useMemo(() => buildUnusedSeatRows(auditSummary), [auditSummary]);
  const duplicateToolRows = useMemo(() => buildDuplicateToolRows(auditSummary), [auditSummary]);
  const dashboardWasteSignals = useMemo(() => buildWasteSignals(auditSummary), [auditSummary]);
  const dashboardCategorySpend = useMemo(() => buildCategorySpend(apiVendors), [apiVendors]);
  const dashboardRenewalChart = useMemo(() => buildRenewalChart(renewalRows), [renewalRows]);
  const onboardingItems = useMemo<OnboardingItem[]>(() => {
    return [
      { label: "Add first vendor", done: Boolean(onboarding?.addedFirstVendor), page: "vendors" },
      { label: "Import CSV", done: Boolean(onboarding?.importedCsv), page: "vendors" },
      { label: "Review waste", done: Boolean(onboarding?.reviewedWaste), page: "waste" },
      { label: "Generate report", done: Boolean(onboarding?.generatedReport), page: "reports" },
      { label: "Create email draft", done: Boolean(onboarding?.createdEmailDraft), page: "email" },
      { label: "Invite teammate", done: Boolean(onboarding?.invitedTeammate), page: "team" },
    ];
  }, [onboarding]);

  const totals = useMemo(() => {
    return {
      monthlySpend: auditSummary?.monthlySpend ?? dashboardVendors.reduce((sum, vendor) => sum + vendor.spend, 0),
      estimatedSavings: auditSummary?.estimatedAnnualSavings ?? 0,
      zombieCount: auditSummary?.zombieSubscriptionCount ?? dashboardVendors.filter((vendor) => vendor.status === "Zombie").length,
      activeVendors: auditSummary?.activeVendors ?? dashboardVendors.filter((vendor) => vendor.status !== "Zombie").length,
      vendorCount: auditSummary?.vendorCount ?? dashboardVendors.length,
      unusedSeatCount: auditSummary?.unusedSeatCount ?? dashboardVendors.reduce((sum, vendor) => sum + Math.max(vendor.seats - vendor.activeSeats, 0), 0),
      renewalRisk: renewalRows.reduce((sum, renewal) => sum + renewal.amount, 0),
      monthlyWaste: auditSummary?.monthlyWasteFound ?? 0,
    };
  }, [auditSummary, dashboardVendors, renewalRows]);
  const planWarning = useMemo(() => buildPlanUsageWarning(company, getPlanUsage(company, totals.vendorCount)), [company, totals.vendorCount]);
  const planWarningKey = company?._id && planWarning ? `autoaudit.planWarningDismissed.${company._id}.${planWarning.type}` : "";

  const loadVendorDirectory = async (query: VendorQueryState) => {
    setVendorLoading(true);
    setDataError("");

    const response = await vendorApi.list({
      page: query.page,
      limit: query.limit,
      search: query.search.trim() || undefined,
      status: mapVendorStatusFilterToApi(query.status),
      category: query.category === "All" ? undefined : query.category,
    });

    setApiVendors(response.vendors);
    setVendorPagination(response.pagination);

    if (response.pagination.totalPages < query.page) {
      setVendorQuery((current) => ({ ...current, page: response.pagination.totalPages }));
    }

    setVendorLoading(false);
    return response;
  };
  useEffect(() => {
    if (sectionParam && isPageId(sectionParam)) {
      setActivePage(sectionParam);
    }
  }, [sectionParam]);

  useEffect(() => {
    if (activePage === "team" && user && !canManageTeam) {
      handleNav("overview");
    }
  }, [activePage, canManageTeam, user]);

  async function refreshDashboardData() {
    setDataLoading(true);
    setVendorLoading(true);
    setDataError("");

    try {
      const [vendorsResponse, summaryResponse, renewalsResponse, reportsResponse, savingsEntriesResponse, savingsSummaryResponse, actionItemsResponse, activityResponse, onboardingResponse, teamMembersResponse] = await Promise.all([
        vendorApi.list({
          page: vendorQuery.page,
          limit: vendorQuery.limit,
          search: vendorQuery.search.trim() || undefined,
          status: mapVendorStatusFilterToApi(vendorQuery.status),
          category: vendorQuery.category === "All" ? undefined : vendorQuery.category,
        }),
        auditApi.summary(),
        renewalApi.list({ limit: 100 }),
        reportApi.list({ limit: 20 }),
        savingsApi.list(),
        savingsApi.summary(),
        actionItemApi.list({ status: "all" }),
        activityApi.list({ limit: 50, entityType: activityFilter }),
        onboardingApi.get(),
        canManageTeam ? teamApi.members() : Promise.resolve(user ? [{ id: user.id ?? String(user._id ?? ""), name: user.name, email: user.email, role: user.role }] as ApiTeamMember[] : []),
      ]);

      setApiVendors(vendorsResponse.vendors);
      setVendorPagination(vendorsResponse.pagination);
      setVendorCategoryOptions(buildVendorCategoryOptions(vendorsResponse.vendors, vendorQuery.category));
      setAuditSummary(summaryResponse);
      setApiRenewals(renewalsResponse.renewals);
      setApiReports(reportsResponse.reports);
      setSavingsEntries(savingsEntriesResponse);
      setSavingsSummary(savingsSummaryResponse);
      setActionItems(actionItemsResponse);
      setActivityEntries(activityResponse.activity);
      setActivityPagination(activityResponse.pagination);
      setOnboarding(onboardingResponse);
      setTeamMemberCount(teamMembersResponse.length || 1);
      setTeamMembers(teamMembersResponse);
    } catch (error) {
      setDataError(getApiErrorMessage(error));
    } finally {
      setDataLoading(false);
      setVendorLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboardData();
  }, []);

  useEffect(() => {
    setSampleBannerDismissed(Boolean(sampleBannerKey && window.localStorage.getItem(sampleBannerKey) === "true"));
  }, [sampleBannerKey]);

  useEffect(() => {
    setPlanWarningDismissed(Boolean(planWarningKey && window.localStorage.getItem(planWarningKey) === "true"));
  }, [planWarningKey]);

  useEffect(() => {
    refreshActivityData(activityFilter).catch((error) => setDataError(getApiErrorMessage(error)));
  }, [activityFilter]);

  useEffect(() => {
    let isCurrent = true;
    refreshUrgentRenewals().catch(() => undefined);
    const interval = window.setInterval(() => {
      if (!isCurrent) return;
      refreshUrgentRenewals().catch(() => undefined);
    }, 5 * 60 * 1000);

    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activePage !== "waste" || dashboardWasteSignals.length === 0 || onboarding?.reviewedWaste) return;

    onboardingApi.complete("reviewedWaste")
      .then(setOnboarding)
      .catch((error) => setDataError(getApiErrorMessage(error)));
  }, [activePage, dashboardWasteSignals.length, onboarding?.reviewedWaste]);

  useEffect(() => {
    let isCurrent = true;

    async function refreshVendors() {
      try {
        const response = await loadVendorDirectory(vendorQuery);
        if (isCurrent) {
          setVendorCategoryOptions((current) => mergeVendorCategoryOptions(current, response.vendors, vendorQuery.category));
        }
      } catch (error) {
        if (isCurrent) {
          setDataError(getApiErrorMessage(error));
          setVendorLoading(false);
        }
      }
    }

    refreshVendors();

    return () => {
      isCurrent = false;
    };
  }, [vendorQuery]);

  const showToast = (message: string) => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  const handleNav = (page: PageId) => {
    setActivePage(page);
    setMobileNavOpen(false);
    navigate(page === "overview" ? "/dashboard" : `/dashboard/${page}`);
  };

  const handleGlobalSearch = (value: string) => {
    setVendorSearch(value);
    setVendorQuery((current) => ({ ...current, search: value, page: 1 }));
    if (value.trim() && activePage !== "vendors") {
      handleNav("vendors");
    }
  };

  const handleVendorQueryChange = (update: Partial<VendorQueryState>) => {
    setVendorQuery((current) => {
      const next = { ...current, ...update, page: update.page ?? 1 };
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
    if (update.search !== undefined) {
      setVendorSearch(update.search);
    }
  };

  const handleCreateVendor = async (input: CreateVendorInput) => {
    if (isTrialExpired) {
      throw new Error("Trial ended. Choose a plan before adding more vendors.");
    }

    try {
      const vendor = await vendorApi.create(input);
      setApiVendors((current) => [vendor, ...current]);
      await Promise.all([refreshDashboardData(), refreshActivityData(), refreshOnboardingData()]);
      showToast(`${vendor.name} added.`);
    } catch (error) {
      throw new Error(withUpgradePrompt(getApiErrorMessage(error)));
    }
  };

  const handleImportVendors = async (inputs: CreateVendorInput[]) => {
    if (isTrialExpired) {
      return { created: 0, failed: inputs.length, errors: ["Trial ended. Choose a plan before importing vendors."] };
    }

    try {
      const result = await vendorApi.import(inputs);
      await Promise.all([refreshDashboardData(), refreshActivityData(), refreshOnboardingData()]);

      return {
        created: result.count,
        failed: 0,
        errors: [],
      };
    } catch (error) {
      return { created: 0, failed: inputs.length, errors: [withUpgradePrompt(getApiErrorMessage(error))] };
    }
  };

  const handleLoadDemoData = async () => {
    if (isTrialExpired) {
      showToast("Trial ended. Choose a plan before loading sample data.");
      return;
    }

    if (dashboardVendors.length > 0) {
      showToast("Demo data is best for an empty workspace.");
      return;
    }

    setLoadingDemo(true);

    try {
      const results = await Promise.allSettled(demoVendors.map((input) => vendorApi.create(input)));
      await Promise.all([refreshDashboardData(), refreshActivityData(), refreshOnboardingData()]);
      const created = results.filter((result) => result.status === "fulfilled").length;
      const firstError = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      analyticsApi.track("sample_data_loaded", { created });
      showToast(firstError ? withUpgradePrompt(getApiErrorMessage(firstError.reason)) : `${created} sample vendors loaded.`);
    } finally {
      setLoadingDemo(false);
    }
  };

  const dismissSampleBanner = () => {
    if (sampleBannerKey) {
      window.localStorage.setItem(sampleBannerKey, "true");
    }
    setSampleBannerDismissed(true);
  };

  const dismissPlanWarning = () => {
    if (planWarningKey) {
      window.localStorage.setItem(planWarningKey, "true");
    }
    setPlanWarningDismissed(true);
  };

  const handleClearSampleData = async () => {
    setClearingSampleData(true);

    try {
      const result = await vendorApi.clearSampleData();
      await Promise.all([refreshDashboardData(), refreshActivityData()]);
      showToast(result.deletedCount > 0 ? `${result.deletedCount} sample vendors cleared.` : "No sample vendors to clear.");
    } catch (error) {
      showToast(getApiErrorMessage(error));
    } finally {
      setClearingSampleData(false);
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    await vendorApi.remove(vendor.id);
    setApiVendors((current) => current.filter((item) => item._id !== vendor.id));
    await refreshDashboardData();
    showToast(`${vendor.name} deleted.`);
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;

    try {
      const response = await authApi.requestEmailVerification({ email: user.email });
      showToast(response.message);
    } catch (error) {
      showToast(getApiErrorMessage(error));
    }
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      showToast("Email draft copied.");
    } catch {
      showToast("Select the draft text to copy it.");
    }
  };

  const handleGenerateMonthlyReport = async (reportType: ReportType = "cfo_summary") => {
    if (isTrialExpired) {
      showToast("Trial ended. Choose a plan before generating reports.");
      return;
    }

    setReportGenerating(true);

    try {
      const { report } = await aiApi.monthlyReport({ audience: reportAudienceForType(reportType), reportType });
      setMonthlyReportDraft(report);
      await Promise.all([refreshDashboardData(), refreshActivityData(), refreshOnboardingData()]);
      showToast("AI CFO report generated.");
    } catch (error) {
      showToast(getAiUnavailableMessage(error));
    } finally {
      setReportGenerating(false);
    }
  };

  const handleSuggestDuplicateTools = async () => {
    if (isTrialExpired) {
      showToast("Trial ended. Choose a plan before running AI analysis.");
      return;
    }

    setWasteAnalyzing(true);

    try {
      const analysis = await aiApi.vendorAnalysis({ mode: "duplicate_tools" });
      setWasteAnalysis(analysis);
      showToast("AI duplicate-tool suggestions generated.");
    } catch (error) {
      showToast(getAiUnavailableMessage(error));
    } finally {
      setWasteAnalyzing(false);
    }
  };

  const handleExplainWaste = async (signal: WasteSignal) => {
    if (isTrialExpired) {
      showToast("Trial ended. Choose a plan before running AI analysis.");
      return;
    }

    setWasteAnalyzing(true);

    try {
      const analysis = await aiApi.vendorAnalysis({ vendorId: signal.vendorId, vendorName: signal.vendor, mode: "waste_explanation" });
      setWasteAnalysis(analysis);
      await refreshOnboardingData();
      showToast(`${signal.vendor} waste explanation generated.`);
    } catch (error) {
      showToast(getAiUnavailableMessage(error));
    } finally {
      setWasteAnalyzing(false);
    }
  };

  const refreshSavingsData = async () => {
    const [entries, summary] = await Promise.all([savingsApi.list(), savingsApi.summary()]);
    setSavingsEntries(entries);
    setSavingsSummary(summary);
    return { entries, summary };
  };

  const refreshActionItems = async () => {
    const actions = await actionItemApi.list({ status: "all" });
    setActionItems(actions);
    return actions;
  };

  const refreshActivityData = async (entityType: ActivityEntityType | "all" = activityFilter, page = 1) => {
    const response = await activityApi.list({ limit: 50, page, entityType });
    setActivityEntries(response.activity);
    setActivityPagination(response.pagination);
    return response;
  };

  const refreshOnboardingData = async () => {
    const nextOnboarding = await onboardingApi.get();
    setOnboarding(nextOnboarding);
    return nextOnboarding;
  };

  const refreshUrgentRenewals = async () => {
    const renewals = await notificationApi.urgentRenewals();
    setUrgentRenewals(renewals);
    return renewals;
  };

  const handleConfirmSaving = async (input: { signal: WasteSignal; savingsType: SavingsType; monthlySavings: number; notes?: string }) => {
    const entry = await savingsApi.create({
      vendorId: input.signal.vendorId,
      vendorName: input.signal.vendor,
      signalType: mapWasteSignalToSavingsSignal(input.signal),
      savingsType: input.savingsType,
      estimatedMonthlySavings: Math.round(input.signal.impact / 12),
      realizedMonthlySavings: input.monthlySavings,
      status: "realized",
      evidence: input.signal.evidence.map((value) => ({ type: "waste_signal", value })),
      notes: input.notes,
    });
    setSavingsEntries((current) => [entry, ...current]);
    await Promise.all([refreshSavingsData(), refreshActivityData()]);
    showToast("Saving confirmed.");
  };

  const handleCreateActionItem = async (signal: WasteSignal) => {
    const action = await actionItemApi.create({
      vendorId: signal.vendorId,
      vendorName: signal.vendor,
      title: signal.title,
      detail: signal.detail,
      signalType: signal.type,
      impact: signal.impact,
      priority: signal.impact >= 10000 ? "high" : signal.impact >= 3000 ? "medium" : "low",
      estimatedSavings: signal.impact,
    });
    setActionItems((current) => [action, ...current]);
    await refreshActivityData();
    showToast("Action item created.");
  };

  const handleUpdateActionItemStatus = async (actionId: string, status: ActionItemStatus) => {
    const updated = await actionItemApi.updateStatus(actionId, status);
    setActionItems((current) => current.map((action) => (action.id === actionId ? updated : action)));
    await refreshActivityData();
    showToast("Action item updated.");
  };

  const updateActionItemInState = (updated: ApiActionItem) => {
    setActionItems((current) => current.map((action) => (action.id === updated.id ? updated : action)));
  };

  const handleAssignActionItem = async (actionId: string, input: { assignedTo?: string; dueDate?: string }) => {
    const updated = await actionItemApi.assign(actionId, input);
    updateActionItemInState(updated);
    await refreshActivityData();
    showToast("Action assignment updated.");
  };

  const handleApproveActionItem = async (actionId: string) => {
    const updated = await actionItemApi.approve(actionId);
    updateActionItemInState(updated);
    await refreshActivityData();
    showToast("Action approved.");
  };

  const handleRejectActionItem = async (actionId: string, rejectionReason: string) => {
    const updated = await actionItemApi.reject(actionId, rejectionReason);
    updateActionItemInState(updated);
    await refreshActivityData();
    showToast("Action rejected.");
  };

  const handleCommentActionItem = async (actionId: string, text: string) => {
    const updated = await actionItemApi.comment(actionId, text);
    updateActionItemInState(updated);
    await refreshActivityData();
    showToast("Comment added.");
  };

  const handleCompleteActionItem = async (actionId: string, confirmedSavings?: number) => {
    const updated = await actionItemApi.complete(actionId, confirmedSavings);
    updateActionItemInState(updated);
    await refreshActivityData();
    showToast("Action completed.");
  };

  const handleRealizeSaving = async (entry: ApiSavingsEntry, realizedMonthlySavings: number) => {
    await savingsApi.realize(entry.id, { realizedMonthlySavings });
    await refreshSavingsData();
    await refreshActivityData();
    showToast("Realized savings confirmed.");
  };

  const handleDismissSaving = async (entry: ApiSavingsEntry, reason: string) => {
    await savingsApi.dismiss(entry.id, reason);
    await refreshSavingsData();
    await refreshActivityData();
    showToast("Savings opportunity dismissed.");
  };

  const handleDeleteActionItem = async (actionId: string) => {
    await actionItemApi.remove(actionId);
    setActionItems((current) => current.filter((action) => action.id !== actionId));
    await refreshActivityData();
    showToast("Action item removed.");
  };

  const handleWorkspaceDeleted = () => {
    logout();
    navigate("/", { replace: true });
  };

  const openUrgentRenewals = () => {
    setShowUrgentRenewalsOnly(true);
    handleNav("renewals");
  };

  const handleMarkRenewalReviewed = async (renewalId: string) => {
    const updated = await renewalApi.markReviewed(renewalId);
    setApiRenewals((current) => current.map((renewal) => (renewal._id === renewalId ? updated : renewal)));
    await Promise.all([refreshUrgentRenewals(), refreshActivityData()]);
    showToast("Renewal marked reviewed.");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <PageMeta title="Dashboard - AutoAudit.ai" description="Signed-in AutoAudit.ai SaaS waste control dashboard." canonicalPath="/dashboard" noindex />
      <div className={`${isSidebarCollapsed ? "lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[244px_minmax(0,1fr)]"} lg:grid transition-[grid-template-columns] duration-300`}>
        <Sidebar activePage={activePage} canManageTeam={canManageTeam} isCollapsed={isSidebarCollapsed} isOpen={isMobileNavOpen} onClose={() => setMobileNavOpen(false)} onNavigate={handleNav} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} />

        <div className="min-w-0">
          <Topbar
            checklistItems={onboardingItems}
            companyName={company?.name ?? "Workspace"}
            pageTitle={pageTitle}
            searchValue={vendorSearch}
            userAvatarUrl={user?.avatarUrl}
            userEmail={user?.email}
            userName={user?.name ?? "User"}
            onGlobalSearch={handleGlobalSearch}
            onLogout={logout}
            onMenu={() => setMobileNavOpen(true)}
            onNavigate={handleNav}
            onOpenUrgentRenewals={openUrgentRenewals}
            onRefresh={refreshDashboardData}
            urgentRenewals={urgentRenewals}
          />

          <main className="mx-auto max-w-[1480px] overflow-x-hidden px-3 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0 animate-[fadeIn_420ms_ease-out]">
              {dataError && <ErrorState message={dataError} onRetry={refreshDashboardData} />}
              {planWarning && !isPlanWarningDismissed && <PlanUsageWarningBanner warning={planWarning} onDismiss={dismissPlanWarning} onNavigate={handleNav} />}
              {isDataLoading && <LoadingState label="Loading live audit data" />}
              {hasSampleVendors && !isSampleBannerDismissed && (
                <SampleDataBanner onDismiss={dismissSampleBanner} onNavigate={handleNav} />
              )}
              {activePage === "overview" && <OverviewPage apiVendors={apiVendors} categoryData={dashboardCategorySpend} duplicateTools={duplicateToolRows} renewalRows={renewalRows} reports={apiReports} savingsEntries={savingsEntries} teamMemberCount={teamMemberCount} totals={totals} unusedSeats={unusedSeatRows} urgentRenewals={urgentRenewals} wasteSignals={dashboardWasteSignals} company={company} onboarding={onboarding} onDismissOnboarding={async () => { const next = await onboardingApi.dismiss(); setOnboarding(next); }} onNavigate={handleNav} onOpenUrgentRenewals={openUrgentRenewals} onToast={showToast} />}
              {activePage === "vendors" && <VendorsPage activityEntries={activityEntries} apiVendors={apiVendors} categoryOptions={vendorCategoryOptions} isClearingSampleData={isClearingSampleData} isLoading={isDataLoading || isVendorLoading} isLoadingDemo={isLoadingDemo} pagination={vendorPagination} query={vendorQuery} savingsEntries={savingsEntries} vendors={dashboardVendors} wasteSignals={dashboardWasteSignals} onClearSampleData={handleClearSampleData} onCreateVendor={handleCreateVendor} onDeleteVendor={handleDeleteVendor} onEmailShortcut={(vendorName) => { setEmailVendorName(vendorName); handleNav("email"); }} onImportVendors={handleImportVendors} onLoadDemoData={handleLoadDemoData} onQueryChange={handleVendorQueryChange} onToast={showToast} onUpdateVendor={async (id, input) => { const vendor = await vendorApi.update(id, input); setApiVendors((current) => current.map((item) => item._id === id ? vendor : item)); await refreshDashboardData(); showToast(`${vendor.name} updated.`); }} />}
              {activePage === "waste" && (
                <WasteDetectionPage
                  aiAnalysis={wasteAnalysis}
                  duplicateTools={duplicateToolRows}
                  hasVendors={dashboardVendors.length > 0}
                  isLoadingDemo={isLoadingDemo}
                  isAnalyzing={isWasteAnalyzing}
                  actionItems={actionItems}
                  currentUser={user}
                  unusedSeats={unusedSeatRows}
                  wasteSignals={dashboardWasteSignals}
                  onExplainWaste={handleExplainWaste}
                  onCreateActionItem={handleCreateActionItem}
                  onUpdateActionItemStatus={handleUpdateActionItemStatus}
                  onDeleteActionItem={handleDeleteActionItem}
                  onAssignActionItem={handleAssignActionItem}
                  onApproveActionItem={handleApproveActionItem}
                  onRejectActionItem={handleRejectActionItem}
                  onCommentActionItem={handleCommentActionItem}
                  onCompleteActionItem={handleCompleteActionItem}
                  onConfirmSaving={handleConfirmSaving}
                  onLoadDemoData={handleLoadDemoData}
                  onNavigate={handleNav}
                  onRunDetection={handleSuggestDuplicateTools}
                  onToast={showToast}
                  teamMembers={teamMembers}
                />
              )}
              {activePage === "renewals" && <RenewalsPage hasVendors={dashboardVendors.length > 0} isLoadingDemo={isLoadingDemo} renewalChartData={dashboardRenewalChart} renewalRows={renewalRows} showUrgentOnly={showUrgentRenewalsOnly} onClearUrgentFilter={() => setShowUrgentRenewalsOnly(false)} onLoadDemoData={handleLoadDemoData} onMarkReviewed={handleMarkRenewalReviewed} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "reports" && <ReportsPage hasVendors={dashboardVendors.length > 0} isGenerating={isReportGenerating} isLoadingDemo={isLoadingDemo} reports={apiReports} reportDraft={monthlyReportDraft} trialExpired={isTrialExpired} onGenerateReport={handleGenerateMonthlyReport} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "savings" && <SavingsPage entries={savingsEntries} summary={savingsSummary} currentUser={user} onDelete={async (entry) => { await savingsApi.remove(entry.id); await refreshSavingsData(); showToast("Savings entry removed."); }} onDismiss={handleDismissSaving} onRealize={handleRealizeSaving} />}
              {activePage === "activity" && <ActivityPage activity={activityEntries} filter={activityFilter} pagination={activityPagination} onFilterChange={setActivityFilter} onPageChange={(page) => refreshActivityData(activityFilter, page)} />}
              {activePage === "email" && (
                <EmailGeneratorPage
                  apiVendors={apiVendors}
                  vendors={dashboardVendors}
                  initialVendorName={emailVendorName}
                  draft={draft}
                  emailTone={emailTone}
                  isLoadingDemo={isLoadingDemo}
                  onCopyDraft={copyDraft}
                  onDraftChange={setDraft}
                  onGenerate={async (vendorName, tone, goal, verifiedData) => {
                    if (isTrialExpired) {
                      throw new Error("Trial ended. Choose a plan before generating AI emails.");
                    }

                    const apiVendor = apiVendors.find((vendor) => vendor.name === vendorName);
                    const goalConfig = emailGoalOptions.find((item) => item.value === goal) ?? emailGoalOptions[0];
                    const generatedDraft =
                      goal === "cancel"
                        ? await aiApi.cancelEmail({ vendorId: apiVendor?._id, vendorName, tone: tone.toLowerCase(), requestedAction: goalConfig.actionLabel, verifiedData })
                        : await aiApi.renegotiateEmail({ vendorId: apiVendor?._id, vendorName, tone: tone.toLowerCase(), negotiationGoal: goalConfig.actionLabel, verifiedData });
                    setDraft(generatedDraft);
                    await Promise.all([refreshActivityData(), refreshOnboardingData()]);
                    showToast("AI draft refreshed with company context.");
                  }}
                  onLoadDemoData={handleLoadDemoData}
                  onNavigate={handleNav}
                  onSaveCorrections={async (vendorId, input) => {
                    const vendor = await vendorApi.update(vendorId, input);
                    setApiVendors((current) => current.map((item) => (item._id === vendorId ? vendor : item)));
                    await refreshDashboardData();
                    showToast(`${vendor.name} corrections saved.`);
                  }}
                  onToneChange={setEmailTone}
                />
              )}
              {activePage === "billing" && <PlanPage company={company} vendorCount={totals.vendorCount} onToast={showToast} />}
              {activePage === "team" && canManageTeam && <TeamPage currentUser={user} onActivityRefresh={async () => { await Promise.all([refreshActivityData(), refreshOnboardingData(), refreshDashboardData()]); }} onToast={showToast} />}
              {activePage === "settings" && <SettingsPage company={company} companySettings={company?.settings} user={user} vendors={apiVendors} onToast={showToast} onUserUpdate={updateUser} onWorkspaceDeleted={handleWorkspaceDeleted} />}
              <div className="mt-6 grid gap-4">
                {user && !user.emailVerifiedAt && <EmailVerificationBanner email={user.email} onResend={handleResendVerification} />}
                {company && <TrialStatusBanner company={company} isLoadingDemo={isLoadingDemo} vendorCount={totals.vendorCount} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} />}
              </div>
              <div className="mt-8 overflow-hidden rounded-lg border border-line shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
                <PublicFooter />
              </div>
            </div>
          </main>
        </div>
      </div>

      <Toast message={toast} />
      <PlanLimitModal error={planLimitError} onDismiss={closePlanLimitModal} />
    </div>
  );
}

function SampleDataBanner({ onDismiss, onNavigate }: { onDismiss: () => void; onNavigate: (page: PageId) => void }) {
  return (
    <div className="mb-4 rounded-lg border border-warning/20 bg-warning-soft p-4 text-warning shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <strong className="block text-sm font-extrabold">This is sample data.</strong>
          <p className="mt-1 text-sm font-bold leading-6">Import your own vendors to start your real audit.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => onNavigate("vendors")}>
            Import vendors
          </button>
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-warning/30 bg-panel px-4 text-sm font-extrabold text-warning transition hover:-translate-y-0.5" type="button" onClick={onDismiss}>
            Got it, I'll import mine
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanUsageWarningBanner({ warning, onDismiss, onNavigate }: { warning: PlanUsageWarning; onDismiss: () => void; onNavigate: (page: PageId) => void }) {
  const moreCapacity = warning.multiplier > 1 ? `${warning.multiplier}x more capacity` : "more capacity";

  return (
    <div className="mb-4 rounded-lg border border-warning/25 bg-warning-soft p-4 text-warning shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <strong className="block text-sm font-extrabold">
            You're using {warning.used} of {warning.limit} {warning.label}.
          </strong>
          <p className="mt-1 text-sm font-bold leading-6">
            Upgrade to {formatPlanLabel(warning.nextPlan)} for {moreCapacity}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => onNavigate("billing")}>
            Review plans
          </button>
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-warning/25 bg-panel px-4 text-sm font-extrabold text-warning transition hover:-translate-y-0.5" type="button" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function UrgentRenewalBanner({ renewals, onReview }: { renewals: ApiUrgentRenewalNotification[]; onReview: () => void }) {
  const total = renewals.reduce((sum, renewal) => sum + Number(renewal.contractValue ?? 0), 0);

  return (
    <div className="rounded-lg border border-risk/30 bg-risk-soft p-4 text-risk shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <strong className="block text-sm font-extrabold">
            You have {renewals.length} vendor renewal{renewals.length === 1 ? "" : "s"} in the next 7 days totaling {currency(total)}.
          </strong>
          <p className="mt-1 text-sm font-bold leading-6">Review now before the notice window closes.</p>
        </div>
        <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-risk px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5" type="button" onClick={onReview}>
          Review now
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  activePage,
  canManageTeam,
  isCollapsed,
  isOpen,
  onClose,
  onNavigate,
  onToggleCollapse,
}: {
  activePage: PageId;
  canManageTeam: boolean;
  isCollapsed: boolean;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onToggleCollapse: () => void;
}) {
  const visibleNavItems = canManageTeam ? navItems : navItems.filter((item) => item.id !== "team");

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-inverse/35 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col border-r border-line/60 bg-panel/86 shadow-2xl backdrop-blur-2xl transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${isCollapsed ? "lg:w-[84px]" : "lg:w-[244px]"} ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className={`flex px-4 py-4 ${isCollapsed ? "flex-col items-center gap-3 lg:py-5" : "items-center justify-between"}`}>
          <button className={`flex min-w-0 items-center gap-3 text-left ${isCollapsed ? "lg:justify-center" : ""}`} type="button" onClick={() => onNavigate("overview")} title="AutoAudit.ai">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand shadow-sm ring-1 ring-brand/15">
              <ShieldCheck aria-hidden="true" size={23} strokeWidth={2.2} />
            </span>
            <span className={`min-w-0 transition ${isCollapsed ? "lg:hidden" : "lg:block"}`}>
              <strong className="block text-[15px] font-extrabold">AutoAudit.ai</strong>
              <span className="mt-0.5 block text-xs font-semibold text-quiet">SaaS waste control</span>
            </span>
          </button>
          <button className="grid size-9 place-items-center rounded-lg text-quiet hover:bg-panel-muted lg:hidden" type="button" onClick={onClose} aria-label="Close navigation">
            <X aria-hidden="true" size={19} />
          </button>
          <button className="hidden size-9 place-items-center rounded-lg text-quiet transition hover:bg-panel-muted hover:text-ink lg:grid" type="button" onClick={onToggleCollapse} aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"} title={isCollapsed ? "Expand navigation" : "Collapse navigation"}>
            <Menu aria-hidden="true" size={18} />
          </button>
        </div>

        <nav className="grid gap-1 px-3" aria-label="Dashboard pages">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activePage;

            return (
              <button
                className={`group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition duration-200 ${isCollapsed ? "lg:justify-center lg:px-0" : ""} ${isActive ? "bg-brand/14 text-brand-strong ring-1 ring-brand/20" : "text-quiet hover:bg-panel-muted/70 hover:text-ink"
                  }`}
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <Icon aria-hidden="true" size={18} />
                <span className={`flex-1 ${isCollapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                {isActive && <ChevronRight className={isCollapsed ? "hidden" : ""} aria-hidden="true" size={16} />}
                {isCollapsed && <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-bold text-ink opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3 p-4">
          <div className={`rounded-lg border border-line/60 bg-panel-subtle/78 p-4 ${isCollapsed ? "hidden" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-quiet">Audit coverage</span>
              <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-extrabold text-brand-strong">82%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-panel-muted">
              <div className="h-2 w-[82%] rounded-full bg-brand" />
            </div>
            <p className="mt-3 text-sm leading-6 text-quiet">CSV imports are ready. Gmail, Ramp, and Okta are planned integrations.</p>
          </div>

          <button className={`flex min-h-10 items-center justify-center gap-2 rounded-lg bg-inverse px-4 text-sm font-extrabold text-inverse-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg active:translate-y-0 ${isCollapsed ? "lg:px-0" : ""}`} type="button" onClick={() => onNavigate("waste")} title="Run new audit">
            <Zap aria-hidden="true" size={17} />
            <span className={isCollapsed ? "lg:hidden" : ""}>Run new audit</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  checklistItems,
  companyName,
  pageTitle,
  searchValue,
  userAvatarUrl,
  userEmail,
  userName,
  onGlobalSearch,
  onLogout,
  onMenu,
  onNavigate,
  onOpenUrgentRenewals,
  onRefresh,
  urgentRenewals,
}: {
  checklistItems: OnboardingItem[];
  companyName: string;
  pageTitle: string;
  searchValue: string;
  userAvatarUrl?: string;
  userEmail?: string;
  userName: string;
  onGlobalSearch: (value: string) => void;
  onLogout: () => void;
  onMenu: () => void;
  onNavigate: (page: PageId) => void;
  onOpenUrgentRenewals: () => void;
  onRefresh: () => void;
  urgentRenewals: ApiUrgentRenewalNotification[];
}) {
  const { theme, toggleTheme } = useTheme();
  const [isChecklistOpen, setChecklistOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const initialsLabel = initials(userName || companyName);
  const resolvedUserAvatarUrl = userAvatarUrl ? resolveApiAssetUrl(userAvatarUrl) : getGravatarUrl(userEmail);
  const hasOpenItems = checklistItems.some((item) => !item.done);

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/82 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-[1480px] gap-3 px-3 py-3 sm:px-6 lg:flex lg:items-center lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
        <button className="grid size-10 place-items-center rounded-lg border border-line/70 bg-panel/78 text-quiet lg:hidden" type="button" onClick={onMenu} aria-label="Open navigation">
          <Menu aria-hidden="true" size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-quiet">{companyName}</p>
          <h1 className="truncate text-xl font-extrabold tracking-normal sm:text-2xl">{pageTitle}</h1>
        </div>
        </div>

        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-line/70 bg-panel/78 px-3 py-2 text-sm text-quiet shadow-sm lg:ml-auto lg:w-[280px]">
          <Search aria-hidden="true" size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-quiet"
            value={searchValue}
            placeholder="Search vendors, owners, categories"
            onChange={(event) => onGlobalSearch(event.target.value)}
          />
        </label>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
        <div className="relative shrink-0">
          <button
            className="relative grid size-10 place-items-center rounded-lg border border-line/70 bg-panel/78 text-quiet transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand"
            type="button"
            aria-label="Open onboarding checklist"
            title="Onboarding checklist"
            onClick={() => setChecklistOpen((current) => !current)}
          >
            <ListChecks aria-hidden="true" size={18} />
            {hasOpenItems && <span className="absolute right-2 top-2 size-2 rounded-full bg-risk" />}
          </button>
          {isChecklistOpen && (
            <div className="absolute right-0 top-12 z-50 w-[280px] rounded-lg border border-line/70 bg-panel/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong className="text-sm font-extrabold">Quick setup</strong>
                <span className="text-xs font-bold text-quiet">{checklistItems.filter((item) => item.done).length}/{checklistItems.length}</span>
              </div>
              <div className="grid gap-2">
                {checklistItems.map((item) => (
                  <button
                    className="flex items-center justify-between gap-3 rounded-md bg-panel-subtle px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-panel-muted"
                    type="button"
                    key={item.label}
                    onClick={() => {
                      onNavigate(item.page);
                      setChecklistOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className={`grid size-5 place-items-center rounded-full text-[10px] font-extrabold ${item.done ? "bg-good-soft text-good" : "bg-risk-soft text-risk"}`}>
                      {item.done ? "✓" : "!"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line/70 bg-panel/78 px-3 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand" type="button" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" size={17} />
          Sync
        </button>

        <button
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-line/70 bg-panel/78 text-quiet transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand"
          type="button"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
        </button>

        <div className="relative shrink-0">
          <button className="relative grid size-10 place-items-center rounded-lg border border-line/70 bg-panel/78 text-quiet transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand" type="button" aria-label="Open renewal alerts" onClick={() => setNotificationOpen((current) => !current)}>
            <Bell aria-hidden="true" size={18} />
            {urgentRenewals.length > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-risk px-1 text-[10px] font-extrabold text-white">{urgentRenewals.length}</span>}
          </button>
          {isNotificationOpen && (
            <div className="absolute right-0 top-12 z-50 w-[340px] rounded-lg border border-line/70 bg-panel/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong className="text-sm font-extrabold">Urgent renewals</strong>
                <span className="text-xs font-bold text-risk">{urgentRenewals.length} due soon</span>
              </div>
              <div className="grid max-h-[360px] gap-2 overflow-auto">
                {urgentRenewals.length === 0 && <p className="rounded-lg bg-panel-subtle p-3 text-sm font-bold text-quiet">No renewals due in the next 7 days.</p>}
                {urgentRenewals.map((renewal) => (
                  <button
                    className="rounded-lg border border-risk/20 bg-risk-soft p-3 text-left transition hover:-translate-y-0.5"
                    key={renewal.id}
                    type="button"
                    onClick={() => {
                      setNotificationOpen(false);
                      onOpenUrgentRenewals();
                    }}
                  >
                    <strong className="block text-sm font-extrabold text-risk">{renewal.vendorName}</strong>
                    <span className="mt-1 block text-xs font-bold text-risk">Renews {formatShortDate(renewal.renewalDate)} · {currency(renewal.contractValue)}</span>
                    <span className="mt-2 inline-flex text-xs font-extrabold text-risk">Review now</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="flex shrink-0 items-center gap-2 rounded-lg border border-line/70 bg-panel/78 p-1.5 pr-3 transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted" type="button" onClick={() => onNavigate("settings")}>
          <span className="grid size-8 overflow-hidden rounded-md bg-brand-soft text-xs font-extrabold text-brand-strong">
            {resolvedUserAvatarUrl ? <img className="size-full object-cover" src={resolvedUserAvatarUrl} alt="" /> : <span className="grid size-full place-items-center">{initialsLabel}</span>}
          </span>
          <span className="hidden text-sm font-extrabold sm:block">{companyName}</span>
        </button>

        <button
          className="group hidden min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line/70 bg-panel/78 px-3 text-sm font-extrabold text-quiet shadow-sm transition hover:-translate-y-0.5 hover:border-risk/60 hover:bg-risk-soft hover:text-risk hover:shadow-md active:translate-y-0 sm:inline-flex"
          type="button"
          onClick={onLogout}
        >
          <LogOut aria-hidden="true" size={17} className="transition group-hover:-translate-x-0.5" />
          Logout
        </button>
        </div>
      </div>
    </header>
  );
}

function OverviewPage({
  apiVendors,
  company,
  categoryData,
  duplicateTools,
  renewalRows,
  reports,
  savingsEntries,
  teamMemberCount,
  totals,
  unusedSeats,
  urgentRenewals,
  wasteSignals,
  onboarding,
  onDismissOnboarding,
  onNavigate,
  onOpenUrgentRenewals,
  onToast,
}: {
  apiVendors: ApiVendor[];
  company: ApiCompany | null;
  categoryData: typeof categorySpend;
  duplicateTools: DuplicateToolRow[];
  renewalRows: RenewalRow[];
  reports: ApiReport[];
  savingsEntries: ApiSavingsEntry[];
  teamMemberCount: number;
  totals: DashboardTotals;
  unusedSeats: UnusedSeatRow[];
  urgentRenewals: ApiUrgentRenewalNotification[];
  wasteSignals: WasteSignal[];
  onboarding: ApiOnboardingState | null;
  onDismissOnboarding: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onOpenUrgentRenewals: () => void;
  onToast: (message: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-5 overflow-hidden">
      {urgentRenewals.length > 0 && <UrgentRenewalBanner renewals={urgentRenewals} onReview={onOpenUrgentRenewals} />}
      <HeroBand totals={totals} wasteSignals={wasteSignals} onNavigate={onNavigate} />
      <SummaryGrid totals={totals} />
      <OnboardingChecklist apiVendors={apiVendors} company={company} onboarding={onboarding} reports={reports} savingsEntries={savingsEntries} teamMemberCount={teamMemberCount} totals={totals} wasteSignals={wasteSignals} onDismiss={onDismissOnboarding} onNavigate={onNavigate} onToast={onToast} />

      <OverviewActionCenter duplicateTools={duplicateTools} renewalRows={renewalRows} unusedSeats={unusedSeats} wasteSignals={wasteSignals} onNavigate={onNavigate} onToast={onToast} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]">
        <Panel title="Spend, waste, and savings" eyebrow="Decision trend" action={<PanelAction label="Open reports" onClick={() => onNavigate("reports")} />}>
          <div className="h-[280px] min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 320 }}>
              <AreaChart data={spendTrend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="wasteFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(var(--color-line) / 0.42)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "rgb(var(--color-quiet))", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: "rgb(var(--color-quiet))", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="#38bdf8" strokeWidth={2.5} fill="url(#spendFill)" />
                <Area type="monotone" dataKey="waste" name="Waste found" stroke="#ef4444" strokeWidth={2.5} fill="url(#wasteFill)" />
                <Line type="monotone" dataKey="savings" name="Savings captured" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Spend by function" eyebrow="Category map" action={<PanelAction label="Review vendors" onClick={() => onNavigate("vendors")} />}>
          <div className="h-[280px] min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 320 }}>
              <PieChart>
                <Pie data={categoryData} innerRadius={70} outerRadius={108} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <UnusedSeatsTable rows={unusedSeats} />
        <DuplicateToolsPanel rows={duplicateTools} />
      </div>

      <OverviewSystemStatus company={company} totals={totals} onNavigate={onNavigate} />
    </div>
  );
}

function OnboardingChecklist({
  apiVendors,
  company,
  onboarding,
  reports,
  savingsEntries,
  teamMemberCount,
  totals,
  wasteSignals,
  onDismiss,
  onNavigate,
  onToast,
}: {
  apiVendors: ApiVendor[];
  company: ApiCompany | null;
  onboarding: ApiOnboardingState | null;
  reports: ApiReport[];
  savingsEntries: ApiSavingsEntry[];
  teamMemberCount: number;
  totals: DashboardTotals;
  wasteSignals: WasteSignal[];
  onDismiss: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [isCollapsed, setCollapsed] = useState(false);
  if (!onboarding || onboarding.dismissed) return null;

  const hasCsvVendor = apiVendors.some((vendor) => vendor.source === "csv");
  const steps: Array<{ label: string; done: boolean; page: PageId; action: string }> = [
    { label: "Add your first vendor", done: apiVendors.length > 0, page: "vendors", action: "Add vendor" },
    { label: "Import your vendor list (CSV)", done: hasCsvVendor, page: "vendors", action: "Import CSV" },
    { label: "Review your first waste signal", done: wasteSignals.length > 0 && Boolean(onboarding.reviewedWaste), page: "waste", action: "Review waste" },
    { label: "Generate your first report", done: reports.length > 0, page: "reports", action: "Generate report" },
    { label: "Draft a vendor email", done: Boolean(onboarding.createdEmailDraft), page: "email", action: "Draft email" },
    { label: "Confirm your first saving", done: savingsEntries.length > 0, page: "savings", action: "Confirm savings" },
    { label: "Invite a teammate", done: teamMemberCount > 1, page: "team", action: "Invite teammate" },
  ];
  const completed = steps.filter((step) => step.done).length;
  const isComplete = completed === steps.length;
  const nextStep = steps.find((step) => !step.done);
  const progress = Math.round((completed / steps.length) * 100);
  const paidPlanStarted = company?.plan !== "free";

  const handleDismiss = async () => {
    try {
      await onDismiss();
      onToast("Onboarding checklist hidden.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    }
  };

  return (
    <Panel title={isComplete ? "Workspace setup complete" : "Start your SaaS audit"} eyebrow={`${completed} of ${steps.length} steps completed`} action={
      <div className="flex gap-2">
        <IconButton label={isCollapsed ? "Expand checklist" : "Collapse checklist"} onClick={() => setCollapsed((current) => !current)}>
          <ChevronRight aria-hidden="true" className={`transition ${isCollapsed ? "" : "rotate-90"}`} size={18} />
        </IconButton>
        <SecondaryButton onClick={handleDismiss}>{isComplete ? "Dismiss" : "Hide"}</SecondaryButton>
      </div>
    }>
      <div className="grid gap-4">
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-panel-muted">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm font-extrabold text-ink">
            Based on your current data, AutoAudit has found {currency(totals.estimatedSavings)} in potential annual savings.
          </p>
        </div>

        {!isCollapsed && (
          <>
            {nextStep && (
              <div className="rounded-lg border border-brand/25 bg-brand-soft p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-brand-strong">Next step</p>
                    <strong className="mt-1 block text-base font-extrabold">{nextStep.label}</strong>
                  </div>
                  <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => onNavigate(nextStep.page)}>
                    {nextStep.action}
                  </button>
                </div>
              </div>
            )}

            {isComplete && (
              <p className="rounded-lg border border-good/20 bg-good-soft px-4 py-3 text-sm font-extrabold text-good">
                Your core audit workflow is set up. You can hide this checklist when you are ready.
              </p>
            )}

            <div className="grid gap-2">
              {steps.map((step, index) => (
                <button className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 ${step.done ? "border-line bg-panel-subtle text-quiet" : step === nextStep ? "border-brand/40 bg-panel text-ink" : "border-line bg-panel-subtle text-ink"}`} key={step.label} type="button" onClick={() => onNavigate(step.page)}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${step.done ? "bg-good-soft text-good" : "bg-panel-muted text-quiet"}`}>
                    {step.done ? <CheckCircle2 aria-hidden="true" size={18} /> : <span className="text-sm font-extrabold">{index + 1}</span>}
                  </span>
                  <span className={`text-sm font-extrabold ${step.done ? "line-through decoration-2" : ""}`}>{step.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm font-extrabold">Bonus: Start your paid plan</strong>
                <span className="text-xs font-bold text-quiet">{paidPlanStarted ? "Paid plan active" : "Unlock paid limits when the audit becomes part of your finance rhythm."}</span>
              </div>
              {paidPlanStarted ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-good-soft px-3 text-sm font-extrabold text-good"><CheckCircle2 aria-hidden="true" size={16} /> Done</span>
              ) : (
                <button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-panel px-3 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" type="button" onClick={() => onNavigate("billing")}>
                  View plans
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

function OverviewActionCenter({
  duplicateTools,
  renewalRows,
  unusedSeats,
  wasteSignals,
  onNavigate,
  onToast,
}: {
  duplicateTools: DuplicateToolRow[];
  renewalRows: RenewalRow[];
  unusedSeats: UnusedSeatRow[];
  wasteSignals: WasteSignal[];
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<"actions" | "alerts" | "renewals" | "duplicates">("actions");
  const topSignals = wasteSignals.slice(0, 3);
  const urgentRenewals = renewalRows.filter((row) => row.risk === "critical" || row.risk === "high").slice(0, 3);
  const urgentUnusedSeats = unusedSeats.slice(0, 2);

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <Panel title="Action center" eyebrow="Highest leverage work" action={<PanelAction label="Open waste detection" onClick={() => onNavigate("waste")} />}>
        <div className="grid gap-2">
          <DisclosureRow
            count={topSignals.length}
            icon={Sparkles}
            isOpen={expandedSection === "actions"}
            title="Recommended actions"
            tone="brand"
            onToggle={() => setExpandedSection(expandedSection === "actions" ? "alerts" : "actions")}
          >
            {topSignals.length === 0 ? (
              <EmptyState title="No recommendations yet" detail="Load or import vendors to generate prioritized savings actions." />
            ) : (
              <div className="grid gap-3">
                {topSignals.map((signal) => (
                  <article className="min-w-0 rounded-lg border border-line/50 bg-panel-subtle/72 p-4" key={signal.title}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-quiet">{signal.type} - {signal.confidence}% confidence</span>
                        <strong className="mt-1 block break-words text-base font-extrabold">{signal.title}</strong>
                        <p className="mt-1 text-sm leading-6 text-quiet">{signal.vendor}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-good-soft px-3 py-1.5 text-sm font-extrabold text-good">{currency(signal.impact)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </DisclosureRow>

          <DisclosureRow count={urgentUnusedSeats.length} icon={AlertTriangle} isOpen={expandedSection === "alerts"} title="Urgent alerts" tone="risk" onToggle={() => setExpandedSection(expandedSection === "alerts" ? "actions" : "alerts")}>
            <div className="grid gap-3">
              {urgentUnusedSeats.length === 0 ? (
                <EmptyState title="No urgent seat alerts" detail="Seat leakage will appear here when paid seats are inactive." />
              ) : (
                urgentUnusedSeats.map((row) => (
                  <article className="min-w-0 rounded-lg border border-line/50 bg-panel-subtle/72 p-4" key={row.tool}>
                    <strong className="block break-words text-sm font-extrabold">{row.tool}</strong>
                    <p className="mt-1 text-sm leading-6 text-quiet">{row.unused} unused seats owned by {row.owner}. {row.action}</p>
                  </article>
                ))
              )}
            </div>
          </DisclosureRow>

          <DisclosureRow count={urgentRenewals.length} icon={CalendarClock} isOpen={expandedSection === "renewals"} title="Renewals" tone="warning" onToggle={() => setExpandedSection(expandedSection === "renewals" ? "actions" : "renewals")}>
            <div className="grid gap-3">
              {urgentRenewals.length === 0 ? (
                <EmptyState title="No high-risk renewals" detail="Upcoming contract risk appears once renewal dates and contract values are available." />
              ) : (
                urgentRenewals.map((row) => (
                  <article className="min-w-0 rounded-lg border border-line/50 bg-panel-subtle/72 p-4" key={row.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <strong className="break-words text-sm font-extrabold">{row.vendor}</strong>
                      <RiskPill risk={row.risk} label={row.risk} />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-quiet">{row.date} - {currency(row.amount)} - {row.owner}</p>
                  </article>
                ))
              )}
            </div>
          </DisclosureRow>

          <DisclosureRow count={duplicateTools.length} icon={Inbox} isOpen={expandedSection === "duplicates"} title="Duplicate tools" tone="good" onToggle={() => setExpandedSection(expandedSection === "duplicates" ? "actions" : "duplicates")}>
            <div className="grid gap-3">
              {duplicateTools.length === 0 ? (
                <EmptyState title="No duplicates detected" detail="Overlapping vendor categories will appear here for consolidation review." />
              ) : (
                duplicateTools.slice(0, 3).map((row) => (
                  <article className="min-w-0 rounded-lg border border-line/50 bg-panel-subtle/72 p-4" key={row.group}>
                    <strong className="block break-words text-sm font-extrabold">{row.group}</strong>
                    <p className="mt-1 text-sm leading-6 text-quiet">{row.tools}</p>
                  </article>
                ))
              )}
            </div>
          </DisclosureRow>
        </div>
      </Panel>

      <Panel title="Best next action" eyebrow="Command focus">
        <div className="min-w-0 rounded-lg border border-brand/20 bg-brand-soft/45 p-4">
          <span className="text-xs font-bold text-brand-strong">Priority recommendation</span>
          <strong className="mt-2 block break-words text-2xl font-extrabold">{topSignals[0]?.vendor ? `Review ${topSignals[0].vendor}` : "Import vendor evidence"}</strong>
          <p className="mt-2 text-sm leading-6 text-quiet">
            {topSignals[0]?.detail ?? "Add spend, seats, owners, last-used dates, and renewals so AutoAudit can rank the savings queue."}
          </p>
          <div className="mt-5 grid gap-2">
            <PrimaryButton onClick={() => onNavigate(topSignals[0] ? "waste" : "vendors")}>{topSignals[0] ? "Review action" : "Import vendors"}</PrimaryButton>
            <SecondaryButton onClick={() => {
              onToast("Open Reports to generate a CFO-ready packet.");
              onNavigate("reports");
            }}>
              Generate CFO packet
            </SecondaryButton>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function DisclosureRow({
  children,
  count,
  icon: Icon,
  isOpen,
  title,
  tone,
  onToggle,
}: {
  children: ReactNode;
  count: number;
  icon: LucideIcon;
  isOpen: boolean;
  title: string;
  tone: string;
  onToggle: () => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line/50 bg-panel-subtle/52">
      <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-panel-muted/60" type="button" onClick={onToggle}>
        <span className="flex min-w-0 items-center gap-3">
          <span className={`grid size-9 place-items-center rounded-lg ${metricTone(tone)}`}>
            <Icon aria-hidden="true" size={17} />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-extrabold">{title}</strong>
            <span className="text-xs font-bold text-quiet">{count} open</span>
          </span>
        </span>
        <ChevronRight className={`shrink-0 text-quiet transition ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" size={18} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-line/40 p-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewSystemStatus({ company, totals, onNavigate }: { company: ApiCompany | null; totals: DashboardTotals; onNavigate: (page: PageId) => void }) {
  const limits = getPlanLimitSet(company);
  const usage = getPlanUsage(company, totals.vendorCount);

  return (
    <Panel title="System status" eyebrow="Coverage, usage, and sync" action={<PanelAction label="Open settings" onClick={() => onNavigate("settings")} />}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <UsageMeter compact label="Audit coverage" used={Math.min(82, Math.max(18, totals.vendorCount * 8))} limit={100} />
        <UsageMeter compact label="Vendors tracked" used={usage.vendors} limit={limits.vendors} />
        <UsageMeter compact label="AI emails" used={usage.aiEmails} limit={limits.aiEmails} />
        <UsageMeter compact label="Reports" used={usage.reports} limit={limits.reports} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { label: "Sync state", value: "Live backend connected", tone: "good" },
          { label: "Integrations", value: "CSV available - 6 planned", tone: "brand" },
          { label: "Plan", value: formatPlanLabel(company?.plan ?? "free"), tone: "warning" },
        ].map((item) => (
          <div className="rounded-lg border border-line/50 bg-panel-subtle/62 p-4" key={item.label}>
            <span className="text-xs font-bold text-quiet">{item.label}</span>
            <strong className={`mt-2 block text-sm font-extrabold ${item.tone === "good" ? "text-good" : item.tone === "warning" ? "text-warning" : "text-brand-strong"}`}>{item.value}</strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VendorsPage({
  activityEntries,
  apiVendors,
  categoryOptions,
  isClearingSampleData,
  isLoading,
  isLoadingDemo,
  pagination,
  query,
  savingsEntries,
  vendors,
  wasteSignals,
  onClearSampleData,
  onCreateVendor,
  onDeleteVendor,
  onEmailShortcut,
  onImportVendors,
  onLoadDemoData,
  onQueryChange,
  onToast,
  onUpdateVendor,
}: {
  activityEntries: ApiActivityLog[];
  apiVendors: ApiVendor[];
  categoryOptions: string[];
  isClearingSampleData: boolean;
  isLoading: boolean;
  isLoadingDemo: boolean;
  pagination: PaginationMeta | null;
  query: VendorQueryState;
  savingsEntries: ApiSavingsEntry[];
  vendors: Vendor[];
  wasteSignals: WasteSignal[];
  onClearSampleData: () => Promise<void>;
  onCreateVendor: (input: CreateVendorInput) => Promise<void>;
  onDeleteVendor: (vendor: Vendor) => Promise<void>;
  onEmailShortcut: (vendorName: string) => void;
  onImportVendors: (inputs: CreateVendorInput[]) => Promise<{ created: number; failed: number; errors: string[] }>;
  onLoadDemoData: () => Promise<void>;
  onQueryChange: (update: Partial<VendorQueryState>) => void;
  onToast: (message: string) => void;
  onUpdateVendor: (id: string, input: Partial<CreateVendorInput>) => Promise<void>;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setImporting] = useState(false);
  const [pendingImportRows, setPendingImportRows] = useState<CreateVendorInput[]>([]);
  const [pendingImportFileName, setPendingImportFileName] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    ownerName: "",
    monthlySpend: "",
    seatsPurchased: "",
    activeSeats: "",
    lastUsedAt: "",
    renewalDate: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const handleQueryChange = (value: string) => {
    onQueryChange({ search: value });
  };

  const currentPage = pagination?.page ?? query.page;
  const totalPages = pagination?.totalPages ?? 1;
  const visibleVendors = vendors;
  const sampleVendorCount = apiVendors.filter((vendor) => vendor.source === "sample").length;

  useEffect(() => {
    if (selectedVendor && !vendors.some((vendor) => vendor.id === selectedVendor.id)) {
      setSelectedVendor(null);
    }
  }, [selectedVendor, vendors]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const vendor = pendingDelete;
    setPendingDelete(null);
    await onDeleteVendor(vendor);
  };

  async function handleCreateVendor() {
    if (!form.name.trim()) {
      setFormError("Vendor name is required");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await onCreateVendor({
        name: form.name.trim(),
        category: form.category.trim() || "Uncategorized",
        ownerName: form.ownerName.trim(),
        monthlySpend: Number(form.monthlySpend || 0),
        seatsPurchased: Number(form.seatsPurchased || 0),
        activeSeats: Number(form.activeSeats || 0),
        lastUsedAt: form.lastUsedAt || undefined,
        renewalDate: form.renewalDate || undefined,
      });
      setForm({
        name: "",
        category: "",
        ownerName: "",
        monthlySpend: "",
        seatsPurchased: "",
        activeSeats: "",
        lastUsedAt: "",
        renewalDate: "",
      });
      setShowForm(false);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportMessage("");
    setImportError("");
    setPendingImportRows([]);
    setPendingImportFileName("");

    try {
      const text = await file.text();
      const inputs = parseVendorCsv(text);
      setPendingImportRows(inputs);
      setPendingImportFileName(file.name);
      setImportMessage(`Preview ready: ${inputs.length} vendors found.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : getApiErrorMessage(error);
      setImportError(message);
      onToast(message);
    } finally {
      event.target.value = "";
    }
  }

  async function handleConfirmImport() {
    if (pendingImportRows.length === 0) return;

    setImporting(true);
    setImportMessage("");
    setImportError("");

    try {
      const result = await onImportVendors(pendingImportRows);
      const successMessage = result.failed > 0 ? `Imported ${result.created} vendors. ${result.failed} rows need review.` : `Imported ${result.created} vendors.`;

      analyticsApi.track("csv_import_confirmed", { rows: pendingImportRows.length, created: result.created, failed: result.failed });
      setPendingImportRows([]);
      setPendingImportFileName("");
      setImportMessage(successMessage);
      setImportError(result.errors.join(" "));
      onToast(successMessage);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setImportError(message);
      onToast(message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Vendor inventory"
        title="All SaaS vendors"
        detail="Track ownership, spend, usage, seats, risk, and renewal status in one place."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <input ref={importInputRef} accept=".csv,text/csv" className="hidden" type="file" onChange={handleImportFile} />
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" disabled={isImporting} type="button" onClick={() => importInputRef.current?.click()}>
              {isImporting ? "Importing..." : "Import CSV"}
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" onClick={() => downloadCsvTemplate(onToast)}>
              Download template
            </button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoadingDemo || vendors.length > 0} type="button" onClick={onLoadDemoData}>
              {isLoadingDemo ? "Loading..." : "Load sample data"}
            </button>
            {sampleVendorCount > 0 && (
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isClearingSampleData} type="button" onClick={onClearSampleData}>
                {isClearingSampleData ? "Clearing..." : "Clear sample data"}
              </button>
            )}
            <PrimaryButton onClick={() => setShowForm((current) => !current)}>{showForm ? "Close form" : "Add vendor"}</PrimaryButton>
          </div>
        }
      />

      {showForm && (
        <Panel title="Add vendor" eyebrow="Live backend form">
          <div className="grid gap-3 md:grid-cols-4">
            {formError && <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk md:col-span-4">{formError}</div>}
            <Field label="Vendor name">
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Category">
              <input className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </Field>
            <Field label="Owner">
              <input className="input" value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} />
            </Field>
            <Field label="Monthly spend">
              <input className="input" min="0" type="number" value={form.monthlySpend} onChange={(event) => setForm({ ...form, monthlySpend: event.target.value })} />
            </Field>
            <Field label="Seats purchased">
              <input className="input" min="0" type="number" value={form.seatsPurchased} onChange={(event) => setForm({ ...form, seatsPurchased: event.target.value })} />
            </Field>
            <Field label="Active seats">
              <input className="input" min="0" type="number" value={form.activeSeats} onChange={(event) => setForm({ ...form, activeSeats: event.target.value })} />
            </Field>
            <Field label="Last used">
              <input className="input" type="date" value={form.lastUsedAt} onChange={(event) => setForm({ ...form, lastUsedAt: event.target.value })} />
            </Field>
            <Field label="Renewal date">
              <input className="input" type="date" value={form.renewalDate} onChange={(event) => setForm({ ...form, renewalDate: event.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton onClick={handleCreateVendor}>{isSubmitting ? "Saving..." : "Save vendor"}</PrimaryButton>
            <SecondaryButton onClick={() => setShowForm(false)}>Cancel</SecondaryButton>
          </div>
        </Panel>
      )}

      {pendingImportRows.length > 0 && (
        <Panel
          title="Preview CSV import"
          eyebrow={`${pendingImportRows.length} vendors from ${pendingImportFileName}`}
          action={
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={handleConfirmImport}>{isImporting ? "Importing..." : `Import ${pendingImportRows.length} vendors`}</PrimaryButton>
              <SecondaryButton onClick={() => {
                setPendingImportRows([]);
                setPendingImportFileName("");
                setImportMessage("");
              }}>
                Cancel
              </SecondaryButton>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs uppercase text-quiet">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Monthly spend</th>
                  <th className="px-3 py-2">Seats</th>
                </tr>
              </thead>
              <tbody>
                {pendingImportRows.slice(0, 5).map((row, index) => (
                  <tr className="bg-panel-subtle text-sm font-bold" key={`${row.name}-${index}`}>
                    <td className="rounded-l-lg border-y border-l border-line px-3 py-3">{row.name}</td>
                    <td className="border-y border-line px-3 py-3">{row.category || "Uncategorized"}</td>
                    <td className="border-y border-line px-3 py-3">{row.ownerName || "Unassigned"}</td>
                    <td className="border-y border-line px-3 py-3">{currency(Number(row.monthlySpend ?? 0))}</td>
                    <td className="rounded-r-lg border-y border-r border-line px-3 py-3">{Number(row.activeSeats ?? 0)} / {Number(row.seatsPurchased ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pendingImportRows.length > 5 && <p className="mt-3 text-sm font-bold text-quiet">Showing first 5 rows. The full import includes {pendingImportRows.length} vendors.</p>}
        </Panel>
      )}

      {(importMessage || importError) && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${importError ? "border-risk/20 bg-risk-soft text-risk" : "border-good/20 bg-good-soft text-good"}`}>
          {importError || importMessage}
        </div>
      )}

      <Panel
        title="Vendor directory"
        eyebrow={isLoading ? "Loading vendors" : `${vendors.length} vendors shown${pagination ? ` of ${pagination.total}` : ""}`}
        action={
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <SearchBox value={query.search} onChange={handleQueryChange} />
            <SelectPill value={query.status} onChange={(value) => onQueryChange({ status: value })} values={vendorStatusFilters} />
            <SelectPill value={query.category} onChange={(value) => onQueryChange({ category: value })} values={categoryOptions} />
          </div>
        }
      >
        {selectedVendor && (
          <VendorDetailPanel
            activityEntries={activityEntries}
            apiVendor={apiVendors.find((vendor) => vendor._id === selectedVendor.id)}
            savingsEntries={savingsEntries}
            vendor={selectedVendor}
            wasteSignals={wasteSignals}
            onClose={() => setSelectedVendor(null)}
            onEmailShortcut={onEmailShortcut}
            onToast={onToast}
            onUpdateVendor={onUpdateVendor}
          />
        )}
        {pendingDelete && (
          <div className="mb-4 rounded-lg border border-risk/20 bg-risk-soft p-4 text-risk">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm">Delete {pendingDelete.name}?</strong>
                <span className="mt-1 block text-sm">This removes the vendor from this workspace.</span>
              </div>
              <div className="flex gap-2">
                <button className="min-h-10 rounded-lg bg-risk px-3 text-sm font-extrabold text-white" type="button" onClick={handleConfirmDelete}>
                  Delete
                </button>
                <button className="min-h-10 rounded-lg bg-white px-3 text-sm font-extrabold text-risk" type="button" onClick={() => setPendingDelete(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : vendors.length === 0 ? (
          <EmptyState
            title={pagination && pagination.total === 0 && (query.search || query.status !== "All" || query.category !== "All") ? "No matching vendors" : "No vendors yet"}
            detail={pagination && pagination.total === 0 && (query.search || query.status !== "All" || query.category !== "All") ? "Adjust search or filters to see more live backend results." : "Start with sample vendors or import a CSV with spend, seats, owners, usage, and renewal dates. AutoAudit needs this evidence before it can flag waste."}
            action={
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand" type="button" onClick={() => setShowForm(true)}>
                  Add vendor
                </button>
                <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isLoadingDemo} onClick={onLoadDemoData}>
                  {isLoadingDemo ? "Loading..." : "Load sample data"}
                </button>
              </div>
            }
          />
        ) : (
          <>
          <div className="grid gap-3 md:hidden">
            {visibleVendors.map((vendor) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4 shadow-sm" key={vendor.id}>
                <div className="flex items-start justify-between gap-3">
                  <VendorIdentity vendor={vendor} />
                  <RiskPill risk={vendor.risk} label={vendor.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <MobileMetric label="Spend" value={currency(vendor.spend)} />
                  <MobileMetric label="Seats" value={`${vendor.activeSeats} / ${vendor.seats}`} />
                  <MobileMetric label="Last used" value={vendor.lastUsed} />
                  <MobileMetric label="Renewal" value={vendor.renewal} />
                </div>
                <div className="mt-4 flex gap-2">
                  <SecondaryButton onClick={() => setSelectedVendor(vendor)}>Open</SecondaryButton>
                  <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk transition hover:-translate-y-0.5" type="button" onClick={() => setPendingDelete(vendor)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[920px] w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs uppercase text-quiet">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Monthly spend</th>
                  <th className="px-3 py-2">Seats</th>
                  <th className="px-3 py-2">Last used</th>
                  <th className="px-3 py-2">Renewal</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleVendors.map((vendor) => (
                  <tr className="rounded-lg bg-panel-subtle shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={vendor.id}>
                    <td className="rounded-l-lg border-y border-l border-line px-3 py-3">
                      <VendorIdentity vendor={vendor} />
                    </td>
                    <td className="border-y border-line px-3 py-3 text-sm font-bold">{vendor.owner}</td>
                    <td className="border-y border-line px-3 py-3 text-sm font-extrabold">{currency(vendor.spend)}</td>
                    <td className="border-y border-line px-3 py-3 text-sm text-quiet">
                      <strong className="text-ink">{vendor.activeSeats}</strong> / {vendor.seats}
                    </td>
                    <td className="border-y border-line px-3 py-3 text-sm text-quiet">{vendor.lastUsed}</td>
                    <td className="border-y border-line px-3 py-3 text-sm font-bold">{vendor.renewal}</td>
                    <td className="border-y border-line px-3 py-3">
                      <RiskPill risk={vendor.risk} label={vendor.status} />
                    </td>
                    <td className="rounded-r-lg border-y border-r border-line px-3 py-3">
                      <div className="flex gap-2">
                        <IconButton label={`Open ${vendor.name}`} onClick={() => setSelectedVendor(vendor)}>
                          <ChevronRight aria-hidden="true" size={18} />
                        </IconButton>
                        <IconButton label={`Delete ${vendor.name}`} onClick={() => setPendingDelete(vendor)}>
                          <Trash2 aria-hidden="true" size={18} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm text-quiet sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <SecondaryButton onClick={() => onQueryChange({ page: Math.max(1, currentPage - 1) })}>Previous</SecondaryButton>
              <SecondaryButton onClick={() => onQueryChange({ page: Math.min(totalPages, currentPage + 1) })}>Next</SecondaryButton>
            </div>
          </div>
          </>
        )}
      </Panel>
    </div>
  );
}

function VendorDetailPanel({
  activityEntries,
  apiVendor,
  savingsEntries,
  vendor,
  wasteSignals,
  onClose,
  onEmailShortcut,
  onToast,
  onUpdateVendor,
}: {
  activityEntries: ApiActivityLog[];
  apiVendor?: ApiVendor;
  savingsEntries: ApiSavingsEntry[];
  vendor: Vendor;
  wasteSignals: WasteSignal[];
  onClose: () => void;
  onEmailShortcut: (vendorName: string) => void;
  onToast: (message: string) => void;
  onUpdateVendor: (id: string, input: Partial<CreateVendorInput>) => Promise<void>;
}) {
  const [form, setForm] = useState(() => vendorFormFromApi(apiVendor, vendor));
  const [isSaving, setSaving] = useState(false);
  const relatedSignals = wasteSignals.filter((signal) => signal.vendorId === vendor.id || signal.vendor === vendor.name);
  const relatedSavings = savingsEntries.filter((entry) => entry.vendorId === vendor.id || entry.vendorName === vendor.name);
  const relatedActivity = activityEntries.filter((entry) => entry.entityId === vendor.id || entry.entityName === vendor.name || entry.metadata?.vendorName === vendor.name);

  useEffect(() => {
    setForm(vendorFormFromApi(apiVendor, vendor));
  }, [apiVendor?._id, apiVendor?.updatedAt, vendor.id]);

  const save = async () => {
    setSaving(true);
    try {
      await onUpdateVendor(vendor.id, {
        name: form.name,
        category: form.category,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        monthlySpend: Number(form.monthlySpend || 0),
        seatsPurchased: Number(form.seatsPurchased || 0),
        activeSeats: Number(form.activeSeats || 0),
        lastUsedAt: form.lastUsedAt || undefined,
        renewalDate: form.renewalDate || undefined,
        notes: form.notes,
      });
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={`${vendor.name} profile`} eyebrow="Vendor detail" action={<PanelAction label="Close" onClick={onClose} />}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <EditableField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <EditableField label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
          <EditableField label="Owner" value={form.ownerName} onChange={(value) => setForm({ ...form, ownerName: value })} />
          <EditableField label="Owner email" value={form.ownerEmail} onChange={(value) => setForm({ ...form, ownerEmail: value })} />
          <EditableField label="Monthly spend" type="number" value={form.monthlySpend} onChange={(value) => setForm({ ...form, monthlySpend: value })} />
          <EditableField label="Seats purchased" type="number" value={form.seatsPurchased} onChange={(value) => setForm({ ...form, seatsPurchased: value })} />
          <EditableField label="Active seats" type="number" value={form.activeSeats} onChange={(value) => setForm({ ...form, activeSeats: value })} />
          <EditableField label="Last used" type="date" value={form.lastUsedAt} onChange={(value) => setForm({ ...form, lastUsedAt: value })} />
          <EditableField label="Renewal date" type="date" value={form.renewalDate} onChange={(value) => setForm({ ...form, renewalDate: value })} />
          <ReadOnlyField label="Status" value={vendor.status} />
          <ReadOnlyField label="Risk score" value={String(apiVendor?.riskScore ?? vendor.risk)} />
          <ReadOnlyField label="Source" value={apiVendor?.source ?? "manual"} />
        </div>
        <Field label="Notes">
          <textarea className="input min-h-24 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={save}>{isSaving ? "Saving..." : "Save vendor"}</PrimaryButton>
          <SecondaryButton onClick={() => onEmailShortcut(form.name || vendor.name)}>
            <Mail aria-hidden="true" size={16} />
            Generate Email
          </SecondaryButton>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Waste signals" eyebrow={`${relatedSignals.length} linked`}>
            <div className="grid gap-3">
              {relatedSignals.length === 0 ? <EmptyState title="No linked waste signals" detail="Signals for this vendor will appear after waste detection runs." /> : relatedSignals.map((signal) => <EvidenceCard key={signal.title} signal={signal} />)}
            </div>
          </Panel>
          <Panel title="Confirmed savings" eyebrow={`${relatedSavings.length} entries`}>
            <div className="grid gap-2">
              {relatedSavings.length === 0 ? <EmptyState title="No savings yet" detail="Confirmed savings for this vendor will appear here." /> : relatedSavings.map((entry) => (
                <div className="rounded-lg border border-line bg-panel-subtle p-3" key={entry.id}>
                  <strong className="block text-sm font-extrabold">{currency(entry.monthlySavings)}/mo</strong>
                  <span className="text-xs font-bold text-quiet">{formatSavingsType(entry.savingsType)} - {formatShortDate(entry.confirmedAt)}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Activity" eyebrow={`${relatedActivity.length} events`}>
            <div className="grid gap-2">
              {relatedActivity.length === 0 ? <EmptyState title="No activity yet" detail="Vendor-specific activity appears after edits or actions." /> : relatedActivity.slice(0, 6).map((entry) => (
                <div className="rounded-lg border border-line bg-panel-subtle p-3" key={entry._id}>
                  <strong className="block text-sm font-extrabold">{formatActivityDescription(entry)}</strong>
                  <span className="text-xs font-bold text-quiet">{entry.userEmail ?? "Team member"} - {formatRelativeTimestamp(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Panel>
  );
}

function EditableField({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-subtle px-3 py-2">
      <span className="text-xs font-bold uppercase text-quiet">{label}</span>
      <strong className="mt-1 block text-sm font-extrabold">{value}</strong>
    </div>
  );
}

function vendorFormFromApi(apiVendor: ApiVendor | undefined, vendor: Vendor) {
  return {
    name: apiVendor?.name ?? vendor.name,
    category: apiVendor?.category ?? vendor.category,
    ownerName: apiVendor?.ownerName ?? vendor.owner,
    ownerEmail: apiVendor?.ownerEmail ?? "",
    monthlySpend: String(apiVendor?.monthlySpend ?? vendor.spend),
    seatsPurchased: String(apiVendor?.seatsPurchased ?? vendor.seats),
    activeSeats: String(apiVendor?.activeSeats ?? vendor.activeSeats),
    lastUsedAt: apiVendor?.lastUsedAt ? apiVendor.lastUsedAt.slice(0, 10) : "",
    renewalDate: apiVendor?.renewalDate ? apiVendor.renewalDate.slice(0, 10) : "",
    notes: apiVendor?.notes ?? "",
  };
}

function WasteDetectionPage({
  aiAnalysis,
  duplicateTools,
  hasVendors,
  isLoadingDemo,
  isAnalyzing,
  actionItems,
  currentUser,
  unusedSeats,
  wasteSignals,
  onExplainWaste,
  onCreateActionItem,
  onUpdateActionItemStatus,
  onDeleteActionItem,
  onAssignActionItem,
  onApproveActionItem,
  onRejectActionItem,
  onCommentActionItem,
  onCompleteActionItem,
  onConfirmSaving,
  onLoadDemoData,
  onNavigate,
  onRunDetection,
  onToast,
  teamMembers,
}: {
  aiAnalysis: string;
  duplicateTools: DuplicateToolRow[];
  hasVendors: boolean;
  isLoadingDemo: boolean;
  isAnalyzing: boolean;
  actionItems: ApiActionItem[];
  currentUser: ApiUser | null;
  unusedSeats: UnusedSeatRow[];
  wasteSignals: WasteSignal[];
  onExplainWaste: (signal: WasteSignal) => Promise<void>;
  onCreateActionItem: (signal: WasteSignal) => Promise<void>;
  onUpdateActionItemStatus: (actionId: string, status: ActionItemStatus) => Promise<void>;
  onDeleteActionItem: (actionId: string) => Promise<void>;
  onAssignActionItem: (actionId: string, input: { assignedTo?: string; dueDate?: string }) => Promise<void>;
  onApproveActionItem: (actionId: string) => Promise<void>;
  onRejectActionItem: (actionId: string, rejectionReason: string) => Promise<void>;
  onCommentActionItem: (actionId: string, text: string) => Promise<void>;
  onCompleteActionItem: (actionId: string, confirmedSavings?: number) => Promise<void>;
  onConfirmSaving: (input: { signal: WasteSignal; savingsType: SavingsType; monthlySavings: number; notes?: string }) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onRunDetection: () => Promise<void>;
  onToast: (message: string) => void;
  teamMembers: ApiTeamMember[];
}) {
  const [savingSignal, setSavingSignal] = useState<WasteSignal | null>(null);
  const canApproveActions = currentUser?.role === "owner" || currentUser?.role === "admin";

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="AI detection"
        title="Waste signals"
        detail="AutoAudit maps spend, usage, seats, and renewal windows to prioritize high-value actions. AI suggestions are reviewed by users before anything happens."
        action={<PrimaryButton onClick={onRunDetection}>{isAnalyzing ? "Analyzing..." : "Run AI detection"}</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Recommended actions" eyebrow="Highest impact first">
          <div className="grid gap-3">
            {wasteSignals.length === 0 && (
              <EmptyState
                title={hasVendors ? "No waste signals yet" : "No vendor data yet"}
                detail={hasVendors ? "Add seat counts, active users, last-used dates, and renewals to make the findings more evidence-backed." : "Load sample vendors or import a CSV to see why tools get flagged and how savings are estimated."}
                action={<EmptySetupActions isLoadingDemo={isLoadingDemo} onLoadDemoData={onLoadDemoData} onNavigate={onNavigate} />}
              />
            )}
            {wasteSignals.map((signal) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md" key={signal.title}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{signal.type}</span>
                      <span className="text-xs font-bold text-quiet">{signal.confidence}% confidence</span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold">{signal.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-quiet">{signal.detail}</p>
                  </div>
                  <div className="rounded-lg bg-panel-muted p-3 text-right">
                    <span className="text-xs font-extrabold uppercase text-quiet">Impact</span>
                    <strong className="block text-xl font-extrabold">{currency(signal.impact)}</strong>
                  </div>
                </div>
                <EvidenceCard signal={signal} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => onExplainWaste(signal)}>Explain waste</SecondaryButton>
                  <SecondaryButton onClick={() => setSavingSignal(signal)}>Confirm Saving</SecondaryButton>
                  <PrimaryButton onClick={() => onCreateActionItem(signal)}>Create action</PrimaryButton>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        {aiAnalysis && (
          <Panel title="AI analysis" eyebrow="OpenAI response">
            <div className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-panel-subtle p-4 text-sm leading-6 text-ink">
              {aiAnalysis}
            </div>
          </Panel>
        )}

        <Panel title="Detection mix" eyebrow="Waste by class">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 280 }}>
              <BarChart data={wasteSignals} layout="vertical" margin={{ top: 4, right: 16, left: 18, bottom: 4 }}>
                <CartesianGrid stroke="#dce4e8" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: "#66747d", fontSize: 12 }} />
                <YAxis type="category" dataKey="vendor" width={72} axisLine={false} tickLine={false} tick={{ fill: "#66747d", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="impact" name="Savings" radius={[0, 8, 8, 0]} fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {savingSignal && <ConfirmSavingModal signal={savingSignal} onClose={() => setSavingSignal(null)} onConfirm={onConfirmSaving} />}

      {actionItems.length > 0 && (
        <Panel title="Action queue" eyebrow={`${actionItems.length} saved action${actionItems.length === 1 ? "" : "s"}`}>
          <div className="grid gap-3">
            {actionItems.map((action) => (
              <ActionItemWorkflowCard
                action={action}
                canApprove={canApproveActions}
                key={action.id}
                teamMembers={teamMembers}
                onAddComment={onCommentActionItem}
                onApprove={onApproveActionItem}
                onAssign={onAssignActionItem}
                onComplete={onCompleteActionItem}
                onDelete={onDeleteActionItem}
                onReject={onRejectActionItem}
                onUpdateStatus={onUpdateActionItemStatus}
              />
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Human review built in" eyebrow="AI guardrail">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "AI explains why a vendor was flagged from the data you provided.",
            "You decide whether to cancel, reduce seats, renegotiate, or keep monitoring.",
            "AutoAudit does not contact vendors or change subscriptions automatically.",
          ].map((note) => (
            <div className="rounded-lg border border-line bg-panel-subtle p-4 text-sm font-bold leading-6 text-quiet" key={note}>
              {note}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <UnusedSeatsTable rows={unusedSeats} />
        <DuplicateToolsPanel rows={duplicateTools} />
      </div>
    </div>
  );
}

function RenewalsPage({
  hasVendors,
  isLoadingDemo,
  renewalChartData,
  renewalRows,
  showUrgentOnly,
  onClearUrgentFilter,
  onLoadDemoData,
  onMarkReviewed,
  onNavigate,
  onToast,
}: {
  hasVendors: boolean;
  isLoadingDemo: boolean;
  renewalChartData: typeof renewalChart;
  renewalRows: RenewalRow[];
  showUrgentOnly: boolean;
  onClearUrgentFilter: () => void;
  onLoadDemoData: () => Promise<void>;
  onMarkReviewed: (renewalId: string) => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const visibleRenewalRows = showUrgentOnly ? renewalRows.filter((renewal) => isRenewalWithinDays(renewal.renewalDate, 7) && renewal.status !== "reviewed") : renewalRows;
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRow | null>(visibleRenewalRows[0] ?? null);

  useEffect(() => {
    if (!selectedRenewal && visibleRenewalRows[0]) {
      setSelectedRenewal(visibleRenewalRows[0]);
    }
  }, [visibleRenewalRows, selectedRenewal]);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Contract control"
        title="Upcoming renewals"
        detail="Prioritize notice windows, contract owners, benchmark gaps, and savings opportunities before vendors auto-renew."
        action={<PrimaryButton onClick={() => exportRenewalCalendar(renewalRows, onToast)}>Export calendar</PrimaryButton>}
      />
      {showUrgentOnly && (
        <div className="flex flex-col gap-3 rounded-lg border border-risk/20 bg-risk-soft p-4 text-risk sm:flex-row sm:items-center sm:justify-between">
          <strong className="text-sm font-extrabold">Showing only renewals due in the next 7 days.</strong>
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-risk/20 bg-panel px-4 text-sm font-extrabold text-risk" type="button" onClick={onClearUrgentFilter}>
            Show all renewals
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Renewal exposure" eyebrow="Next 90 days">
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 310 }}>
              <BarChart data={renewalChartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#dce4e8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="window" axisLine={false} tickLine={false} tick={{ fill: "#66747d", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: "#66747d", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Renewal exposure" radius={[8, 8, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Notice windows" eyebrow="Action required">
          <div className="grid gap-3">
            {visibleRenewalRows.length === 0 && (
              <EmptyState
                title={hasVendors ? "No upcoming renewals" : "No renewal data yet"}
                detail={hasVendors ? "Renewals appear here when vendors include renewal dates. Add dates to build an owner review queue before notice windows close." : "Load sample data or import a CSV with renewal dates to see contract exposure and calendar export."}
                action={<EmptySetupActions isLoadingDemo={isLoadingDemo} onLoadDemoData={onLoadDemoData} onNavigate={onNavigate} />}
              />
            )}
            {visibleRenewalRows.map((renewal) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4" key={renewal.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="block font-extrabold">{renewal.vendor}</strong>
                    <span className="mt-1 block text-sm text-quiet">{renewal.owner} owner</span>
                  </div>
                  <RiskPill risk={renewal.risk} label={renewal.date} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <span className="block text-xs font-extrabold uppercase text-quiet">Contract value</span>
                    <strong className="text-xl font-extrabold">{currency(renewal.amount)}</strong>
                  </div>
                  <IconButton label={`Review ${renewal.vendor}`} onClick={() => setSelectedRenewal(renewal)}>
                    <ChevronRight aria-hidden="true" size={18} />
                  </IconButton>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      {selectedRenewal && (
        <Panel title={`${selectedRenewal.vendor} renewal brief`} eyebrow="Review workspace">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PlanMetric label="Owner" value={selectedRenewal.owner} />
            <PlanMetric label="Renewal date" value={selectedRenewal.date} />
            <PlanMetric label="Contract value" value={currency(selectedRenewal.amount)} />
            <PlanMetric label="Risk" value={selectedRenewal.risk} />
          </div>
          <p className="mt-4 rounded-lg border border-line bg-panel-subtle p-4 text-sm leading-6 text-quiet">
            Confirm usage, owner need, and cancellation notice window before approving renewal. Use the AI email generator if cancellation or renegotiation is the recommended path.
          </p>
          {selectedRenewal.status !== "reviewed" ? (
            <div className="mt-4">
              <PrimaryButton onClick={() => onMarkReviewed(selectedRenewal.id)}>Mark as reviewed</PrimaryButton>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-good/20 bg-good-soft p-4 text-sm font-extrabold text-good">Reviewed {formatShortDate(selectedRenewal.reviewedAt)}.</p>
          )}
        </Panel>
      )}
    </div>
  );
}

function ReportsPage({
  hasVendors,
  isGenerating,
  isLoadingDemo,
  reports: savedReports,
  reportDraft,
  trialExpired,
  onGenerateReport,
  onLoadDemoData,
  onNavigate,
  onToast,
}: {
  hasVendors: boolean;
  isGenerating: boolean;
  isLoadingDemo: boolean;
  reports: ApiReport[];
  reportDraft: string;
  trialExpired: boolean;
  onGenerateReport: (reportType: ReportType) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("cfo_summary");
  const reportCards = savedReports.map(mapApiReportToCard);
  const visibleReports: ReportCard[] = reportCards.length > 0 ? reportCards : reports;
  const [selectedReport, setSelectedReport] = useState<ReportCard>(visibleReports[0]);
  const [pdfReportId, setPdfReportId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedReport(visibleReports[0]);
  }, [savedReports.length]);

  async function handleDownloadPdf(report: ReportCard) {
    if (!report.id) {
      onToast("Create or open a saved report before downloading a server PDF.");
      return;
    }

    setPdfReportId(report.id);

    try {
      const pdf = await reportApi.exportPdf(report.id);
      downloadBlob(`${safeFilename(report.name)}.pdf`, pdf, onToast);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setPdfReportId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Board-ready output"
        title="Reports"
        detail="Generate monthly CFO packets, savings recaps, renewal briefs, and IT cleanup lists from the same audit data."
        action={<PrimaryButton onClick={() => onGenerateReport(selectedReportType)}>{trialExpired ? "Trial ended" : isGenerating ? "Generating..." : "Create AI report"}</PrimaryButton>}
      />

      {hasVendors && (
        <Panel title="Report type" eyebrow="Output format">
          <div className="grid gap-2 md:grid-cols-4">
            {reportTypeOptions.map((option) => (
              <button className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${selectedReportType === option.value ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-panel-subtle text-quiet hover:border-brand/60"}`} key={option.value} type="button" onClick={() => setSelectedReportType(option.value)}>
                <strong className="block text-sm font-extrabold">{option.label}</strong>
                <span className="mt-2 block text-xs leading-5">{option.detail}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {!hasVendors && (
        <EmptyState
          title="Reports need vendor data"
          detail="Load sample vendors or import your own CSV before generating CFO-ready reports with evidence, savings estimates, and recommended next steps."
          action={<EmptySetupActions isLoadingDemo={isLoadingDemo} onLoadDemoData={onLoadDemoData} onNavigate={onNavigate} />}
          icon={FileText}
        />
      )}

      {hasVendors && <div className="grid gap-4 lg:grid-cols-3">
        {visibleReports.map((report) => (
          <article className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)] transition hover:-translate-y-1 hover:shadow-xl" key={report.id ?? report.name}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
                <FileText aria-hidden="true" size={22} />
              </span>
              <span className="rounded-full bg-panel-muted px-2.5 py-1 text-xs font-extrabold text-quiet">{report.status}</span>
            </div>
            <span className="mt-4 inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{formatReportType(report.reportType)}</span>
            <h3 className="mt-5 text-lg font-extrabold">{report.name}</h3>
            <p className="mt-2 text-sm leading-6 text-quiet">
              {report.owner} packet covering {currency(report.savings)} in identified savings.
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm font-bold text-quiet">{report.date}</span>
              <SecondaryButton onClick={() => setSelectedReport(report)}>Open</SecondaryButton>
            </div>
          </article>
        ))}
      </div>}

      {hasVendors && selectedReport && (
        <Panel
          title={selectedReport.name}
          eyebrow={selectedReport.id ? "Saved report" : "Report preview"}
          action={
            <div className="flex flex-wrap gap-2">
              <PanelAction label="Export TXT" onClick={() => downloadTextFile(`${safeFilename(selectedReport.name)}.txt`, buildReportSummary(selectedReport), onToast)} />
              <PanelAction label="Export CSV" onClick={() => exportReportCsv(selectedReport, onToast)} />
              <button
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line/60 bg-panel-subtle/72 px-3 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!selectedReport.id || pdfReportId === selectedReport.id}
                onClick={() => handleDownloadPdf(selectedReport)}
              >
                {pdfReportId === selectedReport.id ? "Generating PDF..." : "Download PDF"}
              </button>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-lg border border-line bg-panel-subtle p-4">
              <h3 className="font-extrabold">Executive summary</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-quiet">{buildReportSummary(selectedReport)}</p>
            </div>
            <div className="grid gap-3">
              <PlanMetric label="Owner" value={selectedReport.owner} />
              <PlanMetric label="Type" value={formatReportType(selectedReport.reportType)} />
              <PlanMetric label="Savings" value={currency(selectedReport.savings)} />
              <PlanMetric label="Status" value={selectedReport.status} />
            </div>
          </div>
        </Panel>
      )}

      {hasVendors && <Panel title="Savings captured over time" eyebrow="Report chart">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 320 }}>
            <LineChart data={spendTrend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#dce4e8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#66747d", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: "#66747d", fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="savings" name="Savings captured" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="waste" name="Waste found" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>}

      {reportDraft && (
        <Panel title="AI monthly CFO waste report" eyebrow="Generated from live backend data" action={<PanelAction label="Copy" onClick={() => copyText(reportDraft, onToast)} />}>
          <div className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-panel-subtle p-4 text-sm leading-7 text-ink">
            {reportDraft}
          </div>
        </Panel>
      )}
    </div>
  );
}

function EmailGeneratorPage({
  apiVendors,
  draft,
  emailTone,
  initialVendorName,
  isLoadingDemo,
  vendors,
  onCopyDraft,
  onDraftChange,
  onGenerate,
  onLoadDemoData,
  onNavigate,
  onSaveCorrections,
  onToneChange,
}: {
  apiVendors: ApiVendor[];
  draft: string;
  emailTone: string;
  initialVendorName: string;
  isLoadingDemo: boolean;
  vendors: Vendor[];
  onCopyDraft: () => void;
  onDraftChange: (draft: string) => void;
  onGenerate: (vendorName: string, tone: string, goal: AiEmailGoal, verifiedData: AiEmailVerifiedOverrides) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onSaveCorrections: (vendorId: string, input: Partial<CreateVendorInput>) => Promise<void>;
  onToneChange: (tone: string) => void;
}) {
  const [selectedVendor, setSelectedVendor] = useState(initialVendorName || vendors[0]?.name || "Clearbit");
  const [selectedGoal, setSelectedGoal] = useState<AiEmailGoal>("cancel");
  const [isGenerating, setGenerating] = useState(false);
  const [isSavingCorrections, setSavingCorrections] = useState(false);
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState("");
  const [hasGeneratedDraft, setHasGeneratedDraft] = useState(false);
  const [copyChecklist, setCopyChecklist] = useState({
    spend: false,
    seats: false,
    renewal: false,
  });
  const selectedVendorRecord = vendors.find((vendor) => vendor.name === selectedVendor);
  const selectedApiVendor = apiVendors.find((vendor) => vendor.name === selectedVendor);
  const [verification, setVerification] = useState(() => buildEmailVerificationForm(selectedApiVendor, selectedVendor));
  const allCopyChecksComplete = copyChecklist.spend && copyChecklist.seats && copyChecklist.renewal;
  const hasCorrections = selectedApiVendor ? hasEmailVerificationChanges(selectedApiVendor, verification) : false;

  useEffect(() => {
    if (initialVendorName) {
      setSelectedVendor(initialVendorName);
    } else if (!selectedVendor && vendors[0]) {
      setSelectedVendor(vendors[0].name);
    }
  }, [initialVendorName, selectedVendor, vendors]);

  useEffect(() => {
    setVerification(buildEmailVerificationForm(selectedApiVendor, selectedVendor));
    setEditingField("");
    setHasGeneratedDraft(false);
    setCopyChecklist({ spend: false, seats: false, renewal: false });
  }, [selectedApiVendor?._id, selectedApiVendor?.updatedAt, selectedVendor, selectedGoal]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      await onGenerate(selectedVendor || vendors[0]?.name || "Vendor", emailTone, selectedGoal, {
        vendorName: verification.vendorName || selectedVendor || vendors[0]?.name || "Vendor",
        monthlySpend: Number(verification.monthlySpend || 0),
        seatsPurchased: Number(verification.seatsPurchased || 0),
        activeSeats: Number(verification.activeSeats || 0),
        lastUsedAt: verification.lastUsedAt || undefined,
        renewalDate: verification.renewalDate || undefined,
        emailGoal: selectedGoal,
        verifiedAt: new Date().toISOString(),
      });
      setHasGeneratedDraft(true);
      setCopyChecklist({ spend: false, seats: false, renewal: false });
    } catch (err) {
      setError(getAiUnavailableMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveCorrections() {
    if (!selectedApiVendor || !hasCorrections) return;

    setSavingCorrections(true);
    setError("");

    try {
      await onSaveCorrections(selectedApiVendor._id, {
        name: verification.vendorName || selectedApiVendor.name,
        monthlySpend: Number(verification.monthlySpend || 0),
        seatsPurchased: Number(verification.seatsPurchased || 0),
        activeSeats: Number(verification.activeSeats || 0),
        lastUsedAt: verification.lastUsedAt || undefined,
        renewalDate: verification.renewalDate || undefined,
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingCorrections(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="AI workflow"
        title="AI Email Generator"
        detail="Draft cancellation, renegotiation, owner follow-up, and renewal notice emails using audit evidence. You review and edit every draft before sending."
        action={<PrimaryButton onClick={handleGenerate}>{isGenerating ? "Generating..." : "Generate draft"}</PrimaryButton>}
      />

      {vendors.length === 0 && (
        <EmptyState
          title="Email drafts need a vendor"
          detail="Load sample data or import your vendor list so AutoAudit can attach spend, seats, renewal, savings context, and a clear reason for the draft."
          action={<EmptySetupActions isLoadingDemo={isLoadingDemo} onLoadDemoData={onLoadDemoData} onNavigate={onNavigate} />}
          icon={Mail}
        />
      )}

      {vendors.length > 0 && <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Prompt controls" eyebrow="Company context">
          <div className="grid gap-4">
            {error && <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk">{error}</div>}
            <Field label="Vendor">
              <select className="input" value={selectedVendor} onChange={(event) => setSelectedVendor(event.target.value)}>
                {vendors.length === 0 ? (
                  <option>Vendor</option>
                ) : (
                  vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.name}>
                      {vendor.name}
                    </option>
                  ))
                )}
              </select>
            </Field>
            <Field label="Goal">
              <select className="input" value={selectedGoal} onChange={(event) => setSelectedGoal(event.target.value as AiEmailGoal)}>
                {emailGoalOptions.map((goal) => (
                  <option key={goal.value} value={goal.value}>
                    {goal.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tone">
              <div className="grid grid-cols-3 gap-2">
                {["Direct", "Friendly", "Firm"].map((tone) => (
                  <button
                    className={`min-h-10 rounded-lg border text-sm font-extrabold transition ${emailTone === tone ? "border-brand bg-brand text-white" : "border-line bg-panel text-quiet hover:bg-panel-muted hover:text-ink"
                      }`}
                    type="button"
                    key={tone}
                    onClick={() => onToneChange(tone)}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </Field>
            <EmailVerificationCard
              editingField={editingField}
              form={verification}
              goal={selectedGoal}
              hasCorrections={hasCorrections}
              isGenerating={isGenerating}
              isSavingCorrections={isSavingCorrections}
              vendor={selectedApiVendor}
              onEditField={setEditingField}
              onGenerate={handleGenerate}
              onNavigateToVendor={() => onNavigate("vendors")}
              onSaveCorrections={handleSaveCorrections}
              onUpdate={(update) => setVerification((current) => ({ ...current, ...update }))}
            />
            <div className="rounded-lg border border-brand/30 bg-brand-soft p-4">
              <div className="flex items-center gap-2 text-brand-strong">
                <Sparkles aria-hidden="true" size={18} />
                <strong className="text-sm">Evidence attached</strong>
              </div>
              <p className="mt-2 text-sm leading-6 text-brand-strong">
                {selectedVendorRecord
                  ? `${selectedVendorRecord.status} status, ${selectedVendorRecord.activeSeats}/${selectedVendorRecord.seats} seats active, ${currency(selectedVendorRecord.savings)} estimated annual savings, renewal ${selectedVendorRecord.renewal}.`
                  : "Vendor status, seat usage, spend, renewal, and waste findings will be sent to the backend AI route."}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-brand-strong">
                AutoAudit only drafts the message. It does not email vendors or cancel subscriptions automatically.
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Vendor email draft"
          eyebrow="Editable output"
          action={
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line/60 bg-panel-subtle/72 px-3 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              type="button"
              disabled={hasGeneratedDraft && !allCopyChecksComplete}
              onClick={onCopyDraft}
            >
              Copy draft
            </button>
          }
        >
          {hasGeneratedDraft && (
            <div className="mb-4 grid gap-3 rounded-lg border border-warning/25 bg-warning-soft p-4 text-warning">
              <p className="text-sm font-bold leading-6">
                Review before sending: Verify the spend amounts and dates in this draft match your records. AutoAudit generates drafts based on the data you provided. Always confirm with your accounting system before sending.
              </p>
              <div className="grid gap-2 text-sm font-bold text-ink">
                <label className="flex items-start gap-2">
                  <input className="mt-1" type="checkbox" checked={copyChecklist.spend} onChange={(event) => setCopyChecklist((current) => ({ ...current, spend: event.target.checked }))} />
                  I verified the monthly spend amount ({currency(Number(verification.monthlySpend || 0))}/month)
                </label>
                <label className="flex items-start gap-2">
                  <input className="mt-1" type="checkbox" checked={copyChecklist.seats} onChange={(event) => setCopyChecklist((current) => ({ ...current, seats: event.target.checked }))} />
                  I verified the seat count ({Number(verification.seatsPurchased || 0)} purchased, {Number(verification.activeSeats || 0)} active)
                </label>
                <label className="flex items-start gap-2">
                  <input className="mt-1" type="checkbox" checked={copyChecklist.renewal} onChange={(event) => setCopyChecklist((current) => ({ ...current, renewal: event.target.checked }))} />
                  I verified the renewal date ({formatLongDate(verification.renewalDate)})
                </label>
              </div>
            </div>
          )}
          <textarea
            className="min-h-[420px] w-full resize-y rounded-lg border border-line bg-panel-subtle p-4 leading-7 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
            value={draft}
            spellCheck={false}
            onChange={(event) => onDraftChange(event.target.value)}
          />
        </Panel>
      </div>}
    </div>
  );
}

type EmailVerificationForm = {
  vendorName: string;
  monthlySpend: string;
  seatsPurchased: string;
  activeSeats: string;
  lastUsedAt: string;
  renewalDate: string;
};

function EmailVerificationCard({
  editingField,
  form,
  goal,
  hasCorrections,
  isGenerating,
  isSavingCorrections,
  vendor,
  onEditField,
  onGenerate,
  onNavigateToVendor,
  onSaveCorrections,
  onUpdate,
}: {
  editingField: string;
  form: EmailVerificationForm;
  goal: AiEmailGoal;
  hasCorrections: boolean;
  isGenerating: boolean;
  isSavingCorrections: boolean;
  vendor?: ApiVendor;
  onEditField: (field: string) => void;
  onGenerate: () => void;
  onNavigateToVendor: () => void;
  onSaveCorrections: () => void;
  onUpdate: (update: Partial<EmailVerificationForm>) => void;
}) {
  const daysSinceUpdate = vendor?.updatedAt ? daysSinceIso(vendor.updatedAt) : null;
  const isStale = daysSinceUpdate !== null && daysSinceUpdate > 60;
  const verifiedLabel = daysSinceUpdate === null ? "Last verified unknown" : `Last verified ${daysSinceUpdate} days ago`;

  return (
    <div className="rounded-lg border border-line bg-panel-subtle p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-brand-strong">Verify before AI draft</p>
          <h3 className="mt-1 text-base font-extrabold">Confirm the data AutoAudit will use</h3>
          <p className="mt-1 text-sm leading-6 text-quiet">Edits here are sent only to this AI draft unless you explicitly save them to the vendor record.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${isStale ? "bg-warning-soft text-warning" : "bg-good-soft text-good"}`}>
          {verifiedLabel}
        </span>
      </div>

      {isStale && (
        <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-sm font-bold leading-6 text-warning">
          This data hasn't been updated in {daysSinceUpdate} days. Verify before sending.
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <VerifiedDataField
          currentValue={vendor?.name ?? "Not set"}
          displayValue={form.vendorName || "Not set"}
          editing={editingField === "vendorName"}
          label="Vendor name"
          updatedAt={vendor?.updatedAt}
          value={form.vendorName}
          onChange={(value) => onUpdate({ vendorName: value })}
          onEdit={() => onEditField(editingField === "vendorName" ? "" : "vendorName")}
        />
        <VerifiedDataField
          currentValue={currency(Number(vendor?.monthlySpend ?? 0))}
          displayValue={`${currency(Number(form.monthlySpend || 0))}/month`}
          editing={editingField === "monthlySpend"}
          inputMode="decimal"
          label="Monthly spend"
          type="number"
          updatedAt={vendor?.updatedAt}
          value={form.monthlySpend}
          onChange={(value) => onUpdate({ monthlySpend: value })}
          onEdit={() => onEditField(editingField === "monthlySpend" ? "" : "monthlySpend")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <VerifiedDataField
            currentValue={String(vendor?.seatsPurchased ?? 0)}
            displayValue={`${Number(form.seatsPurchased || 0)} purchased`}
            editing={editingField === "seatsPurchased"}
            inputMode="numeric"
            label="Seats purchased"
            type="number"
            updatedAt={vendor?.updatedAt}
            value={form.seatsPurchased}
            onChange={(value) => onUpdate({ seatsPurchased: value })}
            onEdit={() => onEditField(editingField === "seatsPurchased" ? "" : "seatsPurchased")}
          />
          <VerifiedDataField
            currentValue={String(vendor?.activeSeats ?? 0)}
            displayValue={`${Number(form.activeSeats || 0)} active`}
            editing={editingField === "activeSeats"}
            inputMode="numeric"
            label="Active seats"
            type="number"
            updatedAt={vendor?.updatedAt}
            value={form.activeSeats}
            onChange={(value) => onUpdate({ activeSeats: value })}
            onEdit={() => onEditField(editingField === "activeSeats" ? "" : "activeSeats")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <VerifiedDataField
            currentValue={formatLongDate(vendor?.lastUsedAt)}
            displayValue={formatLongDate(form.lastUsedAt)}
            editing={editingField === "lastUsedAt"}
            label="Last used date"
            type="date"
            updatedAt={vendor?.updatedAt}
            value={form.lastUsedAt}
            onChange={(value) => onUpdate({ lastUsedAt: value })}
            onEdit={() => onEditField(editingField === "lastUsedAt" ? "" : "lastUsedAt")}
          />
          <VerifiedDataField
            currentValue={formatLongDate(vendor?.renewalDate)}
            displayValue={formatLongDate(form.renewalDate)}
            editing={editingField === "renewalDate"}
            label="Renewal date"
            type="date"
            updatedAt={vendor?.updatedAt}
            value={form.renewalDate}
            onChange={(value) => onUpdate({ renewalDate: value })}
            onEdit={() => onEditField(editingField === "renewalDate" ? "" : "renewalDate")}
          />
        </div>
        <div className="rounded-lg border border-line bg-panel px-3 py-2">
          <span className="text-xs font-bold uppercase text-quiet">Email goal</span>
          <strong className="mt-1 block text-sm font-extrabold">{emailGoalOptions.find((item) => item.value === goal)?.label ?? "Cancel subscription"}</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton onClick={onGenerate}>
          {isGenerating ? "Generating..." : "This data looks correct - generate my draft"}
        </PrimaryButton>
        <SecondaryButton onClick={onNavigateToVendor}>Update vendor record first</SecondaryButton>
        {vendor && hasCorrections && (
          <SecondaryButton onClick={onSaveCorrections}>
            {isSavingCorrections ? "Saving..." : "Save these corrections"}
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

function VerifiedDataField({
  currentValue,
  displayValue,
  editing,
  inputMode,
  label,
  type = "text",
  updatedAt,
  value,
  onChange,
  onEdit,
}: {
  currentValue: string;
  displayValue: string;
  editing: boolean;
  inputMode?: "decimal" | "numeric";
  label: string;
  type?: string;
  updatedAt?: string;
  value: string;
  onChange: (value: string) => void;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase text-quiet">{label}</span>
          <p className="mt-1 text-[11px] font-bold text-quiet">Database: {currentValue}</p>
        </div>
        <IconButton label={`Edit ${label}`} onClick={onEdit}>
          <Edit3 aria-hidden="true" size={15} />
        </IconButton>
      </div>
      {editing ? (
        <input
          className="mt-2 min-h-10 w-full rounded-lg border border-line bg-panel-subtle px-3 text-sm font-bold text-ink outline-none focus:border-brand"
          inputMode={inputMode}
          min={type === "number" ? "0" : undefined}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <strong className="mt-2 block truncate text-sm font-extrabold">{displayValue}</strong>
      )}
      <span className="mt-2 block text-[11px] font-bold text-quiet">{updatedAt ? `Last verified ${daysSinceIso(updatedAt)} days ago` : "Last verified unknown"}</span>
    </div>
  );
}

function PlanPage({ company, vendorCount, onToast }: { company: ApiCompany | null; vendorCount: number; onToast: (message: string) => void }) {
  const trial = getTrialState(company);
  const planLabel = formatPlanLabel(company?.plan ?? "free");
  const limits = getPlanLimitSet(company);
  const usage = getPlanUsage(company, vendorCount);
  const [requestedPlan, setRequestedPlan] = useState<"starter" | "standard" | "custom" | null>(null);
  const [isRequestingUpgrade, setRequestingUpgrade] = useState(false);
  const [isStartingCheckout, setStartingCheckout] = useState<"starter" | "standard" | null>(null);
  const [isOpeningPortal, setOpeningPortal] = useState(false);
  const [billingPortalError, setBillingPortalError] = useState("");
  const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");

  async function handleUpgradeRequest(plan: "starter" | "standard" | "custom") {
    setRequestingUpgrade(true);

    try {
      const response = await contactApi.requestUpgrade(plan);
      setRequestedPlan(plan);
      analyticsApi.track("manual_upgrade_requested", { plan });
      onToast(response.message);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setRequestingUpgrade(false);
    }
  }

  async function handleCheckout(plan: "starter" | "standard") {
    setStartingCheckout(plan);
    setBillingPortalError("");

    try {
      const response = await billingApi.createCheckoutSession({ plan });
      analyticsApi.track("stripe_checkout_started", { plan });
      window.location.assign(response.url);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setStartingCheckout(null);
    }
  }

  async function handleBillingPortal() {
    setOpeningPortal(true);
    setBillingPortalError("");

    try {
      const response = await billingApi.createBillingPortalSession();
      analyticsApi.track("stripe_billing_portal_opened");
      window.location.assign(response.url);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBillingPortalError(message);
      onToast(message);
    } finally {
      setOpeningPortal(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Workspace access"
        title="Plan"
        detail="Review the current workspace access level and choose a plan when you are ready to activate a paid account."
        action={<PrimaryButton onClick={() => { window.location.href = "/pricing"; }}>View pricing</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Current access" eyebrow="Trial workspace">
          <div className="grid gap-4 md:grid-cols-3">
            <PlanMetric label="Selected plan" value={trial.isExpired ? "Trial ended" : planLabel} />
            <PlanMetric label="Trial remaining" value={trial.label} />
            <PlanMetric label="Payments" value={company?.stripeCustomerId ? "Stripe connected" : "Stripe-ready"} />
          </div>
          {checkoutStatus === "success" && (
            <div className="mt-5 rounded-lg border border-good/20 bg-good-soft p-4 text-sm font-bold text-good">
              Checkout completed. Your subscription will be reflected after payment confirmation is processed.
            </div>
          )}
          {checkoutStatus === "cancelled" && (
            <div className="mt-5 rounded-lg border border-warning/20 bg-warning-soft p-4 text-sm font-bold text-warning">
              Checkout was cancelled. Your trial access is unchanged.
            </div>
          )}
          <div className="mt-5 rounded-lg border border-line bg-panel-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-lg font-extrabold">Hosted Stripe checkout</strong>
                <p className="mt-1 text-sm leading-6 text-quiet">Starter and Standard can open a secure Stripe Checkout session when billing keys and price IDs are configured. Manual activation remains available as a fallback.</p>
              </div>
              <span className="rounded-full bg-good-soft px-3 py-1.5 text-sm font-extrabold text-good">Secure checkout</span>
            </div>
          </div>
        </Panel>

        <Panel title="Upgrade path" eyebrow="Next step">
          <div className="grid gap-3 text-sm leading-6 text-quiet">
            <p>Use Starter at $49/mo for core audits, or Standard at $89/mo for AI reports and action drafts.</p>
            {requestedPlan && (
              <div className="rounded-lg border border-good/20 bg-good-soft p-3 text-sm font-bold text-good">
                Upgrade requested for {requestedPlan === "starter" ? "Starter" : requestedPlan === "standard" ? "Standard" : "Custom"}. Founder will contact you soon.
              </div>
            )}
            {billingPortalError && (
              <div className="rounded-lg border border-warning/20 bg-warning-soft p-3 text-sm font-bold text-warning">
                {billingPortalError}
              </div>
            )}
            <div className="grid gap-2">
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(isStartingCheckout)} type="button" onClick={() => handleCheckout("starter")}>
                {isStartingCheckout === "starter" ? "Opening checkout..." : "Start Starter checkout"}
              </button>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(isStartingCheckout)} type="button" onClick={() => handleCheckout("standard")}>
                {isStartingCheckout === "standard" ? "Opening checkout..." : "Start Standard checkout"}
              </button>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={isOpeningPortal} type="button" onClick={handleBillingPortal}>
                {isOpeningPortal ? "Opening billing..." : "Manage billing"}
              </button>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={isRequestingUpgrade} type="button" onClick={() => handleUpgradeRequest("custom")}>
                Request custom plan
              </button>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={isRequestingUpgrade} type="button" onClick={() => handleUpgradeRequest("standard")}>
                {isRequestingUpgrade ? "Requesting..." : "Request manual activation"}
              </button>
            </div>
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => { window.location.href = "/pricing"; }}>
              Compare plans
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Billing trust controls" eyebrow="Stripe checkout">
        <div className="grid gap-3 md:grid-cols-3">
          {["Hosted payment page", "Stripe customer record", "Plan-based feature limits"].map((item) => (
            <div className="rounded-lg border border-line bg-panel-subtle p-4" key={item}>
              <strong className="block text-sm font-extrabold">{item}</strong>
              <p className="mt-2 text-sm leading-6 text-quiet">Keeps card collection outside AutoAudit while preserving the current workspace plan controls.</p>
            </div>
          ))}
          </div>
      </Panel>

      <Panel title="Current limits" eyebrow={`${planLabel} limits`}>
        <div className="grid gap-3 md:grid-cols-4">
          <UsageMeter label="Vendors" used={usage.vendors} limit={limits.vendors} />
          <UsageMeter label="Reports" used={usage.reports} limit={limits.reports} />
          <UsageMeter label="AI emails" used={usage.aiEmails} limit={limits.aiEmails} />
          <UsageMeter label="AI analysis" used={usage.vendorAnalyses} limit={limits.vendorAnalyses} />
        </div>
        <div className="mt-4 rounded-lg border border-warning/20 bg-warning-soft p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold leading-6 text-warning">Hit a limit? Upgrade to Standard for higher limits and AI workflows.</p>
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isRequestingUpgrade} onClick={() => handleUpgradeRequest("standard")}>
              Request Standard upgrade
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TrialStatusBanner({
  company,
  isLoadingDemo,
  vendorCount,
  onLoadDemoData,
  onNavigate,
}: {
  company: ApiCompany;
  isLoadingDemo: boolean;
  vendorCount: number;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}) {
  const trial = getTrialState(company);
  const planLabel = formatPlanLabel(company.plan);
  const limits = getPlanLimitSet(company);
  const usage = getPlanUsage(company, vendorCount);

  return (
    <div className="mb-4 grid gap-4 rounded-lg border border-line bg-panel p-4 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">{trial.isExpired ? "Trial ended" : planLabel}</p>
          <strong className="mt-1 block text-lg font-extrabold">{trial.label}</strong>
          <p className="mt-1 text-sm leading-6 text-quiet">
            {trial.isExpired ? "Choose a plan to continue using AutoAudit.ai." : `You are testing ${planLabel}. Paid activation is manual until payments are connected.`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {vendorCount === 0 && !trial.isExpired && (
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isLoadingDemo} onClick={onLoadDemoData}>
              {isLoadingDemo ? "Loading..." : "Load sample data"}
            </button>
          )}
          {trial.isExpired && (
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand" type="button" onClick={() => window.location.assign("/contact")}>
              Request custom plan
            </button>
          )}
          {trial.isExpired && (
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand" type="button" onClick={() => window.location.assign("/pricing")}>
              View pricing
            </button>
          )}
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => onNavigate("billing")}>
            {trial.isExpired ? "Choose plan" : "Review plan"}
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <UsageMeter label="Vendors" used={usage.vendors} limit={limits.vendors} compact />
        <UsageMeter label="Reports" used={usage.reports} limit={limits.reports} compact />
        <UsageMeter label="AI emails" used={usage.aiEmails} limit={limits.aiEmails} compact />
      </div>
    </div>
  );
}

function EmailVerificationBanner({ email, onResend }: { email: string; onResend: () => void }) {
  return (
    <div className="mb-4 rounded-lg border border-warning/20 bg-warning-soft p-4 text-warning">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <strong className="block text-sm font-extrabold">Verify your email</strong>
          <span className="mt-1 block text-sm leading-6">A verification link was sent to {email}. Verify it to keep account recovery reliable.</span>
        </div>
        <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-3 text-sm font-extrabold text-warning transition hover:-translate-y-0.5" type="button" onClick={onResend}>
          Resend link
        </button>
      </div>
    </div>
  );
}

function ProfileAvatarPanel({ company, user, onToast, onUserUpdate }: { company: ApiCompany; user: ApiUser; onToast: (message: string) => void; onUserUpdate: (user: ApiUser) => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setUploading] = useState(false);
  const uploadedAvatarUrl = user.avatarUrl ? resolveApiAssetUrl(user.avatarUrl) : "";
  const gravatarUrl = getGravatarUrl(user.email);
  const avatarUrl = uploadedAvatarUrl || gravatarUrl;
  const isUsingGravatar = !uploadedAvatarUrl;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      onToast("Use a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onToast("Avatar image must be 2MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const imageData = await readFileAsDataUrl(file);
      const nextUser = await profileApi.uploadAvatar(imageData);
      onUserUpdate(nextUser);
      onToast("Profile image updated.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    try {
      const nextUser = await profileApi.removeAvatar();
      onUserUpdate(nextUser);
      onToast("Profile image removed.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Panel title="Profile" eyebrow="Account identity">
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-line/55 bg-panel-subtle/60 p-3">
        <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-strong">
          <i className="fa-solid fa-user text-[15px]" aria-hidden="true" />
        </span>
        <div>
          <strong className="block text-sm font-extrabold">Profile identity</strong>
          <span className="mt-0.5 block text-xs font-bold text-quiet">Profile photo with upload and Gravatar fallback.</span>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative size-24 shrink-0">
            <div className="size-full overflow-hidden rounded-full border border-brand/25 bg-brand-soft shadow-[0_18px_44px_rgb(var(--color-brand)/0.14)]">
              {avatarUrl ? (
                <img className="size-full object-cover" src={avatarUrl} alt={`${user.name} avatar`} />
              ) : (
                <span className="grid size-full place-items-center text-3xl font-extrabold text-brand-strong">{initials(user.name)}</span>
              )}
            </div>
            <input className="hidden" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} />
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-2xl font-extrabold">{user.name}</h3>
            <p className="mt-1 text-sm text-quiet">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-strong">{formatPlanLabel(company.plan)}</span>
              <span className="rounded-full bg-panel-subtle px-2.5 py-1 text-quiet">{isUsingGravatar ? "Using Gravatar" : "Uploaded photo"}</span>
            </div>
            {isUsingGravatar && (
              <p className="mt-3 text-xs font-bold leading-5 text-quiet">
                Using Gravatar from your email hash. Manage it at{" "}
                <a className="text-brand-strong underline-offset-4 hover:underline" href="https://gravatar.com" target="_blank" rel="noreferrer">
                  gravatar.com
                </a>.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line/55 bg-panel-subtle/72 p-4">
          <div className="flex items-center gap-2 text-brand-strong">
            <Camera aria-hidden="true" size={18} />
            <strong className="text-sm">Profile photo</strong>
          </div>
          <p className="mt-3 text-sm leading-6 text-quiet">
            Upload a JPEG, PNG, or WebP image up to 2MB. AutoAudit resizes it to a clean 200x200 profile image. Removing your photo falls back to Gravatar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => fileInputRef.current?.click()}>
              <ImageIcon aria-hidden="true" size={16} />
              {isUploading ? "Uploading..." : "Upload photo"}
            </PrimaryButton>
            <SecondaryButton onClick={handleRemoveAvatar}>
              <Trash2 aria-hidden="true" size={16} />
              Remove photo
            </SecondaryButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ModalFrame({ children, eyebrow, title, onClose }: { children: ReactNode; eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-inverse/70 px-3 py-6 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="max-h-[calc(100vh-48px)] w-full max-w-4xl overflow-auto rounded-xl border border-line/70 bg-panel p-5 shadow-2xl animate-[fadeIn_220ms_ease-out]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-brand-strong">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-extrabold">{title}</h2>
          </div>
          <button className="grid size-9 shrink-0 place-items-center rounded-lg text-quiet transition hover:bg-panel-muted hover:text-ink" type="button" onClick={onClose} aria-label="Close modal">
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function getGravatarUrl(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return "";

  return `https://www.gravatar.com/avatar/${md5(normalizedEmail)}?d=identicon`;
}

function md5(value: string) {
  function rotateLeft(input: number, shift: number) {
    return (input << shift) | (input >>> (32 - shift));
  }

  function addUnsigned(first: number, second: number) {
    const firstHigh = first & 0x80000000;
    const secondHigh = second & 0x80000000;
    const firstLow = first & 0x40000000;
    const secondLow = second & 0x40000000;
    const result = (first & 0x3fffffff) + (second & 0x3fffffff);

    if (firstLow & secondLow) return result ^ 0x80000000 ^ firstHigh ^ secondHigh;
    if (firstLow | secondLow) return result & 0x40000000 ? result ^ 0xc0000000 ^ firstHigh ^ secondHigh : result ^ 0x40000000 ^ firstHigh ^ secondHigh;
    return result ^ firstHigh ^ secondHigh;
  }

  function transformF(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function transformG(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function transformH(x: number, y: number, z: number) { return x ^ y ^ z; }
  function transformI(x: number, y: number, z: number) { return y ^ (x | ~z); }

  function roundF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, transformF(b, c, d)), addUnsigned(x, ac)), s), b);
  }

  function roundG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, transformG(b, c, d)), addUnsigned(x, ac)), s), b);
  }

  function roundH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, transformH(b, c, d)), addUnsigned(x, ac)), s), b);
  }

  function roundI(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, transformI(b, c, d)), addUnsigned(x, ac)), s), b);
  }

  function toWords(input: string) {
    const wordArray: number[] = [];
    const length = input.length;
    const wordCount = (((length + 8) - ((length + 8) % 64)) / 64 + 1) * 16;
    for (let index = 0; index < wordCount; index += 1) wordArray[index] = 0;
    for (let index = 0; index < length; index += 1) {
      wordArray[index >> 2] |= input.charCodeAt(index) << ((index % 4) * 8);
    }
    wordArray[length >> 2] |= 0x80 << ((length % 4) * 8);
    wordArray[wordCount - 2] = length << 3;
    wordArray[wordCount - 1] = length >>> 29;
    return wordArray;
  }

  function toHex(input: number) {
    let output = "";
    for (let index = 0; index <= 3; index += 1) {
      output += (`0${((input >>> (index * 8)) & 255).toString(16)}`).slice(-2);
    }
    return output;
  }

  const words = toWords(unescape(encodeURIComponent(value)));
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let k = 0; k < words.length; k += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = roundF(a, b, c, d, words[k + 0], 7, 0xd76aa478); d = roundF(d, a, b, c, words[k + 1], 12, 0xe8c7b756); c = roundF(c, d, a, b, words[k + 2], 17, 0x242070db); b = roundF(b, c, d, a, words[k + 3], 22, 0xc1bdceee);
    a = roundF(a, b, c, d, words[k + 4], 7, 0xf57c0faf); d = roundF(d, a, b, c, words[k + 5], 12, 0x4787c62a); c = roundF(c, d, a, b, words[k + 6], 17, 0xa8304613); b = roundF(b, c, d, a, words[k + 7], 22, 0xfd469501);
    a = roundF(a, b, c, d, words[k + 8], 7, 0x698098d8); d = roundF(d, a, b, c, words[k + 9], 12, 0x8b44f7af); c = roundF(c, d, a, b, words[k + 10], 17, 0xffff5bb1); b = roundF(b, c, d, a, words[k + 11], 22, 0x895cd7be);
    a = roundF(a, b, c, d, words[k + 12], 7, 0x6b901122); d = roundF(d, a, b, c, words[k + 13], 12, 0xfd987193); c = roundF(c, d, a, b, words[k + 14], 17, 0xa679438e); b = roundF(b, c, d, a, words[k + 15], 22, 0x49b40821);

    a = roundG(a, b, c, d, words[k + 1], 5, 0xf61e2562); d = roundG(d, a, b, c, words[k + 6], 9, 0xc040b340); c = roundG(c, d, a, b, words[k + 11], 14, 0x265e5a51); b = roundG(b, c, d, a, words[k + 0], 20, 0xe9b6c7aa);
    a = roundG(a, b, c, d, words[k + 5], 5, 0xd62f105d); d = roundG(d, a, b, c, words[k + 10], 9, 0x02441453); c = roundG(c, d, a, b, words[k + 15], 14, 0xd8a1e681); b = roundG(b, c, d, a, words[k + 4], 20, 0xe7d3fbc8);
    a = roundG(a, b, c, d, words[k + 9], 5, 0x21e1cde6); d = roundG(d, a, b, c, words[k + 14], 9, 0xc33707d6); c = roundG(c, d, a, b, words[k + 3], 14, 0xf4d50d87); b = roundG(b, c, d, a, words[k + 8], 20, 0x455a14ed);
    a = roundG(a, b, c, d, words[k + 13], 5, 0xa9e3e905); d = roundG(d, a, b, c, words[k + 2], 9, 0xfcefa3f8); c = roundG(c, d, a, b, words[k + 7], 14, 0x676f02d9); b = roundG(b, c, d, a, words[k + 12], 20, 0x8d2a4c8a);

    a = roundH(a, b, c, d, words[k + 5], 4, 0xfffa3942); d = roundH(d, a, b, c, words[k + 8], 11, 0x8771f681); c = roundH(c, d, a, b, words[k + 11], 16, 0x6d9d6122); b = roundH(b, c, d, a, words[k + 14], 23, 0xfde5380c);
    a = roundH(a, b, c, d, words[k + 1], 4, 0xa4beea44); d = roundH(d, a, b, c, words[k + 4], 11, 0x4bdecfa9); c = roundH(c, d, a, b, words[k + 7], 16, 0xf6bb4b60); b = roundH(b, c, d, a, words[k + 10], 23, 0xbebfbc70);
    a = roundH(a, b, c, d, words[k + 13], 4, 0x289b7ec6); d = roundH(d, a, b, c, words[k + 0], 11, 0xeaa127fa); c = roundH(c, d, a, b, words[k + 3], 16, 0xd4ef3085); b = roundH(b, c, d, a, words[k + 6], 23, 0x04881d05);
    a = roundH(a, b, c, d, words[k + 9], 4, 0xd9d4d039); d = roundH(d, a, b, c, words[k + 12], 11, 0xe6db99e5); c = roundH(c, d, a, b, words[k + 15], 16, 0x1fa27cf8); b = roundH(b, c, d, a, words[k + 2], 23, 0xc4ac5665);

    a = roundI(a, b, c, d, words[k + 0], 6, 0xf4292244); d = roundI(d, a, b, c, words[k + 7], 10, 0x432aff97); c = roundI(c, d, a, b, words[k + 14], 15, 0xab9423a7); b = roundI(b, c, d, a, words[k + 5], 21, 0xfc93a039);
    a = roundI(a, b, c, d, words[k + 12], 6, 0x655b59c3); d = roundI(d, a, b, c, words[k + 3], 10, 0x8f0ccc92); c = roundI(c, d, a, b, words[k + 10], 15, 0xffeff47d); b = roundI(b, c, d, a, words[k + 1], 21, 0x85845dd1);
    a = roundI(a, b, c, d, words[k + 8], 6, 0x6fa87e4f); d = roundI(d, a, b, c, words[k + 15], 10, 0xfe2ce6e0); c = roundI(c, d, a, b, words[k + 6], 15, 0xa3014314); b = roundI(b, c, d, a, words[k + 13], 21, 0x4e0811a1);
    a = roundI(a, b, c, d, words[k + 4], 6, 0xf7537e82); d = roundI(d, a, b, c, words[k + 11], 10, 0xbd3af235); c = roundI(c, d, a, b, words[k + 2], 15, 0x2ad7d2bb); b = roundI(b, c, d, a, words[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return `${toHex(a)}${toHex(b)}${toHex(c)}${toHex(d)}`.toLowerCase();
}

function TeamPage({ currentUser, onActivityRefresh, onToast }: { currentUser: ApiUser | null; onActivityRefresh: () => Promise<void>; onToast: (message: string) => void }) {
  const [members, setMembers] = useState<ApiTeamMember[]>([]);
  const [invites, setInvites] = useState<ApiTeamInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isOwner = currentUser?.role === "owner";

  const loadTeam = async () => {
    setLoading(true);
    setError("");

    try {
      const [nextMembers, nextInvites] = await Promise.all([teamApi.members(), teamApi.invites()]);
      setMembers(nextMembers);
      setInvites(nextInvites);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("inviteToken");
    if (!inviteToken) return;
    const token = inviteToken;

    async function acceptInvite() {
      try {
        await teamApi.acceptInvite(token);
        onToast("Invite accepted. Workspace access updated.");
        params.delete("inviteToken");
        window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
        await loadTeam();
      } catch (err) {
        setError(getApiErrorMessage(err));
      }
    }

    acceptInvite();
  }, [onToast]);

  const handleInvite = async () => {
    setSubmitting(true);
    setError("");

    try {
      const invite = await teamApi.invite({ email, role });
      setInvites((current) => [invite, ...current]);
      setEmail("");
      setRole("member");
      await onActivityRefresh();
      onToast("Invite sent.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (member: ApiTeamMember, nextRole: TeamRole) => {
    try {
      const updated = await teamApi.updateRole(member.id, nextRole);
      setMembers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await onActivityRefresh();
      onToast("Role updated.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleRemove = async (member: ApiTeamMember) => {
    try {
      await teamApi.removeMember(member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      await onActivityRefresh();
      onToast("Member removed.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleCancelInvite = async (invite: ApiTeamInvite) => {
    try {
      await teamApi.cancelInvite(invite.id);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
      onToast("Invite cancelled.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Team access" title="Manage workspace members" detail="Invite finance, operations, and procurement teammates into this company workspace with role-based access." action={<Users aria-hidden="true" className="text-brand" size={24} />} />
      {error && <ErrorState message={error} onRetry={loadTeam} />}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)]">
        <Panel title="Members" eyebrow="Workspace roster">
          {isLoading ? (
            <LoadingState label="Loading team" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs font-extrabold uppercase text-quiet">
                  <tr className="border-b border-line">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Joined</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr className="border-b border-line/60 last:border-0" key={member.id}>
                      <td className="px-3 py-3 font-extrabold">{member.name}</td>
                      <td className="px-3 py-3 text-quiet">{member.email}</td>
                      <td className="px-3 py-3">
                        {isOwner && member.role !== "owner" ? (
                          <select className="rounded-lg border border-line bg-panel-subtle px-3 py-2 text-sm font-bold text-ink outline-none" value={member.role} onChange={(event) => handleRoleChange(member, event.target.value as TeamRole)}>
                            {teamRoleOptions.map((option) => (
                              <option key={option} value={option}>{formatTeamRole(option)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{formatTeamRole(member.role)}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-quiet">{formatShortDate(member.joinedAt)}</td>
                      <td className="px-3 py-3 text-right">
                        {isOwner && member.role !== "owner" && member.id !== (currentUser?.id ?? currentUser?._id) && (
                          <button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-3 text-xs font-extrabold text-risk transition hover:-translate-y-0.5" type="button" onClick={() => handleRemove(member)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel title="Invite teammate" eyebrow="New access" action={<UserPlus aria-hidden="true" className="text-brand" size={22} />}>
            <div className="grid gap-3">
              <Field label="Email">
                <input className="input" type="email" value={email} placeholder="teammate@company.com" onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Role">
                <select className="input" value={role} onChange={(event) => setRole(event.target.value as TeamRole)}>
                  {teamRoleOptions.map((option) => (
                    <option key={option} value={option}>{formatTeamRole(option)}</option>
                  ))}
                </select>
              </Field>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isSubmitting || !email.trim()} onClick={handleInvite}>
                {isSubmitting ? "Sending..." : "Send invite"}
              </button>
            </div>
          </Panel>

          <Panel title="Pending invites" eyebrow="Awaiting acceptance">
            <div className="grid gap-3">
              {invites.length === 0 && <p className="text-sm leading-6 text-quiet">No pending invites.</p>}
              {invites.map((invite) => (
                <div className="rounded-lg border border-line/55 bg-panel-subtle/72 p-3" key={invite.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-extrabold">{invite.email}</strong>
                      <span className="mt-1 block text-xs text-quiet">{formatTeamRole(invite.role)} - expires {formatShortDate(invite.expiresAt)}</span>
                    </div>
                    <button className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold text-quiet transition hover:border-risk hover:text-risk" type="button" onClick={() => handleCancelInvite(invite)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const activityFilters: Array<{ value: ActivityEntityType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "vendor", label: "Vendors" },
  { value: "action_item", label: "Actions" },
  { value: "report", label: "Reports" },
  { value: "savings", label: "Savings" },
  { value: "team", label: "Team" },
];

function ActivityPage({
  activity,
  filter,
  pagination,
  onFilterChange,
  onPageChange,
}: {
  activity: ApiActivityLog[];
  filter: ActivityEntityType | "all";
  pagination: PaginationMeta | null;
  onFilterChange: (filter: ActivityEntityType | "all") => void;
  onPageChange: (page: number) => Promise<unknown>;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Workspace history" title="Activity feed" detail="Review the human decisions and system actions that changed this workspace." action={<ListChecks aria-hidden="true" className="text-brand" size={24} />} />
      <Panel title="Chronological feed" eyebrow={`${pagination?.total ?? activity.length} workspace event${(pagination?.total ?? activity.length) === 1 ? "" : "s"}`}>
        <div className="mb-4 flex flex-wrap gap-2">
          {activityFilters.map((option) => (
            <button className={`rounded-lg border px-3 py-2 text-sm font-extrabold transition hover:-translate-y-0.5 ${filter === option.value ? "border-brand bg-brand text-white" : "border-line bg-panel-subtle text-quiet hover:border-brand hover:text-brand"}`} key={option.value} type="button" onClick={() => onFilterChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>

        {activity.length === 0 ? (
          <EmptyState title="No activity yet" detail="Workspace actions will appear here as vendors, reports, savings, and team changes are made." icon={ListChecks} />
        ) : (
          <div className="grid gap-3">
            {activity.map((item) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4" key={item._id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{formatActivityEntityType(item.entityType)}</span>
                      <span className="text-xs font-bold text-quiet">{formatRelativeTimestamp(item.createdAt)}</span>
                    </div>
                    <strong className="mt-3 block text-sm font-extrabold">{formatActivityDescription(item)}</strong>
                    <p className="mt-1 text-sm leading-6 text-quiet">{item.entityName ?? "Workspace"} by {item.userEmail ?? "Team member"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-extrabold text-quiet disabled:opacity-50" disabled={!pagination.hasPreviousPage} type="button" onClick={() => onPageChange(pagination.page - 1)}>
              Previous
            </button>
            <span className="text-sm font-bold text-quiet">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-extrabold text-quiet disabled:opacity-50" disabled={!pagination.hasNextPage} type="button" onClick={() => onPageChange(pagination.page + 1)}>
              Next
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function SavingsPage({
  entries,
  summary,
  currentUser,
  onDelete,
  onDismiss,
  onRealize,
}: {
  entries: ApiSavingsEntry[];
  summary: SavingsSummary | null;
  currentUser: ApiUser | null;
  onDelete: (entry: ApiSavingsEntry) => Promise<void>;
  onDismiss: (entry: ApiSavingsEntry, reason: string) => Promise<void>;
  onRealize: (entry: ApiSavingsEntry, realizedMonthlySavings: number) => Promise<void>;
}) {
  const chartData = buildRealizedSavingsTimeline(entries);
  const canDelete = currentUser?.role === "owner" || currentUser?.role === "admin";
  const identified = entries.filter((entry) => entry.status === "identified");
  const inProgress = entries.filter((entry) => entry.status === "in_progress");
  const realized = entries.filter((entry) => entry.status === "realized");

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="ROI evidence"
        title={`AutoAudit has helped you realize ${currency(summary?.totalRealizedAnnualSavings ?? 0)} in savings this year`}
        detail="Separate estimates from expected actions and invoice-confirmed savings so finance can see exactly what moved from signal to outcome."
        action={<CircleDollarSign aria-hidden="true" className="text-brand" size={24} />}
      />
      <section className="grid gap-3 sm:grid-cols-4">
        <PlanMetric label="Identified annual savings" value={currency(summary?.totalEstimatedAnnualSavings ?? 0)} />
        <PlanMetric label="Expected annual savings" value={currency(summary?.totalExpectedAnnualSavings ?? 0)} />
        <PlanMetric label="Realized annual savings" value={currency(summary?.totalRealizedAnnualSavings ?? 0)} />
        <PlanMetric label="AutoAudit ROI" value={`${summary?.AutoAuditROI ?? 0}x`} />
      </section>

      <div className="rounded-lg border border-good/20 bg-good-soft p-4 text-good">
        <strong className="block text-sm font-extrabold">
          You're getting {currency(summary?.AutoAuditROI ?? 0)} back for every $1 you spend on AutoAudit.
        </strong>
        <p className="mt-1 text-sm font-bold leading-6">
          Realized savings are only counted after the user confirms the actual invoice reduction.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <SavingsColumn title="Identified" eyebrow="Estimated" entries={identified} empty="No open savings signals." amountForEntry={(entry) => entry.estimatedAnnualSavings} onDelete={canDelete ? onDelete : undefined} onDismiss={onDismiss} />
        <SavingsColumn title="In Progress" eyebrow="Expected" entries={inProgress} empty="No savings under review." amountForEntry={(entry) => (entry.expectedMonthlySavings ?? entry.estimatedMonthlySavings) * 12} onDelete={canDelete ? onDelete : undefined} onDismiss={onDismiss} onRealize={onRealize} />
        <SavingsColumn title="Realized" eyebrow="Confirmed" entries={realized} empty="No realized savings yet." amountForEntry={(entry) => (entry.realizedMonthlySavings ?? 0) * 12} onDelete={canDelete ? onDelete : undefined} />
      </section>

      <Panel title="Realized savings timeline" eyebrow="Month over month">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 320 }}>
            <LineChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#dce4e8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#66747d", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: "#66747d", fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="cumulativeAnnualSavings" name="Cumulative annual savings" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function SavingsColumn({
  title,
  eyebrow,
  entries,
  empty,
  amountForEntry,
  onDelete,
  onDismiss,
  onRealize,
}: {
  title: string;
  eyebrow: string;
  entries: ApiSavingsEntry[];
  empty: string;
  amountForEntry: (entry: ApiSavingsEntry) => number;
  onDelete?: (entry: ApiSavingsEntry) => Promise<void>;
  onDismiss?: (entry: ApiSavingsEntry, reason: string) => Promise<void>;
  onRealize?: (entry: ApiSavingsEntry, realizedMonthlySavings: number) => Promise<void>;
}) {
  const total = entries.reduce((sum, entry) => sum + amountForEntry(entry), 0);

  return (
    <Panel title={title} eyebrow={`${eyebrow} · ${currency(total)}`}>
      <div className="grid gap-3">
        {entries.length === 0 && <EmptyState title={empty} detail="Savings will appear here as waste findings move through review and confirmation." />}
        {entries.map((entry) => (
          <article className="rounded-lg border border-line bg-panel-subtle p-4" key={entry.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{formatSavingsSignalType(entry.signalType)}</span>
                <h3 className="mt-3 text-sm font-extrabold">{entry.vendorName}</h3>
                <p className="mt-1 text-xs font-bold text-quiet">{entry.notes || nextSavingsStep(entry)}</p>
              </div>
              <strong className="text-sm font-extrabold text-good">{currency(amountForEntry(entry))}</strong>
            </div>
            {entry.evidence && entry.evidence.length > 0 && (
              <div className="mt-3 grid gap-1">
                {entry.evidence.slice(0, 2).map((item) => (
                  <span className="text-xs font-bold text-quiet" key={`${entry.id}-${item.type}-${item.value}`}>{item.value}</span>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {onRealize && (
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-lg bg-brand px-3 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong"
                  type="button"
                  onClick={() => {
                    const value = window.prompt("Actual monthly savings confirmed on the next invoice?", String(entry.expectedMonthlySavings ?? entry.estimatedMonthlySavings ?? 0));
                    if (!value) return;
                    const amount = Number(value);
                    if (Number.isFinite(amount) && amount > 0) onRealize(entry, amount);
                  }}
                >
                  Mark realized
                </button>
              )}
              {onDismiss && (
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-panel px-3 text-xs font-extrabold text-ink transition hover:border-brand hover:text-brand"
                  type="button"
                  onClick={() => {
                    const reason = window.prompt("Why should this savings opportunity be dismissed?");
                    if (reason?.trim()) onDismiss(entry, reason.trim());
                  }}
                >
                  Dismiss
                </button>
              )}
              {onDelete && (
                <button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-3 text-xs font-extrabold text-risk transition hover:-translate-y-0.5" type="button" onClick={() => onDelete(entry)}>
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function EvidenceCard({ signal }: { signal: WasteSignal }) {
  const rows = buildEvidenceRows(signal);
  const tone = signal.impact <= 0 ? "good" : signal.impact < 12000 ? "warning" : "risk";

  return (
    <div className={`mt-4 rounded-lg border p-4 ${tone === "risk" ? "border-risk/20 bg-risk-soft/50" : tone === "warning" ? "border-warning/25 bg-warning-soft/50" : "border-good/20 bg-good-soft/50"}`}>
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-brand-strong">
        <ShieldCheck aria-hidden="true" size={15} />
        Why flagged
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-panel px-3 py-2" key={row.label}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${metricTone(row.tone ?? tone)}`}>
                <Icon aria-hidden="true" size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase text-quiet">{row.label}</span>
                <strong className="block truncate text-sm font-extrabold">{row.value}</strong>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-bold text-quiet">Evidence verified from your vendor data.</p>
    </div>
  );
}

function buildEvidenceRows(signal: WasteSignal): Array<{ icon: LucideIcon; label: string; value: string; tone?: string }> {
  if (signal.type === "Zombie app") {
    return [
      { icon: CalendarClock, label: "Last used", value: evidenceValue(signal.evidence, /last.*?(\d+\s+days? ago|today|yesterday|no usage)/i) ?? "No recent usage", tone: "risk" },
      { icon: CircleDollarSign, label: "Monthly spend", value: currency(Math.round(signal.impact / 12)), tone: signal.impact > 0 ? "risk" : "good" },
      { icon: BadgeDollarSign, label: "Annual exposure", value: currency(signal.impact), tone: signal.impact > 0 ? "risk" : "good" },
    ];
  }

  if (signal.type === "Unused seats") {
    const unused = evidenceValue(signal.evidence, /(\d+)\s+unused/i) ?? evidenceValue(signal.evidence, /(\d+)\s+of\s+\d+/i) ?? "Review";
    const seats = evidenceValue(signal.evidence, /(\d+\s+of\s+\d+[^.]+)/i) ?? "Seat data available";
    return [
      { icon: Users, label: "Seats purchased", value: seats },
      { icon: CheckCircle2, label: "Active seats", value: seats.includes(" of ") ? seats.split(" of ")[0] : "Tracked" },
      { icon: AlertTriangle, label: "Unused count", value: unused, tone: "warning" },
      { icon: CircleDollarSign, label: "Cost per seat", value: "Derived from spend" },
      { icon: BadgeDollarSign, label: "Annual waste", value: currency(signal.impact), tone: signal.impact > 0 ? "warning" : "good" },
    ];
  }

  if (signal.type === "Duplicate tool") {
    return [
      { icon: Inbox, label: "Category", value: signal.vendor },
      { icon: ListChecks, label: "Overlapping tools", value: signal.evidence.find((item) => item.includes(",")) ?? "Multiple vendors" },
      { icon: BadgeDollarSign, label: "Annual overlap cost", value: currency(signal.impact), tone: signal.impact > 0 ? "warning" : "good" },
    ];
  }

  return [
    { icon: CalendarClock, label: "Renewal date", value: evidenceValue(signal.evidence, /renewal date is ([^.]+)/i) ?? "Tracked" },
    { icon: CalendarClock, label: "Days remaining", value: signal.evidence.find((item) => /days/i.test(item)) ?? "Review window" },
    { icon: CircleDollarSign, label: "Contract value", value: currency(signal.impact), tone: signal.impact > 0 ? "risk" : "good" },
    { icon: Users, label: "Owner", value: "Assigned owner" },
  ];
}

function evidenceValue(evidence: string[], pattern: RegExp) {
  for (const item of evidence) {
    const match = item.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function ConfirmSavingModal({ signal, onClose, onConfirm }: { signal: WasteSignal; onClose: () => void; onConfirm: (input: { signal: WasteSignal; savingsType: SavingsType; monthlySavings: number; notes?: string }) => Promise<void> }) {
  const [monthlySavings, setMonthlySavings] = useState(Math.max(1, Math.round(signal.impact / 12)));
  const [savingsType, setSavingsType] = useState<SavingsType>(defaultSavingsTypeForSignal(signal));
  const [notes, setNotes] = useState("");
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setSaving(true);
    setError("");

    try {
      await onConfirm({ signal, savingsType, monthlySavings, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame title="Confirm saving" eyebrow={signal.vendor} onClose={onClose}>
      <div className="grid gap-4">
        {error && <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk">{error}</div>}
        <div className="rounded-lg border border-line bg-panel-subtle p-4">
          <span className="text-xs font-extrabold uppercase text-quiet">Estimated annual impact</span>
          <strong className="mt-1 block text-2xl font-extrabold">{currency(signal.impact)}</strong>
        </div>
        <Field label="Actual monthly savings">
          <input className="input" min="1" type="number" value={monthlySavings} onChange={(event) => setMonthlySavings(Number(event.target.value || 0))} />
        </Field>
        <Field label="Savings type">
          <select className="input" value={savingsType} onChange={(event) => setSavingsType(event.target.value as SavingsType)}>
            {savingsTypeOptions.map((option) => (
              <option key={option} value={option}>{formatSavingsType(option)}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className="input min-h-24 resize-y" value={notes} placeholder="Contract cancelled, seats reduced, or renewal renegotiated..." onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isSaving || monthlySavings <= 0} onClick={handleConfirm}>
          {isSaving ? "Confirming..." : "Confirm saving"}
        </button>
      </div>
    </ModalFrame>
  );
}

const teamRoleOptions: TeamRole[] = ["viewer", "member", "admin"];

const savingsTypeOptions: SavingsType[] = ["cancelled", "renegotiated", "seat_reduced", "other"];

function formatTeamRole(role: ApiUser["role"] | TeamRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatSavingsType(type: SavingsType | string) {
  const labels: Record<string, string> = {
    cancelled: "Cancelled",
    renegotiated: "Renegotiated",
    seat_reduced: "Seat reduced",
    other: "Other",
    zombie: "Zombie app",
    unused_seats: "Unused seats",
    duplicate_tool: "Duplicate tool",
    negotiated_rate: "Negotiated rate",
  };

  return labels[type] ?? String(type).replace(/_/g, " ");
}

function formatSavingsSignalType(type: SavingsSignalType) {
  return formatSavingsType(type);
}

function formatReportType(type: ReportType | undefined) {
  const option = reportTypeOptions.find((item) => item.value === (type ?? "cfo_summary"));
  return option?.label ?? "CFO Summary";
}

function reportAudienceForType(type: ReportType) {
  const audiences: Record<ReportType, string> = {
    cfo_summary: "CFO",
    board_summary: "Board",
    owner_action_list: "Operations owners",
    full_audit: "Finance and operations",
  };

  return audiences[type];
}

function formatActivityEntityType(type: ActivityEntityType) {
  const labels: Record<ActivityEntityType, string> = {
    vendor: "Vendor",
    report: "Report",
    email_draft: "Email draft",
    savings: "Savings",
    team: "Team",
    settings: "Settings",
    action_item: "Action item",
  };

  return labels[type];
}

function formatActivityDescription(activity: ApiActivityLog) {
  const descriptions: Record<string, string> = {
    "vendor.created": "Created vendor",
    "vendor.updated": "Updated vendor",
    "vendor.deleted": "Deleted vendor",
    "vendor.csv_imported": `Completed CSV import${activity.metadata?.count ? ` with ${activity.metadata.count} vendors` : ""}`,
    "report.generated": "Generated report",
    "email_draft.generated": "Generated AI email draft",
    "savings.confirmed": "Confirmed savings",
    "action_item.created": "Created action item",
    "action_item.status_changed": "Updated action status",
    "action_item.assigned": "Assigned action item",
    "action_item.approved": "Approved action item",
    "action_item.rejected": "Rejected action item",
    "action_item.commented": "Commented on action item",
    "action_item.completed": "Completed action item",
    "action_item.deleted": "Deleted action item",
    "team.member_invited": "Invited teammate",
    "team.member_removed": "Removed teammate",
    "team.role_changed": "Changed team role",
    "settings.updated": "Updated company settings",
  };

  return descriptions[activity.action] ?? activity.action.replace(/[._]/g, " ");
}

function formatActionStatus(status: ActionItemStatus) {
  const labels: Record<ActionItemStatus, string> = {
    open: "Open",
    in_progress: "In progress",
    done: "Done",
  };

  return labels[status];
}

function formatApprovalStatus(status: ApiActionItem["approvalStatus"]) {
  const labels = {
    not_required: "No approval needed",
    pending: "Pending approval",
    approved: "Approved",
    rejected: "Rejected",
  } satisfies Record<ApiActionItem["approvalStatus"], string>;

  return labels[status] ?? "No approval needed";
}

function formatRelativeTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function defaultSavingsTypeForSignal(signal: WasteSignal): SavingsType {
  if (signal.type === "Unused seats") return "seat_reduced";
  if (signal.type === "Renewal") return "renegotiated";
  if (signal.type === "Zombie app") return "cancelled";
  return "other";
}

function mapWasteSignalToSavingsSignal(signal: WasteSignal): SavingsSignalType {
  if (signal.type === "Zombie app") return "zombie";
  if (signal.type === "Unused seats") return "unused_seats";
  if (signal.type === "Duplicate tool") return "duplicate_tool";
  return "negotiated_rate";
}

function nextSavingsStep(entry: ApiSavingsEntry) {
  if (entry.status === "identified") return "Review the finding and decide whether to act.";
  if (entry.status === "in_progress") return `Check again ${formatShortDate(entry.nextReviewDate)} after the next billing cycle.`;
  if (entry.status === "realized") return `Confirmed ${formatShortDate(entry.realizedAt ?? entry.confirmedAt)}.`;
  return entry.dismissalReason ?? "Dismissed by the team.";
}

function buildRealizedSavingsTimeline(entries: ApiSavingsEntry[]) {
  const realizedEntries = entries
    .filter((entry) => entry.status === "realized")
    .sort((first, second) => new Date(first.realizedAt ?? first.confirmedAt).getTime() - new Date(second.realizedAt ?? second.confirmedAt).getTime());
  const monthTotals = new Map<string, number>();

  realizedEntries.forEach((entry) => {
    const date = new Date(entry.realizedAt ?? entry.confirmedAt);
    const key = Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(date);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + Number(entry.realizedMonthlySavings ?? 0) * 12);
  });

  let cumulativeAnnualSavings = 0;
  return Array.from(monthTotals.entries()).map(([month, annualSavings]) => {
    cumulativeAnnualSavings += annualSavings;
    return { month, cumulativeAnnualSavings };
  });
}

function SettingsPage({
  company,
  companySettings,
  user,
  vendors,
  onToast,
  onUserUpdate,
  onWorkspaceDeleted,
}: {
  company: ApiCompany | null;
  companySettings: ApiCompany["settings"];
  user: ApiUser | null;
  vendors: ApiVendor[];
  onToast: (message: string) => void;
  onUserUpdate: (user: ApiUser) => void;
  onWorkspaceDeleted: () => void;
}) {
  const [settings, setSettings] = useState(() => {
    return mapCompanySettings(companySettings);
  });
  const [activeSettingsTab, setActiveSettingsTab] = useState<"workspace" | "data">("workspace");
  const [isSaving, setSaving] = useState(false);
  const [contactRequests, setContactRequests] = useState<ApiContactRequest[]>([]);
  const [isLoadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    setSettings(mapCompanySettings(companySettings));
  }, [companySettings]);

  useEffect(() => {
    let isMounted = true;
    setLoadingRequests(true);

    contactApi
      .list({ limit: 6 })
      .then((response) => {
        if (isMounted) setContactRequests(response.contactRequests);
      })
      .catch(() => {
        if (isMounted) setContactRequests([]);
      })
      .finally(() => {
        if (isMounted) setLoadingRequests(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      await profileApi.updateCompanySettings({
        requireCfoApprovalAbove: settings.cfoApproval ? settings.requireCfoApprovalAbove : 0,
        weeklyRenewalDigest: settings.renewalDigest,
        autoDraftCancellationEmails: settings.cancellationEmails,
        allowManagedRenegotiation: settings.managedRenegotiation,
      });
      onToast("Settings saved.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleContactStatus = async (request: ApiContactRequest, status: ApiContactRequest["status"]) => {
    try {
      const updated = await contactApi.updateStatus(request._id, status);
      setContactRequests((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      onToast("Lead status updated.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    }
  };

  return (
    <div className="grid gap-4">
      {user && company && <ProfileAvatarPanel company={company} user={user} onToast={onToast} onUserUpdate={onUserUpdate} />}

      <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-panel p-2">
        {[
          { id: "workspace", label: "Workspace Settings" },
          { id: "data", label: "Data & Privacy" },
        ].map((tab) => (
          <button
            className={`min-h-10 rounded-lg px-4 text-sm font-extrabold transition ${activeSettingsTab === tab.id ? "bg-brand text-white" : "text-quiet hover:bg-panel-muted hover:text-ink"}`}
            key={tab.id}
            type="button"
            onClick={() => setActiveSettingsTab(tab.id as "workspace" | "data")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSettingsTab === "data" && company && <DataPrivacyPanel company={company} currentUser={user} initialVendors={vendors} onToast={onToast} onWorkspaceDeleted={onWorkspaceDeleted} />}

      {activeSettingsTab === "workspace" && (
        <>
      {user && <MfaSettingsPanel user={user} onToast={onToast} onUserUpdate={onUserUpdate} />}
      {user && <SessionsSecurityPanel user={user} onToast={onToast} onUserUpdate={onUserUpdate} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Integrations" eyebrow="Data sources">
          <div className="grid gap-3">
            {integrations.map((integration) => (
              <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel-subtle p-4 sm:flex-row sm:items-center sm:justify-between" key={integration.name}>
                <div>
                  <strong className="block font-extrabold">{integration.name}</strong>
                  <span className="mt-1 block text-sm text-quiet">{integration.detail}</span>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${integration.status === "Available" ? "bg-good-soft text-good" : integration.status === "Coming soon" ? "bg-warning-soft text-warning" : "bg-panel-muted text-quiet"}`}>
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Approval rules" eyebrow="Automation">
          <div className="grid gap-3">
            <Field label="CFO approval threshold">
              <input className="input" min="0" type="number" value={settings.requireCfoApprovalAbove} onChange={(event) => setSettings((current) => ({ ...current, requireCfoApprovalAbove: Number(event.target.value || 0) }))} />
            </Field>
            <ToggleRow title="Require CFO approval above threshold" enabled={settings.cfoApproval} onToggle={() => setSettings((current) => ({ ...current, cfoApproval: !current.cfoApproval }))} />
            <ToggleRow title="Auto-draft cancellation emails" enabled={settings.cancellationEmails} onToggle={() => setSettings((current) => ({ ...current, cancellationEmails: !current.cancellationEmails }))} />
            <ToggleRow title="Send weekly renewal digest" enabled={settings.renewalDigest} onToggle={() => setSettings((current) => ({ ...current, renewalDigest: !current.renewalDigest }))} />
            <ToggleRow title="Allow managed renegotiation" enabled={settings.managedRenegotiation} onToggle={() => setSettings((current) => ({ ...current, managedRenegotiation: !current.managedRenegotiation }))} />
          </div>
        </Panel>
      </div>

      <PageHeader
        eyebrow="Workspace controls"
        title="Settings"
        detail="Manage data sources, users, approval rules, report cadence, and finance ownership."
        action={<PrimaryButton onClick={handleSaveSettings}>{isSaving ? "Saving..." : "Save settings"}</PrimaryButton>}
      />

      <Panel title="Notice window" eyebrow="Action required">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "0-15 days", value: "Immediate review", detail: "Escalate owner decisions before renewal lock-in.", tone: "risk" },
            { label: "16-30 days", value: "Finance approval", detail: "Confirm cancel, reduce, or renegotiate path.", tone: "warning" },
            { label: "31-60 days", value: "Owner follow-up", detail: "Collect usage evidence and vendor context.", tone: "brand" },
          ].map((item) => (
            <article className="rounded-lg border border-line/55 bg-panel-subtle/72 p-4" key={item.label}>
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${metricTone(item.tone)}`}>{item.label}</span>
              <strong className="mt-3 block text-sm font-extrabold">{item.value}</strong>
              <p className="mt-2 text-sm leading-6 text-quiet">{item.detail}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Lead inbox" eyebrow={isLoadingRequests ? "Loading requests" : `${contactRequests.length} recent requests`}>
        {contactRequests.length === 0 ? (
          <EmptyState title="No leads yet" detail="When someone submits the contact form or requests an upgrade, the newest requests will appear here for follow-up." icon={Mail} />
        ) : (
          <div className="grid gap-3">
            {contactRequests.map((request) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4" key={request._id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <strong className="block text-sm font-extrabold">{request.name}</strong>
                    <p className="mt-1 text-sm font-bold text-quiet">{request.company || "No company"} - {request.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold uppercase text-brand-strong">{formatLeadSource(request)}</span>
                    <span className="rounded-full bg-panel-muted px-3 py-1 text-xs font-extrabold uppercase text-quiet">{request.status}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-quiet">{request.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["new", "reviewed", "closed"] as const).map((status) => (
                    <button
                      className={`min-h-9 rounded-lg border px-3 text-xs font-extrabold uppercase transition ${request.status === status ? "border-brand bg-brand text-white" : "border-line bg-panel text-quiet hover:border-brand hover:text-brand"}`}
                      type="button"
                      key={status}
                      onClick={() => handleContactStatus(request, status)}
                    >
                      {status}
                    </button>
                  ))}
                  <a className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-panel px-3 text-xs font-extrabold text-quiet transition hover:border-brand hover:text-brand" href={`mailto:${request.email}?subject=AutoAudit.ai custom plan`}>
                    Email
                  </a>
                  <a className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-panel px-3 text-xs font-extrabold text-quiet transition hover:border-brand hover:text-brand" href="https://wa.me/918591079598" target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </div>
                <p className="mt-3 text-xs font-bold text-quiet">{new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(request.createdAt))}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>
        </>
      )}
    </div>
  );
}

function MfaSettingsPanel({ user, onToast, onUserUpdate }: { user: ApiUser; onToast: (message: string) => void; onUserUpdate: (user: ApiUser) => void }) {
  const [setup, setSetup] = useState<{ qrCodeDataUri: string; secret: string } | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [savedBackupCodes, setSavedBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [isBusy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    try {
      setSetup(await authApi.setupMfa());
      setBackupCodes([]);
      setSavedBackupCodes(false);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifySetup() {
    setBusy(true);
    try {
      const response = await authApi.verifyMfaSetup(setupCode);
      setBackupCodes(response.backupCodes);
      setSetup(null);
      setSetupCode("");
      onUserUpdate({ ...user, mfaEnabled: true });
      onToast("Two-factor authentication enabled.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa() {
    setBusy(true);
    try {
      await authApi.disableMfa({ password: disablePassword, code: disableCode });
      setDisablePassword("");
      setDisableCode("");
      setBackupCodes([]);
      setSavedBackupCodes(false);
      onUserUpdate({ ...user, mfaEnabled: false });
      onToast("Two-factor authentication disabled.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Two-factor authentication" eyebrow={user.mfaEnabled ? "Enabled" : "Authenticator app"}>
      <div className="grid gap-4">
        <p className="text-sm font-bold leading-6 text-quiet">
          Protect your workspace with a 6-digit code from Google Authenticator, Authy, 1Password, or another authenticator app.
        </p>

        {!user.mfaEnabled && !setup && backupCodes.length === 0 && (
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={startSetup}>{isBusy ? "Preparing..." : "Enable two-factor authentication"}</PrimaryButton>
          </div>
        )}

        {setup && (
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-lg border border-line bg-white p-3">
              <img className="h-auto w-full" src={setup.qrCodeDataUri} alt="Authenticator QR code" />
            </div>
            <div className="grid gap-3">
              <div className="rounded-lg border border-line bg-panel-subtle p-3">
                <span className="text-xs font-extrabold uppercase text-quiet">Manual entry code</span>
                <code className="mt-2 block break-all rounded-md bg-panel px-3 py-2 text-sm font-extrabold text-ink">{setup.secret}</code>
              </div>
              <Field label="6-digit code">
                <input className="input" inputMode="numeric" autoComplete="one-time-code" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={verifySetup}>{isBusy ? "Verifying..." : "Verify and enable"}</PrimaryButton>
                <SecondaryButton onClick={() => setSetup(null)}>Cancel</SecondaryButton>
              </div>
            </div>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning-soft p-4 text-warning">
            <strong className="block text-sm font-extrabold">Save these backup codes now.</strong>
            <p className="mt-1 text-sm font-bold leading-6">Each code can be used once if you lose access to your authenticator app. They will not be shown again.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {backupCodes.map((code) => (
                <code className="rounded-md bg-panel px-3 py-2 text-center text-sm font-extrabold text-ink" key={code}>{code}</code>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-extrabold">
              <input checked={savedBackupCodes} type="checkbox" onChange={(event) => setSavedBackupCodes(event.target.checked)} />
              I saved these backup codes
            </label>
            <button className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={!savedBackupCodes} onClick={() => setBackupCodes([])}>
              Done
            </button>
          </div>
        )}

        {user.mfaEnabled && backupCodes.length === 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Current password">
              <input className="input" type="password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} />
            </Field>
            <Field label="Authenticator code">
              <input className="input" inputMode="numeric" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} />
            </Field>
            <div className="flex items-end">
              <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isBusy || !disablePassword || !disableCode} type="button" onClick={disableMfa}>
                {isBusy ? "Disabling..." : "Disable MFA"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function SessionsSecurityPanel({ user, onToast, onUserUpdate }: { user: ApiUser; onToast: (message: string) => void; onUserUpdate: (user: ApiUser) => void }) {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isRevoking, setRevoking] = useState("");
  const [isUpdatingPreference, setUpdatingPreference] = useState(false);

  async function loadSessions() {
    setLoading(true);
    try {
      setSessions(await authApi.sessions());
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      await loadSessions();
      onToast("Session revoked.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setRevoking("");
    }
  }

  async function revokeOtherSessions() {
    setRevoking("all");
    try {
      const result = await authApi.revokeOtherSessions();
      await loadSessions();
      onToast(result.revokedCount > 0 ? "Other sessions revoked." : "No other active sessions.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setRevoking("");
    }
  }

  async function updateIpStorage() {
    setUpdatingPreference(true);
    try {
      const updated = await authApi.updateSecurityPreferences({ storeIpAddresses: !user.storeIpAddresses });
      onUserUpdate(updated);
      await loadSessions();
      onToast(updated.storeIpAddresses ? "IP address storage enabled." : "IP address storage disabled.");
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setUpdatingPreference(false);
    }
  }

  return (
    <Panel
      title="Sessions & security"
      eyebrow={isLoading ? "Loading sessions" : `${sessions.length} active session${sessions.length === 1 ? "" : "s"}`}
      action={<SecondaryButton onClick={loadSessions}>Refresh</SecondaryButton>}
    >
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel-subtle p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <strong className="block text-sm font-extrabold">IP address storage</strong>
            <p className="mt-1 text-sm font-bold leading-6 text-quiet">When disabled, AutoAudit stops storing IP addresses for sessions and clears saved session IPs.</p>
          </div>
          <button className={`min-h-10 rounded-lg px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${user.storeIpAddresses === false ? "border border-line bg-panel text-ink" : "bg-brand text-white"}`} disabled={isUpdatingPreference} type="button" onClick={updateIpStorage}>
            {isUpdatingPreference ? "Saving..." : user.storeIpAddresses === false ? "IP storage off" : "IP storage on"}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold leading-6 text-quiet">Review where your account is signed in. Revoke anything you do not recognize.</p>
          <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isRevoking === "all"} type="button" onClick={revokeOtherSessions}>
            {isRevoking === "all" ? "Revoking..." : "Log out all other devices"}
          </button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : sessions.length === 0 ? (
          <EmptyState title="No active sessions" detail="Active sessions will appear here after sign-in." icon={ShieldCheck} />
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4" key={session.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-extrabold">{session.device}</strong>
                      {session.isCurrent && <span className="rounded-full bg-good-soft px-2.5 py-1 text-xs font-extrabold text-good">Current session</span>}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-bold text-quiet sm:grid-cols-3">
                      <span>IP: {session.ipAddress}</span>
                      <span>First seen: {formatSessionDate(session.createdAt)}</span>
                      <span>Last active: {formatSessionDate(session.lastSeenAt)}</span>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isRevoking === session.id} type="button" onClick={() => revokeSession(session.id)}>
                      {isRevoking === session.id ? "Revoking..." : "Revoke"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function DataPrivacyPanel({
  company,
  currentUser,
  initialVendors,
  onToast,
  onWorkspaceDeleted,
}: {
  company: ApiCompany;
  currentUser: ApiUser | null;
  initialVendors: ApiVendor[];
  onToast: (message: string) => void;
  onWorkspaceDeleted: () => void;
}) {
  const [vendors, setVendors] = useState<ApiVendor[]>(initialVendors);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [companyNameConfirmation, setCompanyNameConfirmation] = useState("");
  const [isExporting, setExporting] = useState(false);
  const [isBulkDeleting, setBulkDeleting] = useState(false);
  const [isDeletingWorkspace, setDeletingWorkspace] = useState(false);
  const isOwner = currentUser?.role === "owner";
  const canBulkDelete = currentUser?.role === "owner" || currentUser?.role === "admin";
  const selectedCount = selectedVendorIds.length;

  useEffect(() => {
    let isMounted = true;

    vendorApi
      .list({ limit: 100 })
      .then((response) => {
        if (isMounted) setVendors(response.vendors);
      })
      .catch(() => {
        if (isMounted) setVendors(initialVendors);
      });

    return () => {
      isMounted = false;
    };
  }, [initialVendors]);

  const toggleVendor = (vendorId: string) => {
    setSelectedVendorIds((current) => (current.includes(vendorId) ? current.filter((id) => id !== vendorId) : [...current, vendorId]));
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const exportData = await workspaceApi.export();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(`autoaudit-export-${date}.json`, JSON.stringify(exportData, null, 2), onToast);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(`Delete ${selectedCount} selected vendor${selectedCount === 1 ? "" : "s"}? This cannot be undone.`);
    if (!confirmed) return;

    setBulkDeleting(true);

    try {
      const result = await vendorApi.bulkRemove(selectedVendorIds);
      setVendors((current) => current.filter((vendor) => !selectedVendorIds.includes(vendor._id)));
      setSelectedVendorIds([]);
      onToast(`${result.deletedCount} vendor${result.deletedCount === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (companyNameConfirmation !== company.name) return;
    const confirmed = window.confirm(`Delete "${company.name}" and all workspace data permanently? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingWorkspace(true);

    try {
      await workspaceApi.remove(companyNameConfirmation);
      onWorkspaceDeleted();
    } catch (error) {
      onToast(getApiErrorMessage(error));
      setDeletingWorkspace(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Data controls"
        title="Data & Privacy"
        detail="Export workspace records, clean up vendors in bulk, or permanently delete this workspace."
        action={<Download aria-hidden="true" className="text-brand" size={24} />}
      />

      <Panel title="Export workspace data" eyebrow={isOwner ? "Owner only" : "Requires owner role"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-quiet">
            Download a JSON export containing company settings, vendors, reports, savings entries, and activity logs.
          </p>
          <PrimaryButton onClick={handleExport}>
            {isExporting ? "Exporting..." : "Export Workspace Data"}
          </PrimaryButton>
        </div>
      </Panel>

      <Panel title="Bulk delete vendors" eyebrow={canBulkDelete ? `${selectedCount} selected` : "Requires admin or owner"}>
        <div className="rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm font-bold text-warning">
          Vendor bulk deletion is irreversible. Select only records you are certain should be removed.
        </div>
        {vendors.length === 0 ? (
          <EmptyState title="No vendors to delete" detail="Vendor records will appear here after you add or import them." />
        ) : (
          <div className="mt-4 max-h-[360px] overflow-auto rounded-lg border border-line">
            {vendors.map((vendor) => (
              <label className="flex cursor-pointer items-center gap-3 border-b border-line/60 bg-panel-subtle px-4 py-3 last:border-b-0 hover:bg-panel-muted" key={vendor._id}>
                <input
                  className="size-4 accent-brand"
                  type="checkbox"
                  checked={selectedVendorIds.includes(vendor._id)}
                  disabled={!canBulkDelete}
                  onChange={() => toggleVendor(vendor._id)}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-extrabold">{vendor.name}</strong>
                  <span className="mt-1 block text-xs font-bold text-quiet">{vendor.category || "Uncategorized"} - {currency(Number(vendor.monthlySpend ?? 0))}/mo</span>
                </span>
                <span className="rounded-full bg-panel-muted px-2.5 py-1 text-xs font-extrabold uppercase text-quiet">{vendor.status}</span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button className="rounded-lg border border-line px-3 py-2 text-sm font-extrabold text-quiet transition hover:border-brand hover:text-brand" type="button" disabled={!canBulkDelete} onClick={() => setSelectedVendorIds(vendors.map((vendor) => vendor._id))}>
            Select all visible
          </button>
          <button className="min-h-10 rounded-lg bg-risk px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!canBulkDelete || selectedCount === 0 || isBulkDeleting} onClick={handleBulkDelete}>
            {isBulkDeleting ? "Deleting..." : `Delete ${selectedCount || ""} vendor${selectedCount === 1 ? "" : "s"}`}
          </button>
        </div>
      </Panel>

      <Panel title="Delete workspace" eyebrow="Danger zone">
        <div className="grid gap-4 rounded-lg border border-risk/30 bg-risk-soft p-4 text-risk">
          <div className="flex gap-3">
            <AlertOctagon aria-hidden="true" className="mt-0.5 shrink-0" size={22} />
            <div>
              <strong className="block text-sm font-extrabold">This permanently deletes the workspace and all associated data.</strong>
              <p className="mt-2 text-sm leading-6">
                Vendors, reports, savings entries, team invites, activity logs, users, subscriptions, renewals, and audit logs for this company will be removed.
              </p>
            </div>
          </div>
          <Field label={`Type "${company.name}" to confirm`}>
            <input className="input border-risk/30 bg-white text-risk placeholder:text-risk/50" value={companyNameConfirmation} disabled={!isOwner} onChange={(event) => setCompanyNameConfirmation(event.target.value)} />
          </Field>
          <button className="min-h-11 rounded-lg bg-risk px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!isOwner || companyNameConfirmation !== company.name || isDeletingWorkspace} onClick={handleDeleteWorkspace}>
            {isDeletingWorkspace ? "Deleting workspace..." : "Delete Workspace Permanently"}
          </button>
          {!isOwner && <p className="text-sm font-bold">Only the workspace owner can delete or export the workspace.</p>}
        </div>
      </Panel>
    </div>
  );
}

function mapCompanySettings(settings: ApiCompany["settings"]) {
  return {
    requireCfoApprovalAbove: settings?.requireCfoApprovalAbove ?? 5000,
    cfoApproval: Boolean(settings?.requireCfoApprovalAbove ?? 5000),
    cancellationEmails: settings?.autoDraftCancellationEmails ?? true,
    renewalDigest: settings?.weeklyRenewalDigest ?? true,
    managedRenegotiation: settings?.allowManagedRenegotiation ?? false,
  };
}

function formatLeadSource(request: ApiContactRequest) {
  if (request.source === "upgrade_request") {
    return request.requestedPlan ? `${request.requestedPlan} upgrade` : "Upgrade request";
  }

  if (request.source === "custom_plan") {
    return "Custom plan";
  }

  return "Contact";
}

function HeroBand({ totals, wasteSignals, onNavigate }: { totals: DashboardTotals; wasteSignals: WasteSignal[]; onNavigate: (page: PageId) => void }) {
  const bestAction = wasteSignals[0];

  return (
    <section className="relative min-w-0 overflow-hidden rounded-xl border border-brand/20 bg-inverse text-inverse-ink shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(16,185,129,0.12),transparent_30%)]" />
      <div className="relative grid min-w-0 max-w-full gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-inverse-ink/10 bg-inverse-ink/8 px-3 py-1.5 text-sm font-extrabold text-inverse-ink">
            <Bot aria-hidden="true" size={17} />
            AI audit complete
          </div>
          <h2 className="mt-5 max-w-full break-words text-3xl font-extrabold tracking-normal sm:max-w-3xl sm:text-5xl">{currency(totals.estimatedSavings || 48320)} in annual SaaS savings found.</h2>
          <p className="mt-4 max-w-full text-base leading-7 text-inverse-ink/72 sm:max-w-2xl">
            AutoAudit matched finance spend, renewal notices, and usage signals to rank cancellations, unused seats, duplicate tools, and contract risk.
          </p>
          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-inverse-action px-5 text-sm font-extrabold text-inverse-action-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto" type="button" onClick={() => onNavigate("waste")}>
              Review actions
              <ChevronRight aria-hidden="true" size={17} />
            </button>
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-inverse-ink/20 px-5 text-center text-sm font-extrabold text-inverse-ink transition hover:-translate-y-0.5 hover:bg-inverse-ink/10 sm:w-auto" type="button" onClick={() => onNavigate("reports")}>
              Generate CFO report
            </button>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-inverse-ink/10 bg-inverse-ink/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
          <span className="text-xs font-bold text-inverse-ink/60">Next best action</span>
          <strong className="mt-3 block text-2xl font-extrabold">{bestAction ? bestAction.title : "Import vendor evidence"}</strong>
          <p className="mt-2 text-sm leading-6 text-inverse-ink/70">{bestAction ? `${bestAction.vendor} - expected annual impact ${currency(bestAction.impact)}.` : "Add vendors, seats, usage, and renewals to unlock prioritized waste actions."}</p>
          <div className="mt-4 h-2 rounded-full bg-inverse-ink/10">
            <div className="h-2 rounded-full bg-brand-strong" style={{ width: `${bestAction?.confidence ?? 82}%` }} />
          </div>
          <span className="mt-2 block text-xs font-bold text-inverse-ink/60">{bestAction?.confidence ?? 82}% confidence</span>
        </div>
      </div>
    </section>
  );
}

function SummaryGrid({ totals }: { totals: DashboardTotals }) {
  const cards = [
    { label: "Monthly SaaS spend", value: currency(totals.monthlySpend), detail: "Tracked vendor charges", icon: CircleDollarSign, tone: "brand" },
    { label: "Monthly waste found", value: currency(totals.monthlyWaste), detail: "Across email, spend, and SSO", icon: AlertTriangle, tone: "risk" },
    { label: "Estimated savings", value: currency(totals.estimatedSavings), detail: "First-year opportunity", icon: BadgeDollarSign, tone: "good" },
    { label: "Renewals at risk", value: currency(totals.renewalRisk), detail: `${totals.vendorCount} vendors tracked`, icon: CalendarClock, tone: "warning" },
  ];

  return (
    <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article className="min-w-0 rounded-lg border border-line/55 bg-panel/78 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-brand/35 hover:shadow-xl" key={card.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-xs font-bold text-quiet">{card.label}</span>
              <span className={`grid size-9 place-items-center rounded-lg ${metricTone(card.tone)}`}>
                <Icon aria-hidden="true" size={18} />
              </span>
            </div>
            <strong className="mt-4 block text-2xl font-extrabold">{card.value}</strong>
            <span className="mt-1 block text-sm text-quiet">{card.detail}</span>
          </article>
        );
      })}
    </section>
  );
}

function UnusedSeatsTable({ rows }: { rows: UnusedSeatRow[] }) {
  return (
    <Panel title="Unused seats table" eyebrow="Seat leakage">
      {rows.length === 0 ? (
        <EmptyState title="No unused seats detected" detail="Seat waste will appear once vendors include seat counts and usage data." />
      ) : (
        <>
        <div className="grid gap-3 md:hidden">
          {rows.map((row) => (
            <article className="min-w-0 rounded-lg border border-line/50 bg-panel-subtle/72 p-4" key={row.tool}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block break-words text-sm font-extrabold">{row.tool}</strong>
                  <span className="mt-1 block text-xs text-quiet">{row.owner}</span>
                </div>
                <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-extrabold text-warning">{row.unused} unused</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-quiet">
                <span className="rounded-full bg-panel px-2.5 py-1">{currency(row.cost)} annual cost</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-quiet">{row.action}</p>
            </article>
          ))}
        </div>
        <div className="hidden max-w-full overflow-x-auto md:block">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-line text-xs uppercase text-quiet">
                <th className="px-3 py-3">Tool</th>
                <th className="px-3 py-3">Owner</th>
                <th className="px-3 py-3">Unused</th>
                <th className="px-3 py-3">Annual cost</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr className="transition hover:bg-panel-muted/60" key={row.tool}>
                  <td className="px-3 py-3 font-extrabold">{row.tool}</td>
                  <td className="px-3 py-3 text-sm text-quiet">{row.owner}</td>
                  <td className="px-3 py-3 text-sm font-extrabold">{row.unused}</td>
                  <td className="px-3 py-3 text-sm font-extrabold">{currency(row.cost)}</td>
                  <td className="px-3 py-3 text-sm text-quiet">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Panel>
  );
}

function DuplicateToolsPanel({ rows }: { rows: DuplicateToolRow[] }) {
  const [selectedAlert, setSelectedAlert] = useState<DuplicateToolRow | null>(rows[0] ?? null);

  useEffect(() => {
    if (!selectedAlert && rows[0]) {
      setSelectedAlert(rows[0]);
    }
  }, [rows, selectedAlert]);

  return (
    <Panel title="Duplicate tools alerts" eyebrow="Consolidation">
      <div className="grid gap-3">
        {rows.length === 0 && <EmptyState title="No duplicate tools detected" detail="Duplicate categories will appear when multiple active vendors share the same category." />}
        {rows.map((alert) => (
          <article className="rounded-lg border border-line bg-panel-subtle p-4 transition hover:-translate-y-0.5 hover:shadow-md" key={alert.group}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block font-extrabold">{alert.group}</strong>
                <span className="mt-1 block text-sm text-quiet">{alert.tools}</span>
              </div>
              <span className="rounded-full bg-risk-soft px-2.5 py-1 text-xs font-extrabold text-risk">{currency(alert.waste)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-quiet">{alert.recommendation}</p>
            <button className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-brand hover:text-brand-strong" type="button" onClick={() => setSelectedAlert(alert)}>
              Review consolidation
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </article>
        ))}
        {selectedAlert && (
          <article className="rounded-lg border border-brand/30 bg-brand-soft p-4">
            <span className="text-xs font-extrabold uppercase text-brand-strong">Consolidation plan</span>
            <strong className="mt-2 block">{selectedAlert.group}</strong>
            <p className="mt-2 text-sm leading-6 text-brand-strong">{selectedAlert.recommendation}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold text-brand-strong">
              <span className="rounded-full bg-panel px-2.5 py-1">{selectedAlert.tools}</span>
              <span className="rounded-full bg-panel px-2.5 py-1">{currency(selectedAlert.waste)} estimated waste</span>
            </div>
          </article>
        )}
      </div>
    </Panel>
  );
}

function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line/55 bg-panel/78 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold text-brand-strong">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-normal sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-quiet">{detail}</p>
      </div>
      <div className="flex shrink-0">{action}</div>
    </section>
  );
}

function Panel({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-line/55 bg-panel/78 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.14)] backdrop-blur sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-brand-strong">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-normal">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-quiet">{label}</span>
      {children}
    </label>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/55 bg-panel/78 p-3">
      <span className="block text-xs font-bold text-quiet">{label}</span>
      <strong className="mt-1 block truncate text-sm font-extrabold">{value}</strong>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm text-quiet sm:min-w-[240px]">
      <Search aria-hidden="true" size={17} />
      <input className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-quiet" value={value} placeholder="Search vendors" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectPill({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm font-bold text-quiet">
      <Filter aria-hidden="true" size={17} />
      <select className="bg-transparent text-ink outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function VendorIdentity({ vendor }: { vendor: Vendor }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-extrabold text-brand-strong">{initials(vendor.name)}</span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-extrabold">{vendor.name}</strong>
        <span className="mt-1 block truncate text-xs text-quiet">{vendor.category}</span>
      </span>
    </div>
  );
}

function ActionItemWorkflowCard({
  action,
  canApprove,
  teamMembers,
  onAddComment,
  onApprove,
  onAssign,
  onComplete,
  onDelete,
  onReject,
  onUpdateStatus,
}: {
  action: ApiActionItem;
  canApprove: boolean;
  teamMembers: ApiTeamMember[];
  onAddComment: (actionId: string, text: string) => Promise<void>;
  onApprove: (actionId: string) => Promise<void>;
  onAssign: (actionId: string, input: { assignedTo?: string; dueDate?: string }) => Promise<void>;
  onComplete: (actionId: string, confirmedSavings?: number) => Promise<void>;
  onDelete: (actionId: string) => Promise<void>;
  onReject: (actionId: string, rejectionReason: string) => Promise<void>;
  onUpdateStatus: (actionId: string, status: ActionItemStatus) => Promise<void>;
}) {
  const [areCommentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [confirmedSavings, setConfirmedSavings] = useState(String(action.confirmedSavings ?? action.estimatedSavings ?? action.impact ?? ""));
  const [isSaving, setSaving] = useState(false);
  const assignedUserId = getUserId(action.assignedTo);
  const dueDateValue = action.dueDate ? action.dueDate.slice(0, 10) : "";

  const handleAssign = async (assignedTo: string) => {
    setSaving(true);
    try {
      await onAssign(action.id, { assignedTo: assignedTo || undefined, dueDate: dueDateValue || undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleDueDate = async (dueDate: string) => {
    setSaving(true);
    try {
      await onAssign(action.id, { assignedTo: assignedUserId, dueDate: dueDate || undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    const rejectionReason = window.prompt("Why is this action being rejected?");
    if (!rejectionReason?.trim()) return;
    await onReject(action.id, rejectionReason.trim());
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await onAddComment(action.id, commentText.trim());
    setCommentText("");
    setCommentsOpen(true);
  };

  const handleComplete = async () => {
    const parsedSavings = confirmedSavings === "" ? undefined : Number(confirmedSavings);
    await onComplete(action.id, Number.isFinite(parsedSavings) ? parsedSavings : undefined);
  };

  return (
    <article className="rounded-lg border border-line bg-panel-subtle p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="block text-sm font-extrabold">{action.vendorName}</strong>
            <span className="rounded-full bg-panel-muted px-2.5 py-1 text-xs font-extrabold uppercase text-quiet">{formatActionStatus(action.status)}</span>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{action.priority}</span>
            <ApprovalBadge status={action.approvalStatus} />
            {action.dueDate && <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-extrabold text-warning">Due {formatShortDate(action.dueDate)}</span>}
          </div>
          <p className="mt-2 text-sm font-extrabold">{action.title}</p>
          {action.detail && <p className="mt-1 text-sm leading-6 text-quiet">{action.detail}</p>}
          {action.rejectionReason && <p className="mt-2 rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-xs font-bold text-risk">Rejected: {action.rejectionReason}</p>}
        </div>
        <div className="grid gap-2 sm:min-w-40 sm:text-right">
          <span className="rounded-full bg-good-soft px-3 py-1.5 text-sm font-extrabold text-good">{currency(action.estimatedSavings ?? action.impact)}</span>
          <AssigneeChip user={action.assignedTo} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_170px]">
        <label className="grid gap-1 text-xs font-bold text-quiet">
          Assign
          <select className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-brand" value={assignedUserId ?? ""} disabled={isSaving} onChange={(event) => handleAssign(event.target.value)}>
            <option value="">Unassigned</option>
            {teamMembers.map((member) => (
              <option value={member.id} key={member.id}>{member.name} · {member.role}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-quiet">
          Due date
          <input className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-brand" type="date" value={dueDateValue} disabled={isSaving} onChange={(event) => handleDueDate(event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-quiet">
          Confirmed savings
          <input className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-brand" type="number" min="0" value={confirmedSavings} onChange={(event) => setConfirmedSavings(event.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton onClick={() => onUpdateStatus(action.id, action.status === "open" ? "in_progress" : "open")}>
          {action.status === "open" ? "Start" : "Reopen"}
        </SecondaryButton>
        {action.status !== "done" && <PrimaryButton onClick={handleComplete}>Mark done</PrimaryButton>}
        {canApprove && action.approvalStatus === "pending" && (
          <>
            <PrimaryButton onClick={() => onApprove(action.id)}>Approve</PrimaryButton>
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk transition hover:-translate-y-0.5" type="button" onClick={handleReject}>
              Reject
            </button>
          </>
        )}
        <SecondaryButton onClick={() => setCommentsOpen((current) => !current)}>
          Comments ({action.comments?.length ?? 0})
        </SecondaryButton>
        <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-risk/20 bg-risk-soft px-4 text-sm font-extrabold text-risk transition hover:-translate-y-0.5" type="button" onClick={() => onDelete(action.id)}>
          Delete
        </button>
      </div>

      {areCommentsOpen && (
        <div className="mt-4 rounded-lg border border-line bg-panel p-3">
          <div className="grid gap-2">
            {(action.comments ?? []).length === 0 && <p className="text-sm font-bold text-quiet">No comments yet.</p>}
            {(action.comments ?? []).map((comment) => (
              <div className="rounded-lg bg-panel-subtle p-3" key={comment._id ?? `${comment.createdAt}-${comment.text}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-quiet">
                  <span>{comment.author?.name ?? "Team member"}</span>
                  <span>{formatRelativeDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-ink">{comment.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input className="min-h-10 flex-1 rounded-lg border border-line bg-panel-subtle px-3 text-sm text-ink outline-none focus:border-brand" value={commentText} placeholder="Add an update for the team" onChange={(event) => setCommentText(event.target.value)} />
            <PrimaryButton onClick={handleComment}>Add comment</PrimaryButton>
          </div>
        </div>
      )}
    </article>
  );
}

function ApprovalBadge({ status }: { status: ApiActionItem["approvalStatus"] }) {
  const classes = {
    not_required: "bg-panel-muted text-quiet",
    pending: "bg-warning-soft text-warning",
    approved: "bg-good-soft text-good",
    rejected: "bg-risk-soft text-risk",
  } satisfies Record<ApiActionItem["approvalStatus"], string>;

  return <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${classes[status]}`}>{formatApprovalStatus(status)}</span>;
}

function AssigneeChip({ user }: { user?: ApiActionItem["assignedTo"] }) {
  if (!user) {
    return <span className="text-xs font-bold text-quiet">Unassigned</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-extrabold text-ink sm:justify-end">
      <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[10px] text-brand-strong">{initials(user.name ?? user.email ?? "U")}</span>
      {user.name ?? user.email}
    </span>
  );
}

function getUserId(user?: { id?: string; _id?: string }) {
  return user?.id ?? user?._id;
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/55 bg-panel-subtle/72 p-4">
      <span className="text-xs font-bold text-quiet">{label}</span>
      <strong className="mt-2 block text-2xl font-extrabold">{value}</strong>
    </div>
  );
}

function UsageMeter({ label, used, limit, compact = false }: { label: string; used: number; limit: number | null; compact?: boolean }) {
  const cappedUsed = Math.max(0, used);
  const percent = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((cappedUsed / limit) * 100));
  const isAtLimit = limit !== null && cappedUsed >= limit;
  const tone = percent >= 90 ? "risk" : percent >= 70 ? "warning" : "good";
  const fillClass = tone === "risk" ? "bg-risk" : tone === "warning" ? "bg-warning" : "bg-good";
  const valueClass = isAtLimit || tone === "risk" ? "text-risk" : tone === "warning" ? "text-warning" : "text-ink";

  return (
    <div className={`rounded-lg border border-line/55 bg-panel-subtle/72 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-quiet">{label}</span>
        <strong className={`text-sm font-extrabold ${valueClass}`}>{limit === null ? `${cappedUsed} / Custom` : `${cappedUsed} / ${limit}`}</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-muted">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: limit === null ? "18%" : `${percent}%` }} />
      </div>
      {!compact && limit !== null && (
        <span className={`mt-2 block text-xs font-bold ${valueClass}`}>{percent}% used</span>
      )}
    </div>
  );
}

function EmptySetupActions({ isLoadingDemo, onLoadDemoData, onNavigate }: { isLoadingDemo: boolean; onLoadDemoData: () => Promise<void>; onNavigate: (page: PageId) => void }) {
  return (
    <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
      <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={isLoadingDemo} onClick={onLoadDemoData}>
        {isLoadingDemo ? "Loading..." : "Load sample data"}
      </button>
      <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand" type="button" onClick={() => onNavigate("vendors")}>
        Import CSV
      </button>
    </div>
  );
}

function ToggleRow({ title, enabled, onToggle }: { title: string; enabled: boolean; onToggle?: () => void }) {
  return (
    <button className="flex items-center justify-between gap-3 rounded-lg border border-line/55 bg-panel-subtle/72 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/60" type="button" onClick={onToggle}>
      <span className="text-sm font-extrabold">{title}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${enabled ? "bg-brand" : "bg-panel-muted"}`}>
        <span className={`size-5 rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function PanelAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line/60 bg-panel-subtle/72 px-3 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong hover:text-inverse-action-ink hover:shadow-[0_16px_32px_rgb(var(--color-brand)/0.28)] active:translate-y-0" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line/60 bg-panel/78 px-4 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="grid size-9 place-items-center rounded-lg border border-line/60 bg-panel/78 text-quiet shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function RiskPill({ risk, label }: { risk: RiskLevel; label: string }) {
  const tone = {
    critical: "bg-risk-soft text-risk",
    high: "bg-warning-soft text-warning",
    medium: "bg-brand-soft text-brand-strong",
    low: "bg-good-soft text-good",
  }[risk];

  return <span className={`inline-flex min-h-7 items-center justify-center rounded-full px-2.5 text-xs font-extrabold ${tone}`}>{label}</span>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-3 shadow-xl">
      {label && <strong className="mb-2 block text-sm font-extrabold">{label}</strong>}
      <div className="grid gap-1">
        {payload.map((item) => (
          <div className="flex min-w-36 items-center justify-between gap-4 text-sm" key={`${item.name}-${item.value}`}>
            <span className="flex items-center gap-2 text-quiet">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <strong>{currency(Number(item.value))}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className={`fixed bottom-5 right-5 z-[60] max-w-[calc(100vw-40px)] rounded-lg bg-inverse px-4 py-3 text-sm font-extrabold text-inverse-ink shadow-2xl transition duration-200 ${message ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

async function copyText(text: string, onToast: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onToast("Generated report copied.");
  } catch {
    onToast("Select the report text to copy it.");
  }
}

function exportRenewalCalendar(rows: RenewalRow[], onToast: (message: string) => void) {
  if (rows.length === 0) {
    onToast("Add renewal dates before exporting a calendar.");
    return;
  }

  const currentYear = new Date().getFullYear();
  const events = rows
    .map((row) => {
      const date = parseShortDate(row.date, currentYear);
      if (!date) return "";

      const dateStamp = formatIcsDate(date);
      return [
        "BEGIN:VEVENT",
        `UID:autoaudit-${row.id}@autoaudit.ai`,
        `DTSTAMP:${formatIcsDateTime(new Date())}`,
        `DTSTART;VALUE=DATE:${dateStamp}`,
        `SUMMARY:Review ${escapeIcsText(row.vendor)} renewal`,
        `DESCRIPTION:Owner: ${escapeIcsText(row.owner)}\\nContract value: ${currency(row.amount)}\\nRisk: ${row.risk}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .filter(Boolean)
    .join("\r\n");

  const calendar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AutoAudit.ai//Renewals//EN", events, "END:VCALENDAR"].join("\r\n");
  downloadTextFile("autoaudit-renewals.ics", calendar, onToast);
}

function downloadTextFile(filename: string, content: string, onToast: (message: string) => void) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  onToast(`${filename} downloaded.`);
}

function downloadBlob(filename: string, blob: Blob, onToast: (message: string) => void) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  onToast(`${filename} downloaded.`);
}

function exportReportCsv(report: ReportCard, onToast: (message: string) => void) {
  const rows = [
    ["Report", "Owner", "Status", "Date", "Savings", "Summary"],
    [report.name, report.owner, report.status, report.date, String(report.savings), buildReportSummary(report)],
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadTextFile(`${safeFilename(report.name)}.csv`, csv, onToast);
}

function printReportPdf(report: ReportCard, onToast: (message: string) => void) {
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) {
    onToast("Allow popups to print this report.");
    return;
  }

  const summary = escapeHtml(buildReportSummary(report));
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(report.name)}</title>
    <style>
      body { color: #172026; font-family: Arial, sans-serif; margin: 40px; }
      h1 { font-size: 28px; margin: 0 0 8px; }
      .meta { color: #66747d; font-size: 13px; margin-bottom: 24px; }
      .metrics { display: grid; gap: 12px; grid-template-columns: repeat(3, 1fr); margin-bottom: 24px; }
      .metric { border: 1px solid #dce4e8; border-radius: 8px; padding: 12px; }
      .metric span { color: #66747d; display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .metric strong { display: block; font-size: 18px; margin-top: 6px; }
      pre { background: #f6f8f9; border: 1px solid #dce4e8; border-radius: 8px; font-family: Arial, sans-serif; line-height: 1.6; padding: 16px; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(report.name)}</h1>
    <div class="meta">Generated by AutoAudit.ai - ${escapeHtml(report.date)}</div>
    <div class="metrics">
      <div class="metric"><span>Owner</span><strong>${escapeHtml(report.owner)}</strong></div>
      <div class="metric"><span>Status</span><strong>${escapeHtml(report.status)}</strong></div>
      <div class="metric"><span>Savings</span><strong>${currency(report.savings)}</strong></div>
    </div>
    <pre>${summary}</pre>
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  onToast("PDF print view opened.");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "autoaudit-report";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function downloadCsvTemplate(onToast: (message: string) => void) {
  const template = [
    "name,category,owner,ownerEmail,monthlySpend,seatsPurchased,activeSeats,lastUsedAt,renewalDate,notes",
    "Slack,Collaboration,Ops Lead,ops@example.com,890,80,52,2026-05-01,2026-06-15,Core messaging workspace",
    "Clearbit,Sales,Revenue Lead,revenue@example.com,1200,12,0,2026-01-15,2026-05-30,Review cancellation before renewal",
  ].join("\n");

  downloadTextFile("autoaudit-vendor-template.csv", template, onToast);
}

function buildReportSummary(report: ReportCard) {
  if (report.content) {
    return report.content;
  }

  return `${report.name}

Owner: ${report.owner}
Status: ${report.status}
Date: ${report.date}
Savings identified: ${currency(report.savings)}

Summary:
This packet highlights SaaS waste drivers, renewal exposure, and recommended owner actions for the current review cycle.`;
}

function mapApiReportToCard(report: ApiReport): ReportCard {
  return {
    id: report._id,
    name: report.title,
    owner: "Workspace",
    status: report.status === "ready" ? "Ready" : report.status,
    reportType: report.reportType,
    savings: Number(report.summary?.estimatedAnnualSavings ?? 0),
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(report.createdAt)),
    content: report.content,
  };
}

function parseShortDate(value: string, year: number) {
  const date = new Date(`${value}, ${year}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatIcsDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function formatIcsDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
}

function parseVendorCsv(text: string): CreateVendorInput[] {
  const rows = parseCsvRows(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one vendor.");
  }

  const headers = rows[0].map(normalizeHeader);
  const hasNameHeader = headers.some((header) => ["name", "vendor", "vendorname", "tool", "app"].includes(header));
  if (!hasNameHeader) {
    throw new Error("CSV needs a vendor name column.");
  }

  const vendors: CreateVendorInput[] = [];

  rows.slice(1).forEach((row) => {
    const name = csvValue(row, headers, ["name", "vendor", "vendorname", "tool", "app"]);
    if (!name) return;

    vendors.push({
      name,
      category: csvValue(row, headers, ["category", "department", "function"]) || "Uncategorized",
      ownerName: csvValue(row, headers, ["owner", "ownername", "manager"]),
      ownerEmail: csvValue(row, headers, ["email", "owneremail"]),
      monthlySpend: parseCsvNumber(csvValue(row, headers, ["monthlyspend", "spend", "cost", "amount"])),
      seatsPurchased: parseCsvNumber(csvValue(row, headers, ["seatspurchased", "seats", "licenses", "licences"])),
      activeSeats: parseCsvNumber(csvValue(row, headers, ["activeseats", "usedseats", "activeusers", "users"])),
      lastUsedAt: parseCsvDate(csvValue(row, headers, ["lastused", "lastusedat", "lastlogin", "lastactivity"])),
      renewalDate: parseCsvDate(csvValue(row, headers, ["renewal", "renewaldate", "renewalat", "contractend"])),
      notes: csvValue(row, headers, ["notes", "note", "description"]),
    });
  });

  if (vendors.length === 0) {
    throw new Error("No vendor rows found in the CSV.");
  }

  return vendors;
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function csvValue(row: string[], headers: string[], aliases: string[]) {
  const index = headers.findIndex((header) => aliases.includes(header));
  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function parseCsvNumber(value: string) {
  if (!value) return undefined;

  const parsed = Number(value.replace(/[$,%\s]/g, "").replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function parseCsvDate(value: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="mb-4 grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
      <div className="flex items-center gap-3 text-sm font-extrabold text-quiet">
        <span className="size-4 animate-spin rounded-full border-2 border-line border-t-brand" />
        {label}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <span className="h-20 animate-pulse rounded-lg bg-panel-muted" key={index} />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="grid min-h-16 animate-pulse grid-cols-[2fr_1fr_1fr_1fr] gap-3 rounded-lg border border-line bg-panel-subtle p-3" key={index}>
          <span className="rounded bg-panel-muted" />
          <span className="rounded bg-panel-muted" />
          <span className="rounded bg-panel-muted" />
          <span className="rounded bg-panel-muted" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-risk/20 bg-risk-soft px-4 py-3 text-sm text-risk sm:flex-row sm:items-center sm:justify-between">
      <strong>{message}</strong>
      <button className="rounded-lg bg-white px-3 py-2 font-extrabold text-risk" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function EmptyState({ title, detail, action, icon: Icon = Inbox }: { title: string; detail: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-panel-subtle p-6 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
        <Icon aria-hidden="true" size={21} />
      </span>
      <strong className="mt-4 block text-sm font-extrabold">{title}</strong>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-quiet">{detail}</p>
      {action}
    </div>
  );
}

function mapApiVendorToDashboardVendor(vendor: ApiVendor): Vendor {
  return {
    id: vendor._id,
    name: vendor.name,
    category: vendor.category || "Uncategorized",
    owner: vendor.ownerName || "Unassigned",
    spend: Number(vendor.monthlySpend ?? 0),
    seats: Number(vendor.seatsPurchased ?? 0),
    activeSeats: Number(vendor.activeSeats ?? 0),
    lastUsed: formatRelativeDate(vendor.lastUsedAt),
    renewal: formatShortDate(vendor.renewalDate),
    status: mapVendorStatus(vendor.status),
    risk: mapRiskScore(vendor.riskScore, vendor.status),
    savings: estimateVendorSavings(vendor),
  };
}

function buildUnusedSeatRows(summary: AuditSummary | null): UnusedSeatRow[] {
  return (summary?.unusedSeats ?? []).map((row) => ({
    tool: row.vendorName,
    owner: row.ownerName || "Unassigned",
    unused: row.unusedSeats,
    cost: row.annualWaste,
    action: row.recommendation,
  }));
}

function buildDuplicateToolRows(summary: AuditSummary | null): DuplicateToolRow[] {
  return (summary?.duplicateTools ?? []).map((row) => ({
    group: row.category,
    tools: row.vendorNames.join(", "),
    owner: "Ops",
    waste: row.estimatedWaste,
    recommendation: row.recommendation,
  }));
}

function buildWasteSignals(summary: AuditSummary | null): WasteSignal[] {
  const wasteSignals: WasteSignal[] = (summary?.wasteSignals ?? []).map((signal) => ({
    vendorId: signal.vendorId,
    title: signal.recommendation,
    vendor: signal.vendorName ?? signal.category ?? "Multiple vendors",
    impact: signal.annualImpact,
    confidence: signal.confidence,
    detail: signal.recommendation,
    evidence: signal.evidence ?? [],
    type: signal.type === "zombie_subscription" ? "Zombie app" : signal.type === "unused_seats" ? "Unused seats" : "Duplicate tool",
  }));

  const renewalSignals: WasteSignal[] = (summary?.upcomingRenewals ?? [])
    .filter((renewal) => renewal.riskLevel === "high" || renewal.riskLevel === "critical")
    .map((renewal) => {
      const daysRemaining = daysUntilDate(renewal.renewalDate);
      return {
        vendorId: renewal.id,
        title: `Review renewal risk for ${renewal.vendorName ?? "vendor"}`,
        vendor: renewal.vendorName ?? "Vendor",
        impact: Number(renewal.contractValue ?? 0),
        confidence: renewal.riskLevel === "critical" ? 92 : 78,
        detail: "Renewal requires owner and finance review before the notice window closes.",
        evidence: [
          `Renewal date is ${formatShortDate(renewal.renewalDate)}.`,
          `${daysRemaining} days remaining.`,
          `Contract value is ${currency(Number(renewal.contractValue ?? 0))}.`,
        ],
        type: "Renewal",
      };
    });

  return [...wasteSignals, ...renewalSignals];
}

function buildRenewalRows({ renewals, auditSummary }: { renewals: ApiRenewal[]; auditSummary: AuditSummary | null }): RenewalRow[] {
  const renewalRowsFromApi = renewals.map((renewal) => ({
    id: renewal._id,
    vendor: renewal.vendor?.name ?? "Vendor",
    date: formatShortDate(renewal.renewalDate),
    renewalDate: renewal.renewalDate,
    owner: renewal.vendor?.ownerName ?? "Unassigned",
    amount: Number(renewal.contractValue ?? 0),
    risk: renewal.riskLevel,
    status: renewal.status,
    reviewedAt: renewal.reviewedAt,
  }));

  if (renewalRowsFromApi.length > 0) {
    return renewalRowsFromApi;
  }

  return (auditSummary?.upcomingRenewals ?? []).map((renewal) => ({
    id: renewal.id,
    vendor: renewal.vendorName ?? "Vendor",
    date: formatShortDate(renewal.renewalDate),
    renewalDate: renewal.renewalDate,
    owner: "Unassigned",
    amount: Number(renewal.contractValue ?? 0),
    risk: renewal.riskLevel,
    status: "upcoming" as const,
  }));
}

function isRenewalWithinDays(value: string | undefined, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= days;
}

function buildCategorySpend(vendors: ApiVendor[]) {
  const colors = ["#38bdf8", "#7dd3fc", "#f59e0b", "#ef4444", "#10b981", "#94a3b8"];
  const totalsByCategory = vendors.reduce((groups, vendor) => {
    const category = vendor.category || "Uncategorized";
    groups.set(category, (groups.get(category) ?? 0) + Number(vendor.monthlySpend ?? 0));
    return groups;
  }, new Map<string, number>());

  return Array.from(totalsByCategory.entries()).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
  }));
}

function buildRenewalChart(rows: RenewalRow[]) {
  const windows = [
    { window: "0-15d", amount: 0 },
    { window: "16-30d", amount: 0 },
    { window: "31-45d", amount: 0 },
    { window: "46-60d", amount: 0 },
    { window: "61-90d", amount: 0 },
  ];

  rows.forEach((row) => {
    const days = daysUntilShortDate(row.date);
    if (days <= 15) windows[0].amount += row.amount;
    else if (days <= 30) windows[1].amount += row.amount;
    else if (days <= 45) windows[2].amount += row.amount;
    else if (days <= 60) windows[3].amount += row.amount;
    else windows[4].amount += row.amount;
  });

  return windows;
}

function mapVendorStatus(status: ApiVendor["status"]): VendorStatus {
  const labels = {
    active: "Healthy",
    zombie: "Zombie",
    duplicate: "Duplicate",
    renewal_risk: "Renewal risk",
    unused_seats: "Unused seats",
    cancelled: "Zombie",
  } satisfies Record<ApiVendor["status"], VendorStatus>;

  return labels[status];
}

function mapVendorStatusFilterToApi(status: string) {
  const statuses = {
    Healthy: "active",
    Zombie: "zombie",
    Duplicate: "duplicate",
    "Renewal risk": "renewal_risk",
    "Unused seats": "unused_seats",
  } satisfies Record<VendorStatus, ApiVendor["status"]>;

  return status === "All" ? undefined : statuses[status as VendorStatus];
}

function buildVendorCategoryOptions(vendors: ApiVendor[], selectedCategory = "All") {
  return mergeVendorCategoryOptions(["All"], vendors, selectedCategory);
}

function mergeVendorCategoryOptions(current: string[], vendors: ApiVendor[], selectedCategory = "All") {
  const categories = new Set(current.length > 0 ? current : ["All"]);
  categories.add("All");

  vendors.forEach((vendor) => {
    const category = vendor.category?.trim();
    if (category) categories.add(category);
  });

  if (selectedCategory !== "All") {
    categories.add(selectedCategory);
  }

  return Array.from(categories).sort((first, second) => {
    if (first === "All") return -1;
    if (second === "All") return 1;
    return first.localeCompare(second);
  });
}

function mapRiskScore(score: number, status: ApiVendor["status"]): RiskLevel {
  if (status === "zombie" || score >= 90) return "critical";
  if (status === "renewal_risk" || score >= 70) return "high";
  if (status === "unused_seats" || status === "duplicate" || score >= 40) return "medium";
  return "low";
}

function estimateVendorSavings(vendor: ApiVendor) {
  if (vendor.status === "zombie") return Number(vendor.monthlySpend ?? 0) * 12;
  if (!vendor.seatsPurchased) return 0;

  const unusedSeats = Math.max(Number(vendor.seatsPurchased) - Number(vendor.activeSeats), 0);
  return Math.round((Number(vendor.monthlySpend) / Number(vendor.seatsPurchased)) * unusedSeats * 12);
}

function formatShortDate(value?: string) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(value));
}

function formatLongDate(value?: string) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(date);
}

function daysSinceIso(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function buildEmailVerificationForm(vendor: ApiVendor | undefined, fallbackVendorName: string): EmailVerificationForm {
  return {
    vendorName: vendor?.name ?? fallbackVendorName,
    monthlySpend: String(vendor?.monthlySpend ?? 0),
    seatsPurchased: String(vendor?.seatsPurchased ?? 0),
    activeSeats: String(vendor?.activeSeats ?? 0),
    lastUsedAt: vendor?.lastUsedAt ? vendor.lastUsedAt.slice(0, 10) : "",
    renewalDate: vendor?.renewalDate ? vendor.renewalDate.slice(0, 10) : "",
  };
}

function hasEmailVerificationChanges(vendor: ApiVendor, form: EmailVerificationForm) {
  return (
    (form.vendorName || "") !== (vendor.name || "") ||
    Number(form.monthlySpend || 0) !== Number(vendor.monthlySpend ?? 0) ||
    Number(form.seatsPurchased || 0) !== Number(vendor.seatsPurchased ?? 0) ||
    Number(form.activeSeats || 0) !== Number(vendor.activeSeats ?? 0) ||
    (form.lastUsedAt || "") !== (vendor.lastUsedAt ? vendor.lastUsedAt.slice(0, 10) : "") ||
    (form.renewalDate || "") !== (vendor.renewalDate ? vendor.renewalDate.slice(0, 10) : "")
  );
}

function formatRelativeDate(value?: string) {
  if (!value) return "No usage";

  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function daysUntilShortDate(shortDate: string) {
  const parsed = new Date(`${shortDate}, ${new Date().getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) return 91;

  return Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function daysUntilDate(value?: string) {
  if (!value) return 91;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 91;
  return Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getTrialState(company: ApiCompany | null) {
  const fallbackEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const trialEnd = new Date(company?.trialEndsAt ?? fallbackEnd);
  const remainingMs = trialEnd.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const isExpired = company?.subscriptionStatus === "expired" || remainingMs <= 0;

  return {
    days,
    isExpired,
    label: isExpired ? "Trial ended - choose a plan" : days === 1 ? "1 day remaining" : `${days} days remaining`,
  };
}

function formatPlanLabel(plan: ApiCompany["plan"]) {
  const labels = {
    free: "Free trial",
    starter: "Starter",
    standard: "Standard",
    growth: "Growth",
    enterprise: "Enterprise",
    custom: "Custom plan",
  } satisfies Record<ApiCompany["plan"], string>;

  return labels[plan] ?? "Free trial";
}

function getPlanLimitSet(companyOrPlan: ApiCompany | ApiCompany["plan"] | null) {
  const plan = typeof companyOrPlan === "string" ? companyOrPlan : companyOrPlan?.plan ?? "free";
  const limits = planLimitSets[plan] ?? planLimitSets.free;

  if (typeof companyOrPlan !== "string" && companyOrPlan?.subscriptionStatus !== "active") {
    return {
      ...limits,
      reports: null,
      aiEmails: null,
      vendorAnalyses: null,
    };
  }

  return limits;
}

function getPlanUsage(company: ApiCompany | null, vendorCount: number): PlanUsage {
  return {
    vendors: vendorCount,
    reports: Number(company?.planUsage?.reportsGenerated ?? 0),
    aiEmails: Number(company?.planUsage?.aiEmailsGenerated ?? 0),
    vendorAnalyses: Number(company?.planUsage?.vendorAnalysesGenerated ?? 0),
  };
}

function buildPlanUsageWarning(company: ApiCompany | null, usage: PlanUsage): PlanUsageWarning | null {
  if (!company) return null;

  const limits = getPlanLimitSet(company);
  const labels = {
    vendors: "vendor slots",
    reports: "reports",
    aiEmails: "AI email drafts",
    vendorAnalyses: "AI analyses",
  } satisfies Record<keyof PlanUsage, string>;

  const warnings = (Object.keys(usage) as Array<keyof PlanUsage>)
    .map((type) => {
      const limit = limits[type];
      if (limit === null || limit <= 0) return null;

      const used = usage[type];
      const percent = used / limit;
      if (percent < 0.8) return null;

      const nextPlan = getUpgradePlanForUsage(company.plan, type);
      const nextLimit = getPlanLimitSet(nextPlan)[type];

      return {
        type,
        label: labels[type],
        used,
        limit,
        nextPlan,
        multiplier: nextLimit && nextLimit > limit ? Math.round(nextLimit / limit) : 1,
        percent,
      };
    })
    .filter(isPresent)
    .sort((first, second) => second.percent - first.percent);

  const warning = warnings[0];
  if (!warning) return null;

  return {
    type: warning.type,
    label: warning.label,
    used: warning.used,
    limit: warning.limit,
    nextPlan: warning.nextPlan,
    multiplier: warning.multiplier,
  };
}

function getUpgradePlanForUsage(currentPlan: ApiCompany["plan"], type: keyof PlanUsage): ApiCompany["plan"] {
  const orderedPlans: ApiCompany["plan"][] = ["free", "starter", "standard", "growth", "enterprise"];
  const currentLimit = getPlanLimitSet(currentPlan)[type];
  const currentIndex = Math.max(0, orderedPlans.indexOf(currentPlan));

  for (const plan of orderedPlans.slice(currentIndex + 1)) {
    const nextLimit = getPlanLimitSet(plan)[type];
    if (nextLimit === null || currentLimit === null || nextLimit > currentLimit) return plan;
  }

  return "custom";
}

function formatLimit(value: number | null) {
  return value === null ? "Custom" : String(value);
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function withUpgradePrompt(message: string) {
  if (/limit|allows up to|includes|trial has ended|choose a plan/i.test(message)) {
    return `${message} Upgrade to Standard!`;
  }

  return message;
}

function getAiUnavailableMessage(error: unknown) {
  const message = getApiErrorMessage(error);

  if (/openai|api key|quota|credit|billing|insufficient|model|ai|500|internal/i.test(message)) {
    return "AI is temporarily unavailable. Manual audit tools still work.";
  }

  return withUpgradePrompt(message);
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function daysFromNowIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isPageId(value: unknown): value is PageId {
  return typeof value === "string" && navItems.some((item) => item.id === value);
}

function metricTone(tone: string) {
  if (tone === "risk") return "bg-risk-soft text-risk";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "good") return "bg-good-soft text-good";
  return "bg-brand-soft text-brand";
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
