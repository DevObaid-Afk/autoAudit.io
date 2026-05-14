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
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  Bot,
  CalendarClock,
  Camera,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Crown,
  Download,
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
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent, ReactNode } from "react";
import { aiApi, analyticsApi, auditApi, authApi, billingApi, contactApi, profileApi, renewalApi, reportApi, vendorApi } from "../api/services";
import { getApiErrorMessage, resolveApiAssetUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter } from "../components/PublicFooter";
import { useTheme } from "../theme/ThemeContext";
import type { AiEmailGoal, ApiCompany, ApiContactRequest, ApiRenewal, ApiReport, ApiUser, ApiVendor, AuditSummary, AvatarAccess, AvatarStyle, CreateVendorInput, PaginationMeta } from "../types/api";

type PageId = "overview" | "vendors" | "waste" | "renewals" | "reports" | "email" | "billing" | "settings";
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
  owner: string;
  amount: number;
  risk: RiskLevel;
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
  { id: "email", label: "AI Email Generator", icon: Mail },
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
  savings: number;
  date: string;
  content?: string;
};

const integrations = [
  { name: "CSV import", status: "Available", detail: "Manual vendor and spend uploads are ready now." },
  { name: "Google Workspace", status: "Coming soon", detail: "Future account, app usage, and renewal-notice discovery." },
  { name: "Microsoft 365", status: "Coming soon", detail: "Future workspace and user activity signals." },
  { name: "QuickBooks", status: "Coming soon", detail: "Future accounting-side SaaS spend checks." },
  { name: "Stripe", status: "Coming soon", detail: "Future billing and subscription activation workflow." },
  { name: "Okta", status: "Coming soon", detail: "Future login activity and seat usage signals." },
  { name: "Slack alerts", status: "Coming soon", detail: "Future renewal and owner follow-up notifications." },
];

const planLimitSets = {
  free: { vendors: 10, reports: 1, aiEmails: 3, vendorAnalyses: 3 },
  starter: { vendors: 50, reports: 3, aiEmails: 0, vendorAnalyses: 0 },
  standard: { vendors: 200, reports: 25, aiEmails: 100, vendorAnalyses: 50 },
  growth: { vendors: 200, reports: 25, aiEmails: 100, vendorAnalyses: 50 },
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
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorQuery, setVendorQuery] = useState<VendorQueryState>(defaultVendorQuery);
  const [toast, setToast] = useState("");
  const [apiVendors, setApiVendors] = useState<ApiVendor[]>([]);
  const [apiRenewals, setApiRenewals] = useState<ApiRenewal[]>([]);
  const [apiReports, setApiReports] = useState<ApiReport[]>([]);
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
  const toastTimer = useRef<number | undefined>(undefined);

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? "Overview";
  const isTrialExpired = company ? getTrialState(company).isExpired : false;

  const dashboardVendors = useMemo(() => apiVendors.map(mapApiVendorToDashboardVendor), [apiVendors]);
  const renewalRows = useMemo(() => buildRenewalRows({ renewals: apiRenewals, auditSummary }), [apiRenewals, auditSummary]);
  const unusedSeatRows = useMemo(() => buildUnusedSeatRows(auditSummary), [auditSummary]);
  const duplicateToolRows = useMemo(() => buildDuplicateToolRows(auditSummary), [auditSummary]);
  const dashboardWasteSignals = useMemo(() => buildWasteSignals(auditSummary), [auditSummary]);
  const dashboardCategorySpend = useMemo(() => buildCategorySpend(apiVendors), [apiVendors]);
  const dashboardRenewalChart = useMemo(() => buildRenewalChart(renewalRows), [renewalRows]);
  const onboardingItems = useMemo<OnboardingItem[]>(() => {
    return [
      { label: "Load sample data", done: dashboardVendors.length > 0, page: "vendors" },
      { label: "Import CSV", done: dashboardVendors.length > 0, page: "vendors" },
      { label: "Review waste", done: dashboardWasteSignals.length > 0, page: "waste" },
      { label: "Generate report", done: Boolean(monthlyReportDraft || company?.planUsage?.reportsGenerated), page: "reports" },
      { label: "Create email draft", done: draft !== defaultDraft || Boolean(company?.planUsage?.aiEmailsGenerated), page: "email" },
    ];
  }, [company?.planUsage?.aiEmailsGenerated, company?.planUsage?.reportsGenerated, dashboardVendors.length, dashboardWasteSignals.length, draft, monthlyReportDraft]);

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

  async function refreshDashboardData() {
    setDataLoading(true);
    setVendorLoading(true);
    setDataError("");

    try {
      const [vendorsResponse, summaryResponse, renewalsResponse, reportsResponse] = await Promise.all([
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
      ]);

      setApiVendors(vendorsResponse.vendors);
      setVendorPagination(vendorsResponse.pagination);
      setVendorCategoryOptions(buildVendorCategoryOptions(vendorsResponse.vendors, vendorQuery.category));
      setAuditSummary(summaryResponse);
      setApiRenewals(renewalsResponse.renewals);
      setApiReports(reportsResponse.reports);
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
      await refreshDashboardData();
      showToast(`${vendor.name} added.`);
    } catch (error) {
      throw new Error(withUpgradePrompt(getApiErrorMessage(error)));
    }
  };

  const handleImportVendors = async (inputs: CreateVendorInput[]) => {
    if (isTrialExpired) {
      return { created: 0, failed: inputs.length, errors: ["Trial ended. Choose a plan before importing vendors."] };
    }

    const results = await Promise.allSettled(inputs.map((input) => vendorApi.create(input)));
    await refreshDashboardData();

    return {
      created: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
      errors: results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .slice(0, 3)
        .map((result) => getApiErrorMessage(result.reason)),
    };
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
      await refreshDashboardData();
      const created = results.filter((result) => result.status === "fulfilled").length;
      const firstError = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      analyticsApi.track("sample_data_loaded", { created });
      showToast(firstError ? withUpgradePrompt(getApiErrorMessage(firstError.reason)) : `${created} sample vendors loaded.`);
    } finally {
      setLoadingDemo(false);
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

  const handleGenerateMonthlyReport = async () => {
    if (isTrialExpired) {
      showToast("Trial ended. Choose a plan before generating reports.");
      return;
    }

    setReportGenerating(true);

    try {
      const { report } = await aiApi.monthlyReport({ audience: "CFO" });
      setMonthlyReportDraft(report);
      await refreshDashboardData();
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
      showToast(`${signal.vendor} waste explanation generated.`);
    } catch (error) {
      showToast(getAiUnavailableMessage(error));
    } finally {
      setWasteAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <PageMeta title="Dashboard - AutoAudit.ai" description="Signed-in AutoAudit.ai SaaS waste control dashboard." canonicalPath="/dashboard" noindex />
      <div className={`${isSidebarCollapsed ? "lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[244px_minmax(0,1fr)]"} lg:grid transition-[grid-template-columns] duration-300`}>
        <Sidebar activePage={activePage} isCollapsed={isSidebarCollapsed} isOpen={isMobileNavOpen} onClose={() => setMobileNavOpen(false)} onNavigate={handleNav} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} />

        <div className="min-w-0">
          <Topbar
            checklistItems={onboardingItems}
            companyName={company?.name ?? "Workspace"}
            pageTitle={pageTitle}
            searchValue={vendorSearch}
            userAvatarUrl={user?.avatarUrl}
            userName={user?.name ?? "User"}
            onGlobalSearch={handleGlobalSearch}
            onLogout={logout}
            onMenu={() => setMobileNavOpen(true)}
            onNavigate={handleNav}
            onRefresh={refreshDashboardData}
          />

          <main className="mx-auto max-w-[1480px] overflow-x-hidden px-3 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0 animate-[fadeIn_420ms_ease-out]">
              {dataError && <ErrorState message={dataError} onRetry={refreshDashboardData} />}
              {isDataLoading && <LoadingState label="Loading live audit data" />}
              {activePage === "overview" && <OverviewPage categoryData={dashboardCategorySpend} duplicateTools={duplicateToolRows} renewalRows={renewalRows} totals={totals} unusedSeats={unusedSeatRows} wasteSignals={dashboardWasteSignals} company={company} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "vendors" && <VendorsPage categoryOptions={vendorCategoryOptions} isLoading={isDataLoading || isVendorLoading} isLoadingDemo={isLoadingDemo} pagination={vendorPagination} query={vendorQuery} vendors={dashboardVendors} onCreateVendor={handleCreateVendor} onDeleteVendor={handleDeleteVendor} onImportVendors={handleImportVendors} onLoadDemoData={handleLoadDemoData} onQueryChange={handleVendorQueryChange} onToast={showToast} />}
              {activePage === "waste" && (
                <WasteDetectionPage
                  aiAnalysis={wasteAnalysis}
                  duplicateTools={duplicateToolRows}
                  hasVendors={dashboardVendors.length > 0}
                  isLoadingDemo={isLoadingDemo}
                  isAnalyzing={isWasteAnalyzing}
                  unusedSeats={unusedSeatRows}
                  wasteSignals={dashboardWasteSignals}
                  onExplainWaste={handleExplainWaste}
                  onLoadDemoData={handleLoadDemoData}
                  onNavigate={handleNav}
                  onRunDetection={handleSuggestDuplicateTools}
                  onToast={showToast}
                />
              )}
              {activePage === "renewals" && <RenewalsPage hasVendors={dashboardVendors.length > 0} isLoadingDemo={isLoadingDemo} renewalChartData={dashboardRenewalChart} renewalRows={renewalRows} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "reports" && <ReportsPage hasVendors={dashboardVendors.length > 0} isGenerating={isReportGenerating} isLoadingDemo={isLoadingDemo} reports={apiReports} reportDraft={monthlyReportDraft} trialExpired={isTrialExpired} onGenerateReport={handleGenerateMonthlyReport} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "email" && (
                <EmailGeneratorPage
                  vendors={dashboardVendors}
                  draft={draft}
                  emailTone={emailTone}
                  isLoadingDemo={isLoadingDemo}
                  onCopyDraft={copyDraft}
                  onDraftChange={setDraft}
                  onGenerate={async (vendorName, tone, goal) => {
                    if (isTrialExpired) {
                      throw new Error("Trial ended. Choose a plan before generating AI emails.");
                    }

                    const apiVendor = apiVendors.find((vendor) => vendor.name === vendorName);
                    const goalConfig = emailGoalOptions.find((item) => item.value === goal) ?? emailGoalOptions[0];
                    const generatedDraft =
                      goal === "cancel"
                        ? await aiApi.cancelEmail({ vendorId: apiVendor?._id, vendorName, tone: tone.toLowerCase(), requestedAction: goalConfig.actionLabel })
                        : await aiApi.renegotiateEmail({ vendorId: apiVendor?._id, vendorName, tone: tone.toLowerCase(), negotiationGoal: goalConfig.actionLabel });
                    setDraft(generatedDraft);
                    showToast("AI draft refreshed with company context.");
                  }}
                  onLoadDemoData={handleLoadDemoData}
                  onNavigate={handleNav}
                  onToneChange={setEmailTone}
                />
              )}
              {activePage === "billing" && <PlanPage company={company} vendorCount={dashboardVendors.length} onToast={showToast} />}
              {activePage === "settings" && <SettingsPage company={company} companySettings={company?.settings} user={user} onToast={showToast} onUserUpdate={updateUser} />}
              <div className="mt-6 grid gap-4">
                {user && !user.emailVerifiedAt && <EmailVerificationBanner email={user.email} onResend={handleResendVerification} />}
                {company && <TrialStatusBanner company={company} isLoadingDemo={isLoadingDemo} vendorCount={dashboardVendors.length} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} />}
              </div>
              <div className="mt-8 overflow-hidden rounded-lg border border-line shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
                <PublicFooter />
              </div>
            </div>
          </main>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function Sidebar({
  activePage,
  isCollapsed,
  isOpen,
  onClose,
  onNavigate,
  onToggleCollapse,
}: {
  activePage: PageId;
  isCollapsed: boolean;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onToggleCollapse: () => void;
}) {
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
          {navItems.map((item) => {
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
  userName,
  onGlobalSearch,
  onLogout,
  onMenu,
  onNavigate,
  onRefresh,
}: {
  checklistItems: OnboardingItem[];
  companyName: string;
  pageTitle: string;
  searchValue: string;
  userAvatarUrl?: string;
  userName: string;
  onGlobalSearch: (value: string) => void;
  onLogout: () => void;
  onMenu: () => void;
  onNavigate: (page: PageId) => void;
  onRefresh: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const [isChecklistOpen, setChecklistOpen] = useState(false);
  const initialsLabel = initials(userName || companyName);
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

        <button className="relative grid size-10 shrink-0 place-items-center rounded-lg border border-line/70 bg-panel/78 text-quiet transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted hover:text-brand" type="button" aria-label="Open renewal alerts" onClick={() => onNavigate("renewals")}>
          <Bell aria-hidden="true" size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-risk" />
        </button>

        <button className="flex shrink-0 items-center gap-2 rounded-lg border border-line/70 bg-panel/78 p-1.5 pr-3 transition hover:-translate-y-0.5 hover:border-brand/60 hover:bg-panel-muted" type="button" onClick={() => onNavigate("settings")}>
          <span className="grid size-8 overflow-hidden rounded-md bg-brand-soft text-xs font-extrabold text-brand-strong">
            {userAvatarUrl ? <img className="size-full object-cover" src={resolveApiAssetUrl(userAvatarUrl)} alt="" /> : <span className="grid size-full place-items-center">{initialsLabel}</span>}
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
  company,
  categoryData,
  duplicateTools,
  renewalRows,
  totals,
  unusedSeats,
  wasteSignals,
  onNavigate,
  onToast,
}: {
  company: ApiCompany | null;
  categoryData: typeof categorySpend;
  duplicateTools: DuplicateToolRow[];
  renewalRows: RenewalRow[];
  totals: DashboardTotals;
  unusedSeats: UnusedSeatRow[];
  wasteSignals: WasteSignal[];
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-5 overflow-hidden">
      <HeroBand totals={totals} wasteSignals={wasteSignals} onNavigate={onNavigate} />
      <SummaryGrid totals={totals} />

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
  const limits = getPlanLimitSet(company?.plan ?? "free");
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
  categoryOptions,
  isLoading,
  isLoadingDemo,
  pagination,
  query,
  vendors,
  onCreateVendor,
  onDeleteVendor,
  onImportVendors,
  onLoadDemoData,
  onQueryChange,
  onToast,
}: {
  categoryOptions: string[];
  isLoading: boolean;
  isLoadingDemo: boolean;
  pagination: PaginationMeta | null;
  query: VendorQueryState;
  vendors: Vendor[];
  onCreateVendor: (input: CreateVendorInput) => Promise<void>;
  onDeleteVendor: (vendor: Vendor) => Promise<void>;
  onImportVendors: (inputs: CreateVendorInput[]) => Promise<{ created: number; failed: number; errors: string[] }>;
  onLoadDemoData: () => Promise<void>;
  onQueryChange: (update: Partial<VendorQueryState>) => void;
  onToast: (message: string) => void;
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
          <Panel title={`${selectedVendor.name} profile`} eyebrow="Vendor detail" action={<PanelAction label="Close" onClick={() => setSelectedVendor(null)} />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PlanMetric label="Owner" value={selectedVendor.owner} />
              <PlanMetric label="Monthly spend" value={currency(selectedVendor.spend)} />
              <PlanMetric label="Seats active" value={`${selectedVendor.activeSeats} / ${selectedVendor.seats}`} />
              <PlanMetric label="Est. savings" value={currency(selectedVendor.savings)} />
            </div>
            <div className="mt-4 rounded-lg border border-line bg-panel-subtle p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="block text-sm font-extrabold">Recommended next step</strong>
                  <p className="mt-1 text-sm leading-6 text-quiet">
                    Review {selectedVendor.name} before {selectedVendor.renewal}. Current status: {selectedVendor.status}.
                  </p>
                </div>
                <RiskPill risk={selectedVendor.risk} label={selectedVendor.status} />
              </div>
            </div>
          </Panel>
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

function WasteDetectionPage({
  aiAnalysis,
  duplicateTools,
  hasVendors,
  isLoadingDemo,
  isAnalyzing,
  unusedSeats,
  wasteSignals,
  onExplainWaste,
  onLoadDemoData,
  onNavigate,
  onRunDetection,
  onToast,
}: {
  aiAnalysis: string;
  duplicateTools: DuplicateToolRow[];
  hasVendors: boolean;
  isLoadingDemo: boolean;
  isAnalyzing: boolean;
  unusedSeats: UnusedSeatRow[];
  wasteSignals: WasteSignal[];
  onExplainWaste: (signal: WasteSignal) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onRunDetection: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [actionQueue, setActionQueue] = useState<WasteSignal[]>([]);

  const queueAction = (signal: WasteSignal) => {
    setActionQueue((current) => {
      if (current.some((item) => item.title === signal.title)) {
        return current;
      }

      return [signal, ...current];
    });
  };

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
                {signal.evidence.length > 0 && (
                  <div className="mt-4 rounded-lg border border-line bg-panel p-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-brand-strong">
                      <ShieldCheck aria-hidden="true" size={15} />
                      Why flagged
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {signal.evidence.map((item) => (
                        <span className="rounded-lg bg-panel-muted px-3 py-2 text-sm font-bold leading-5 text-quiet" key={item}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => onExplainWaste(signal)}>Explain waste</SecondaryButton>
                  <PrimaryButton onClick={() => queueAction(signal)}>Create action</PrimaryButton>
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

      {actionQueue.length > 0 && (
        <Panel title="Action queue" eyebrow={`${actionQueue.length} active action${actionQueue.length === 1 ? "" : "s"}`}>
          <div className="grid gap-3">
            {actionQueue.map((action) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4" key={action.title}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <strong className="block text-sm font-extrabold">{action.vendor}</strong>
                    <p className="mt-1 text-sm leading-6 text-quiet">{action.detail}</p>
                  </div>
                  <span className="rounded-full bg-good-soft px-3 py-1.5 text-sm font-extrabold text-good">{currency(action.impact)}</span>
                </div>
              </article>
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
  onLoadDemoData,
  onNavigate,
  onToast,
}: {
  hasVendors: boolean;
  isLoadingDemo: boolean;
  renewalChartData: typeof renewalChart;
  renewalRows: RenewalRow[];
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRow | null>(renewalRows[0] ?? null);

  useEffect(() => {
    if (!selectedRenewal && renewalRows[0]) {
      setSelectedRenewal(renewalRows[0]);
    }
  }, [renewalRows, selectedRenewal]);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Contract control"
        title="Upcoming renewals"
        detail="Prioritize notice windows, contract owners, benchmark gaps, and savings opportunities before vendors auto-renew."
        action={<PrimaryButton onClick={() => exportRenewalCalendar(renewalRows, onToast)}>Export calendar</PrimaryButton>}
      />

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
            {renewalRows.length === 0 && (
              <EmptyState
                title={hasVendors ? "No upcoming renewals" : "No renewal data yet"}
                detail={hasVendors ? "Renewals appear here when vendors include renewal dates. Add dates to build an owner review queue before notice windows close." : "Load sample data or import a CSV with renewal dates to see contract exposure and calendar export."}
                action={<EmptySetupActions isLoadingDemo={isLoadingDemo} onLoadDemoData={onLoadDemoData} onNavigate={onNavigate} />}
              />
            )}
            {renewalRows.map((renewal) => (
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
  onGenerateReport: () => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const reportCards = savedReports.map(mapApiReportToCard);
  const visibleReports: ReportCard[] = reportCards.length > 0 ? reportCards : reports;
  const [selectedReport, setSelectedReport] = useState<ReportCard>(visibleReports[0]);

  useEffect(() => {
    setSelectedReport(visibleReports[0]);
  }, [savedReports.length]);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Board-ready output"
        title="Reports"
        detail="Generate monthly CFO packets, savings recaps, renewal briefs, and IT cleanup lists from the same audit data."
        action={<PrimaryButton onClick={onGenerateReport}>{trialExpired ? "Trial ended" : isGenerating ? "Generating..." : "Create AI report"}</PrimaryButton>}
      />

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
              <PanelAction label="Print PDF" onClick={() => printReportPdf(selectedReport, onToast)} />
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
  draft,
  emailTone,
  isLoadingDemo,
  vendors,
  onCopyDraft,
  onDraftChange,
  onGenerate,
  onLoadDemoData,
  onNavigate,
  onToneChange,
}: {
  draft: string;
  emailTone: string;
  isLoadingDemo: boolean;
  vendors: Vendor[];
  onCopyDraft: () => void;
  onDraftChange: (draft: string) => void;
  onGenerate: (vendorName: string, tone: string, goal: AiEmailGoal) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToneChange: (tone: string) => void;
}) {
  const [selectedVendor, setSelectedVendor] = useState(vendors[0]?.name ?? "Clearbit");
  const [selectedGoal, setSelectedGoal] = useState<AiEmailGoal>("cancel");
  const [isGenerating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const selectedVendorRecord = vendors.find((vendor) => vendor.name === selectedVendor);

  useEffect(() => {
    if (!selectedVendor && vendors[0]) {
      setSelectedVendor(vendors[0].name);
    }
  }, [selectedVendor, vendors]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      await onGenerate(selectedVendor || vendors[0]?.name || "Vendor", emailTone, selectedGoal);
    } catch (err) {
      setError(getAiUnavailableMessage(err));
    } finally {
      setGenerating(false);
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

        <Panel title="Vendor email draft" eyebrow="Editable output" action={<PanelAction label="Copy" onClick={onCopyDraft} />}>
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

function PlanPage({ company, vendorCount, onToast }: { company: ApiCompany | null; vendorCount: number; onToast: (message: string) => void }) {
  const trial = getTrialState(company);
  const planLabel = formatPlanLabel(company?.plan ?? "free");
  const limits = getPlanLimitSet(company?.plan ?? "free");
  const usage = getPlanUsage(company, vendorCount);
  const [requestedPlan, setRequestedPlan] = useState<"starter" | "standard" | "custom" | null>(null);
  const [isRequestingUpgrade, setRequestingUpgrade] = useState(false);
  const [isStartingCheckout, setStartingCheckout] = useState<"starter" | "standard" | null>(null);
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
            <PlanMetric label="Payments" value="Stripe-ready" />
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
            <div className="grid gap-2">
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(isStartingCheckout)} type="button" onClick={() => handleCheckout("starter")}>
                {isStartingCheckout === "starter" ? "Opening checkout..." : "Start Starter checkout"}
              </button>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(isStartingCheckout)} type="button" onClick={() => handleCheckout("standard")}>
                {isStartingCheckout === "standard" ? "Opening checkout..." : "Start Standard checkout"}
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
  const limits = getPlanLimitSet(company.plan);
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

const avatarStyleOptions: Array<{ value: AvatarStyle; label: string; detail: string }> = [
  { value: "professional_executive", label: "Professional Executive", detail: "Board-ready portrait with refined corporate lighting." },
  { value: "minimal_3d", label: "Minimal 3D", detail: "Dimensional but restrained, built for small UI surfaces." },
  { value: "modern_gradient_portrait", label: "Modern Gradient Portrait", detail: "Realistic portrait with subtle fintech color depth." },
  { value: "abstract_corporate", label: "Abstract Corporate", detail: "Clean executive silhouette with a polished abstract finish." },
  { value: "founder_style", label: "Founder Style", detail: "Approachable operator profile with smart casual presence." },
  { value: "cyber_minimal", label: "Cyber Minimal", detail: "Technical, minimal, and understated without security theatrics." },
  { value: "clean_illustrated", label: "Clean Illustrated", detail: "Mature editorial illustration for crisp dashboard use." },
  { value: "finance_ops", label: "Finance & Ops", detail: "Composed finance-operations leader in premium SaaS tones." },
];

function ProfileAvatarPanel({ company, user, onToast, onUserUpdate }: { company: ApiCompany; user: ApiUser; onToast: (message: string) => void; onUserUpdate: (user: ApiUser) => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarAccess, setAvatarAccess] = useState<AvatarAccess | null>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const avatarUrl = resolveApiAssetUrl(user.avatarUrl);

  useEffect(() => {
    let isMounted = true;
    profileApi
      .avatarAccess()
      .then((access) => {
        if (isMounted) setAvatarAccess(access);
      })
      .catch(() => {
        if (isMounted) setAvatarAccess(null);
      });

    return () => {
      isMounted = false;
    };
  }, [user.avatarGenerationUsage?.count, company.plan]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      onToast("Use a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onToast("Avatar image must be 5MB or smaller.");
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
    setMenuOpen(false);
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

  function openGenerationFlow() {
    setMenuOpen(false);
    if (!avatarAccess || avatarAccess.limit === 0 || !avatarAccess.canGenerate) {
      setUpgradeModalOpen(true);
      return;
    }
    setAvatarModalOpen(true);
  }

  return (
    <Panel title="Profile" eyebrow="Account identity">
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-line/55 bg-panel-subtle/60 p-3">
        <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-strong">
          <i className="fa-solid fa-user text-[15px]" aria-hidden="true" />
        </span>
        <div>
          <strong className="block text-sm font-extrabold">Profile identity</strong>
          <span className="mt-0.5 block text-xs font-bold text-quiet">Personal avatar, account image, and AI profile generation.</span>
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
            <button
              className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full border border-line/70 bg-panel/95 text-quiet shadow-xl transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
              type="button"
              aria-label="Edit profile image"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <Camera aria-hidden="true" size={16} />
            </button>
            {isMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-56 rounded-xl border border-line/70 bg-panel/95 p-2 shadow-2xl backdrop-blur-xl">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-panel-muted" type="button" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon aria-hidden="true" size={16} />
                  Upload image
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-panel-muted" type="button" onClick={openGenerationFlow}>
                  <Sparkles aria-hidden="true" size={16} />
                  Generate AI avatar
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-risk transition hover:bg-risk-soft" type="button" onClick={handleRemoveAvatar}>
                  <Trash2 aria-hidden="true" size={16} />
                  Remove image
                </button>
              </div>
            )}
            <input className="hidden" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} />
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-2xl font-extrabold">{user.name}</h3>
            <p className="mt-1 text-sm text-quiet">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-strong">{formatPlanLabel(company.plan)}</span>
              <span className="rounded-full bg-panel-subtle px-2.5 py-1 text-quiet">{user.avatarSource === "ai" ? "AI avatar" : user.avatarSource === "upload" ? "Uploaded image" : "Initials avatar"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line/55 bg-panel-subtle/72 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-quiet">AI avatar generations</span>
            <span className="rounded-full bg-inverse px-2.5 py-1 text-xs font-extrabold text-inverse-ink">{avatarAccess ? formatGenerationLimit(avatarAccess) : "Loading"}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-quiet">
            Create a professional dashboard-ready avatar with OpenAI image generation. Available on paid plans only.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <SecondaryButton onClick={() => fileInputRef.current?.click()}>{isUploading ? "Uploading..." : "Upload"}</SecondaryButton>
            <PrimaryButton onClick={openGenerationFlow}>Generate AI avatar</PrimaryButton>
          </div>
        </div>
      </div>

      {isAvatarModalOpen && avatarAccess && (
        <AiAvatarModal
          access={avatarAccess}
          user={user}
          onClose={() => setAvatarModalOpen(false)}
          onToast={onToast}
          onUserUpdate={onUserUpdate}
          onAccessChange={setAvatarAccess}
        />
      )}
      {isUpgradeModalOpen && <AvatarUpgradeModal company={company} onClose={() => setUpgradeModalOpen(false)} />}
    </Panel>
  );
}

function AiAvatarModal({
  access,
  user,
  onAccessChange,
  onClose,
  onToast,
  onUserUpdate,
}: {
  access: AvatarAccess;
  user: ApiUser;
  onAccessChange: (access: AvatarAccess) => void;
  onClose: () => void;
  onToast: (message: string) => void;
  onUserUpdate: (user: ApiUser) => void;
}) {
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>("professional_executive");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [isGenerating, setGenerating] = useState(false);
  const [isSaving, setSaving] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const result = await profileApi.generateAvatar(selectedStyle);
      setGeneratedUrl(result.generatedUrl);
      onAccessChange(result.avatar);
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!generatedUrl) return;
    setSaving(true);
    try {
      const nextUser = await profileApi.saveGeneratedAvatar(generatedUrl);
      onUserUpdate(nextUser);
      onToast("AI avatar saved.");
      onClose();
    } catch (error) {
      onToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Generate AI avatar" eyebrow="Premium personalization" onClose={onClose}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4">
          <div className="rounded-lg border border-line/55 bg-panel-subtle/72 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-extrabold">Choose a professional style</span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand-strong">{formatGenerationLimit(access)} left</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {avatarStyleOptions.map((style) => (
                <button
                  className={`rounded-lg border p-3 text-left transition hover:-translate-y-0.5 ${selectedStyle === style.value ? "border-brand bg-brand-soft shadow-[0_14px_34px_rgb(var(--color-brand)/0.16)]" : "border-line/55 bg-panel/70 hover:border-brand/50"}`}
                  type="button"
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                >
                  <strong className="block text-sm font-extrabold">{style.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-quiet">{style.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line/55 bg-panel-subtle/72 p-4">
            <span className="text-sm font-extrabold">Preview direction</span>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {avatarStyleOptions.slice(0, 4).map((style) => (
                <div className={`aspect-square rounded-lg border ${selectedStyle === style.value ? "border-brand bg-brand-soft" : "border-line/55 bg-panel-muted/60"}`} key={style.value}>
                  <div className="grid size-full place-items-center text-brand-strong">
                    <ImageIcon aria-hidden="true" size={22} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line/55 bg-inverse p-4 text-inverse-ink shadow-2xl">
          <div className="aspect-square overflow-hidden rounded-xl border border-inverse-ink/10 bg-inverse-ink/[0.06]">
            {isGenerating ? (
              <div className="grid size-full place-items-center p-5 text-center">
                <span className="size-11 animate-spin rounded-full border-2 border-inverse-ink/20 border-t-brand" />
                <span className="mt-4 block text-sm font-extrabold">Generating your avatar...</span>
                <span className="mt-1 block text-xs leading-5 text-inverse-ink/60">OpenAI is creating a square dashboard-ready portrait.</span>
              </div>
            ) : generatedUrl ? (
              <img className="size-full object-cover animate-[fadeIn_420ms_ease-out]" src={resolveApiAssetUrl(generatedUrl)} alt="Generated AI avatar preview" />
            ) : (
              <div className="grid size-full place-items-center p-5 text-center">
                <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand-strong">
                  <Sparkles aria-hidden="true" size={28} />
                </span>
                <span className="mt-4 block text-sm font-extrabold">Ready to generate</span>
                <span className="mt-1 block text-xs leading-5 text-inverse-ink/60">Square, clean, and optimized for the dashboard.</span>
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-2">
            <PrimaryButton onClick={generate}>{generatedUrl ? "Regenerate" : "Generate"}</PrimaryButton>
            {generatedUrl && (
              <>
                <SecondaryButton onClick={save}>{isSaving ? "Saving..." : "Save avatar"}</SecondaryButton>
                <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-inverse-ink/15 px-4 text-sm font-extrabold text-inverse-ink transition hover:-translate-y-0.5 hover:bg-inverse-ink/10" href={resolveApiAssetUrl(generatedUrl)} download>
                  <Download aria-hidden="true" size={16} />
                  Download
                </a>
              </>
            )}
            <button className="min-h-10 rounded-lg text-sm font-extrabold text-inverse-ink/70 transition hover:text-inverse-ink" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-quiet">Generated images are stored as avatar files and only the image URL is saved to your account record.</p>
    </ModalFrame>
  );
}

function AvatarUpgradeModal({ company, onClose }: { company: ApiCompany; onClose: () => void }) {
  return (
    <ModalFrame title="AI avatars are a paid personalization feature" eyebrow="Premium" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-extrabold text-brand-strong">
            <Crown aria-hidden="true" size={15} />
            Premium profile system
          </div>
          <p className="mt-4 text-sm leading-6 text-quiet">
            Uploading and removing profile images is included on every plan. AI avatar generation uses OpenAI image generation and is reserved for paid workspaces with monthly limits.
          </p>
          <div className="mt-5 grid gap-2">
            <a className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong hover:text-inverse-action-ink" href="/pricing">
              View plans
            </a>
            <button className="min-h-10 rounded-lg border border-line/60 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand" type="button" onClick={onClose}>
              Keep current plan
            </button>
          </div>
        </div>
        <div className="grid gap-2">
          {[
            { plan: "Free", detail: "Upload, remove, initials avatar" },
            { plan: "Starter", detail: "3 AI generations/month" },
            { plan: "Pro", detail: "20 AI generations/month" },
            { plan: "Enterprise", detail: "Custom generation limits" },
          ].map((item) => (
            <div className={`rounded-lg border p-3 ${formatPlanLabel(company.plan).startsWith(item.plan) ? "border-brand bg-brand-soft" : "border-line/55 bg-panel-subtle/72"}`} key={item.plan}>
              <strong className="block text-sm font-extrabold">{item.plan}</strong>
              <span className="mt-1 block text-xs leading-5 text-quiet">{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalFrame>
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

function formatGenerationLimit(access: AvatarAccess) {
  if (access.limit === null) return "Unlimited";
  return `${access.remaining} / ${access.limit}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function SettingsPage({
  company,
  companySettings,
  user,
  onToast,
  onUserUpdate,
}: {
  company: ApiCompany | null;
  companySettings: ApiCompany["settings"];
  user: ApiUser | null;
  onToast: (message: string) => void;
  onUserUpdate: (user: ApiUser) => void;
}) {
  const [settings, setSettings] = useState(() => {
    return mapCompanySettings(companySettings);
  });
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

  return (
    <div className={`rounded-lg border border-line/55 bg-panel-subtle/72 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-quiet">{label}</span>
        <strong className={`text-sm font-extrabold ${isAtLimit ? "text-risk" : "text-ink"}`}>{limit === null ? `${cappedUsed} / Custom` : `${cappedUsed} / ${limit}`}</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-muted">
        <div className={`h-full rounded-full ${isAtLimit ? "bg-risk" : "bg-brand"}`} style={{ width: limit === null ? "18%" : `${percent}%` }} />
      </div>
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
  return (summary?.wasteSignals ?? []).map((signal) => ({
    vendorId: signal.vendorId,
    title: signal.recommendation,
    vendor: signal.vendorName ?? signal.category ?? "Multiple vendors",
    impact: signal.annualImpact,
    confidence: signal.confidence,
    detail: signal.recommendation,
    evidence: signal.evidence ?? [],
    type: signal.type === "zombie_subscription" ? "Zombie app" : signal.type === "unused_seats" ? "Unused seats" : "Duplicate tool",
  }));
}

function buildRenewalRows({ renewals, auditSummary }: { renewals: ApiRenewal[]; auditSummary: AuditSummary | null }): RenewalRow[] {
  const renewalRowsFromApi = renewals.map((renewal) => ({
    id: renewal._id,
    vendor: renewal.vendor?.name ?? "Vendor",
    date: formatShortDate(renewal.renewalDate),
    owner: renewal.vendor?.ownerName ?? "Unassigned",
    amount: Number(renewal.contractValue ?? 0),
    risk: renewal.riskLevel,
  }));

  if (renewalRowsFromApi.length > 0) {
    return renewalRowsFromApi;
  }

  return (auditSummary?.upcomingRenewals ?? []).map((renewal) => ({
    id: renewal.id,
    vendor: renewal.vendorName ?? "Vendor",
    date: formatShortDate(renewal.renewalDate),
    owner: "Unassigned",
    amount: Number(renewal.contractValue ?? 0),
    risk: renewal.riskLevel,
  }));
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
    starter: "Starter trial",
    standard: "Standard trial",
    growth: "Growth",
    enterprise: "Enterprise",
    custom: "Custom plan",
  } satisfies Record<ApiCompany["plan"], string>;

  return labels[plan] ?? "Free trial";
}

function getPlanLimitSet(plan: ApiCompany["plan"]) {
  return planLimitSets[plan] ?? planLimitSets.free;
}

function getPlanUsage(company: ApiCompany | null, vendorCount: number) {
  return {
    vendors: vendorCount,
    reports: Number(company?.planUsage?.reportsGenerated ?? 0),
    aiEmails: Number(company?.planUsage?.aiEmailsGenerated ?? 0),
    vendorAnalyses: Number(company?.planUsage?.vendorAnalysesGenerated ?? 0),
  };
}

function formatLimit(value: number | null) {
  return value === null ? "Custom" : String(value);
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
