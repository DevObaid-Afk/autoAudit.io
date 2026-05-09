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
  ArrowDownRight,
  BadgeDollarSign,
  Bell,
  Bot,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Filter,
  Inbox,
  LayoutDashboard,
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
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent, ReactNode } from "react";
import { aiApi, auditApi, profileApi, renewalApi, vendorApi } from "../api/services";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import type { AiEmailGoal, ApiCompany, ApiRenewal, ApiVendor, AuditSummary, CreateVendorInput, PaginationMeta } from "../types/api";

type PageId = "overview" | "vendors" | "waste" | "renewals" | "reports" | "email" | "billing" | "settings";
type RiskLevel = "critical" | "high" | "medium" | "low";
type VendorStatus = "Healthy" | "Zombie" | "Duplicate" | "Renewal risk" | "Unused seats";

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
  type: "Zombie app" | "Unused seats" | "Duplicate tool" | "Renewal";
};

type PlanLimitSet = {
  vendors: number | null;
  reports: number | null;
  aiEmails: number | null;
  vendorAnalyses: number | null;
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
  { name: "Sales", value: 31200, color: "#087f8c" },
  { name: "Ops", value: 22600, color: "#2f6fed" },
  { name: "Product", value: 18400, color: "#8a5a00" },
  { name: "Marketing", value: 15600, color: "#b3261e" },
  { name: "People", value: 9400, color: "#137333" },
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

const integrations = [
  { name: "CSV import", status: "Available", detail: "Manual vendor and spend uploads are ready now." },
  { name: "Gmail", status: "Coming soon", detail: "Future receipt and renewal notice discovery." },
  { name: "Ramp", status: "Coming soon", detail: "Future card and AP spend syncing." },
  { name: "Okta", status: "Coming soon", detail: "Future login activity and seat usage signals." },
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

const defaultDraft = `Hi Clearbit team,

We are reviewing our SaaS stack and found no meaningful Clearbit usage in the last quarter.

Please cancel renewal for the current contract and confirm the final service date. If there is a lower-commitment option, please send pricing for 5 active seats.

Thank you,
Finance Team`;

export function DashboardPage() {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const sectionParam = params.section as PageId | undefined;
  const [activePage, setActivePage] = useState<PageId>(isPageId(sectionParam) ? sectionParam : "overview");
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);
  const [emailTone, setEmailTone] = useState("Direct");
  const [vendorSearch, setVendorSearch] = useState("");
  const [toast, setToast] = useState("");
  const [apiVendors, setApiVendors] = useState<ApiVendor[]>([]);
  const [apiRenewals, setApiRenewals] = useState<ApiRenewal[]>([]);
  const [vendorPagination, setVendorPagination] = useState<PaginationMeta | null>(null);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [isDataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [monthlyReportDraft, setMonthlyReportDraft] = useState("");
  const [isReportGenerating, setReportGenerating] = useState(false);
  const [wasteAnalysis, setWasteAnalysis] = useState("");
  const [isWasteAnalyzing, setWasteAnalyzing] = useState(false);
  const [isLoadingDemo, setLoadingDemo] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? "Overview";

  const dashboardVendors = useMemo(() => apiVendors.map(mapApiVendorToDashboardVendor), [apiVendors]);
  const renewalRows = useMemo(() => buildRenewalRows({ renewals: apiRenewals, auditSummary }), [apiRenewals, auditSummary]);
  const unusedSeatRows = useMemo(() => buildUnusedSeatRows(auditSummary), [auditSummary]);
  const duplicateToolRows = useMemo(() => buildDuplicateToolRows(auditSummary), [auditSummary]);
  const dashboardWasteSignals = useMemo(() => buildWasteSignals(auditSummary), [auditSummary]);
  const dashboardCategorySpend = useMemo(() => buildCategorySpend(apiVendors), [apiVendors]);
  const dashboardRenewalChart = useMemo(() => buildRenewalChart(renewalRows), [renewalRows]);

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
  useEffect(() => {
    if (sectionParam && isPageId(sectionParam)) {
      setActivePage(sectionParam);
    }
  }, [sectionParam]);

  async function refreshDashboardData() {
    setDataLoading(true);
    setDataError("");

    try {
      const [vendorsResponse, summaryResponse, renewalsResponse] = await Promise.all([
        vendorApi.list({ limit: 100 }),
        auditApi.summary(),
        renewalApi.list({ limit: 100 }),
      ]);

      setApiVendors(vendorsResponse.vendors);
      setVendorPagination(vendorsResponse.pagination);
      setAuditSummary(summaryResponse);
      setApiRenewals(renewalsResponse.renewals);
    } catch (error) {
      setDataError(getApiErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboardData();
  }, []);

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
    if (value.trim() && activePage !== "vendors") {
      handleNav("vendors");
    }
  };

  const handleCreateVendor = async (input: CreateVendorInput) => {
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

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      showToast("Email draft copied.");
    } catch {
      showToast("Select the draft text to copy it.");
    }
  };

  const handleGenerateMonthlyReport = async () => {
    setReportGenerating(true);

    try {
      const { report } = await aiApi.monthlyReport({ audience: "CFO" });
      setMonthlyReportDraft(report);
      showToast("AI CFO report generated.");
    } catch (error) {
      showToast(withUpgradePrompt(getApiErrorMessage(error)));
    } finally {
      setReportGenerating(false);
    }
  };

  const handleSuggestDuplicateTools = async () => {
    setWasteAnalyzing(true);

    try {
      const analysis = await aiApi.vendorAnalysis({ mode: "duplicate_tools" });
      setWasteAnalysis(analysis);
      showToast("AI duplicate-tool suggestions generated.");
    } catch (error) {
      showToast(withUpgradePrompt(getApiErrorMessage(error)));
    } finally {
      setWasteAnalyzing(false);
    }
  };

  const handleExplainWaste = async (signal: WasteSignal) => {
    setWasteAnalyzing(true);

    try {
      const analysis = await aiApi.vendorAnalysis({ vendorId: signal.vendorId, vendorName: signal.vendor, mode: "waste_explanation" });
      setWasteAnalysis(analysis);
      showToast(`${signal.vendor} waste explanation generated.`);
    } catch (error) {
      showToast(withUpgradePrompt(getApiErrorMessage(error)));
    } finally {
      setWasteAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="lg:grid lg:grid-cols-[286px_minmax(0,1fr)]">
        <Sidebar activePage={activePage} isOpen={isMobileNavOpen} onClose={() => setMobileNavOpen(false)} onNavigate={handleNav} />

        <div className="min-w-0">
          <Topbar
            companyName={company?.name ?? "Workspace"}
            pageTitle={pageTitle}
            searchValue={vendorSearch}
            userName={user?.name ?? "User"}
            onGlobalSearch={handleGlobalSearch}
            onLogout={logout}
            onMenu={() => setMobileNavOpen(true)}
            onNavigate={handleNav}
            onRefresh={refreshDashboardData}
          />

          <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 lg:px-8">
            <div className="animate-[fadeIn_420ms_ease-out]">
              {company && <TrialStatusBanner company={company} isLoadingDemo={isLoadingDemo} vendorCount={dashboardVendors.length} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} />}
              {dataError && <ErrorState message={dataError} onRetry={refreshDashboardData} />}
              {isDataLoading && <LoadingState label="Loading live audit data" />}
              {activePage === "overview" && <OverviewPage categoryData={dashboardCategorySpend} duplicateTools={duplicateToolRows} totals={totals} unusedSeats={unusedSeatRows} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "vendors" && <VendorsPage externalQuery={vendorSearch} isLoading={isDataLoading} isLoadingDemo={isLoadingDemo} pagination={vendorPagination} vendors={dashboardVendors} onCreateVendor={handleCreateVendor} onDeleteVendor={handleDeleteVendor} onImportVendors={handleImportVendors} onLoadDemoData={handleLoadDemoData} onSearchChange={setVendorSearch} onToast={showToast} />}
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
              {activePage === "reports" && <ReportsPage hasVendors={dashboardVendors.length > 0} isGenerating={isReportGenerating} isLoadingDemo={isLoadingDemo} reportDraft={monthlyReportDraft} onGenerateReport={handleGenerateMonthlyReport} onLoadDemoData={handleLoadDemoData} onNavigate={handleNav} onToast={showToast} />}
              {activePage === "email" && (
                <EmailGeneratorPage
                  vendors={dashboardVendors}
                  draft={draft}
                  emailTone={emailTone}
                  isLoadingDemo={isLoadingDemo}
                  onCopyDraft={copyDraft}
                  onDraftChange={setDraft}
                  onGenerate={async (vendorName, tone, goal) => {
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
              {activePage === "settings" && <SettingsPage companySettings={company?.settings} onToast={showToast} />}
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
  isOpen,
  onClose,
  onNavigate,
}: {
  activePage: PageId;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <>
      <div className={`fixed inset-0 z-40 bg-inverse/35 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-line bg-panel/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <button className="flex items-center gap-3 text-left" type="button" onClick={() => onNavigate("overview")}>
            <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand shadow-sm">
              <ShieldCheck aria-hidden="true" size={27} strokeWidth={2.2} />
            </span>
            <span>
              <strong className="block text-[15px] font-extrabold">AutoAudit.ai</strong>
              <span className="mt-0.5 block text-xs font-semibold text-quiet">SaaS waste control</span>
            </span>
          </button>
          <button className="grid size-9 place-items-center rounded-lg text-quiet hover:bg-panel-muted lg:hidden" type="button" onClick={onClose} aria-label="Close navigation">
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <nav className="grid gap-1 px-3" aria-label="Dashboard pages">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activePage;

            return (
              <button
                className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-extrabold transition duration-200 ${isActive ? "bg-brand text-white shadow-[0_10px_24px_rgba(8,127,140,0.24)]" : "text-quiet hover:bg-panel-muted hover:text-ink"
                  }`}
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
              >
                <Icon aria-hidden="true" size={18} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight aria-hidden="true" size={16} />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3 p-4">
          <div className="rounded-lg border border-line bg-panel-subtle p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-quiet">Audit coverage</span>
              <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-extrabold text-brand-strong">82%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-panel-muted">
              <div className="h-2 w-[82%] rounded-full bg-brand" />
            </div>
            <p className="mt-3 text-sm leading-6 text-quiet">CSV imports are ready. Gmail, Ramp, and Okta are planned integrations.</p>
          </div>

          <button className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-inverse px-4 text-sm font-extrabold text-inverse-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg active:translate-y-0" type="button" onClick={() => onNavigate("waste")}>
            <Zap aria-hidden="true" size={17} />
            Run new audit
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  companyName,
  pageTitle,
  searchValue,
  userName,
  onGlobalSearch,
  onLogout,
  onMenu,
  onNavigate,
  onRefresh,
}: {
  companyName: string;
  pageTitle: string;
  searchValue: string;
  userName: string;
  onGlobalSearch: (value: string) => void;
  onLogout: () => void;
  onMenu: () => void;
  onNavigate: (page: PageId) => void;
  onRefresh: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const initialsLabel = initials(userName || companyName);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1500px] gap-3 px-3 py-3 sm:px-6 lg:flex lg:items-center lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
        <button className="grid size-10 place-items-center rounded-lg border border-line bg-panel text-quiet lg:hidden" type="button" onClick={onMenu} aria-label="Open navigation">
          <Menu aria-hidden="true" size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Authenticated workspace</p>
          <h1 className="truncate text-xl font-extrabold tracking-normal sm:text-2xl">{pageTitle}</h1>
        </div>
        </div>

        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-quiet lg:ml-auto lg:w-[360px]">
          <Search aria-hidden="true" size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-quiet"
            value={searchValue}
            placeholder="Search vendors, owners, categories"
            onChange={(event) => onGlobalSearch(event.target.value)}
          />
        </label>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
        <button className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand" type="button" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" size={17} />
          Sync
        </button>

        <button
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-panel text-quiet transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand"
          type="button"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
        </button>

        <button className="relative grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-panel text-quiet transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand" type="button" aria-label="Open renewal alerts" onClick={() => onNavigate("renewals")}>
          <Bell aria-hidden="true" size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-risk" />
        </button>

        <button className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-panel p-1.5 pr-3 transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted" type="button" onClick={() => onNavigate("settings")}>
          <span className="grid size-8 place-items-center rounded-md bg-brand text-xs font-extrabold text-white">{initialsLabel}</span>
          <span className="hidden text-sm font-extrabold sm:block">{companyName}</span>
        </button>

        <button
          className="group hidden min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-extrabold text-quiet shadow-sm transition hover:-translate-y-0.5 hover:border-risk hover:bg-risk-soft hover:text-risk hover:shadow-md active:translate-y-0 sm:inline-flex"
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
  categoryData,
  duplicateTools,
  totals,
  unusedSeats,
  onNavigate,
  onToast,
}: {
  categoryData: typeof categorySpend;
  duplicateTools: DuplicateToolRow[];
  totals: DashboardTotals;
  unusedSeats: UnusedSeatRow[];
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <HeroBand onNavigate={onNavigate} />
      <SummaryGrid totals={totals} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <Panel title="Spend, waste, and savings" eyebrow="Monthly trend" action={<PanelAction label="Open reports" onClick={() => onNavigate("reports")} />}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 320 }}>
              <AreaChart data={spendTrend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#087f8c" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#087f8c" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="wasteFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#b3261e" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#b3261e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#dce4e8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#66747d", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} tick={{ fill: "#66747d", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="#087f8c" strokeWidth={3} fill="url(#spendFill)" />
                <Area type="monotone" dataKey="waste" name="Waste found" stroke="#b3261e" strokeWidth={3} fill="url(#wasteFill)" />
                <Line type="monotone" dataKey="savings" name="Savings captured" stroke="#137333" strokeWidth={3} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Spend by function" eyebrow="Category map" action={<PanelAction label="Review vendors" onClick={() => onNavigate("vendors")} />}>
          <div className="h-[320px]">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <UnusedSeatsTable rows={unusedSeats} />
        <DuplicateToolsPanel rows={duplicateTools} />
      </div>
    </div>
  );
}

function VendorsPage({
  externalQuery,
  isLoading,
  isLoadingDemo,
  pagination,
  vendors,
  onCreateVendor,
  onDeleteVendor,
  onImportVendors,
  onLoadDemoData,
  onSearchChange,
  onToast,
}: {
  externalQuery: string;
  isLoading: boolean;
  isLoadingDemo: boolean;
  pagination: PaginationMeta | null;
  vendors: Vendor[];
  onCreateVendor: (input: CreateVendorInput) => Promise<void>;
  onDeleteVendor: (vendor: Vendor) => Promise<void>;
  onImportVendors: (inputs: CreateVendorInput[]) => Promise<{ created: number; failed: number; errors: string[] }>;
  onLoadDemoData: () => Promise<void>;
  onSearchChange: (value: string) => void;
  onToast: (message: string) => void;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setImporting] = useState(false);
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

  const filteredVendors = vendors.filter((vendor) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      vendor.name.toLowerCase().includes(normalizedQuery) ||
      vendor.owner.toLowerCase().includes(normalizedQuery) ||
      vendor.category.toLowerCase().includes(normalizedQuery) ||
      vendor.status.toLowerCase().includes(normalizedQuery);
    const matchesStatus = status === "All" || vendor.status === status;
    return matchesQuery && matchesStatus;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleVendors = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  useEffect(() => {
    setQuery(externalQuery);
  }, [externalQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearchChange(value);
  };

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

    setImporting(true);
    setImportMessage("");
    setImportError("");

    try {
      const text = await file.text();
      const inputs = parseVendorCsv(text);
      const result = await onImportVendors(inputs);
      const successMessage = result.failed > 0 ? `Imported ${result.created} vendors. ${result.failed} rows need review.` : `Imported ${result.created} vendors.`;

      setImportMessage(successMessage);
      setImportError(result.errors.join(" "));
      onToast(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : getApiErrorMessage(error);
      setImportError(message);
      onToast(message);
    } finally {
      setImporting(false);
      event.target.value = "";
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

      {(importMessage || importError) && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${importError ? "border-risk/20 bg-risk-soft text-risk" : "border-good/20 bg-good-soft text-good"}`}>
          {importError || importMessage}
        </div>
      )}

      <Panel
        title="Vendor directory"
        eyebrow={isLoading ? "Loading vendors" : `${filteredVendors.length} vendors shown${pagination ? ` of ${pagination.total}` : ""}`}
        action={
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <SearchBox value={query} onChange={handleQueryChange} />
            <SelectPill value={status} onChange={setStatus} values={["All", "Healthy", "Zombie", "Duplicate", "Renewal risk", "Unused seats"]} />
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
        ) : filteredVendors.length === 0 ? (
          <EmptyState
            title="No vendors yet"
            detail="Add your first vendor to see live spend, renewal, and waste detection data from the backend."
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
              <SecondaryButton onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</SecondaryButton>
              <SecondaryButton onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</SecondaryButton>
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
        detail="AutoAudit maps spend, receipts, usage, seats, and renewal windows to prioritize the highest-value actions."
        action={<PrimaryButton onClick={onRunDetection}>{isAnalyzing ? "Analyzing..." : "Run AI detection"}</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Recommended actions" eyebrow="Highest impact first">
          <div className="grid gap-3">
            {wasteSignals.length === 0 && (
              <EmptyState
                title={hasVendors ? "No waste signals yet" : "No vendor data yet"}
                detail={hasVendors ? "Add spend, seats, usage, and renewal dates to sharpen waste findings." : "Load sample vendors or import a CSV to generate live waste findings."}
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
                <Bar dataKey="impact" name="Savings" radius={[0, 8, 8, 0]} fill="#087f8c" />
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
                <Bar dataKey="amount" name="Renewal exposure" radius={[8, 8, 0, 0]} fill="#8a5a00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Notice windows" eyebrow="Action required">
          <div className="grid gap-3">
            {renewalRows.length === 0 && (
              <EmptyState
                title={hasVendors ? "No upcoming renewals" : "No renewal data yet"}
                detail={hasVendors ? "Renewals will appear here when vendors include renewal dates." : "Load sample data or import a CSV with renewal dates to build the renewal queue."}
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
  reportDraft,
  onGenerateReport,
  onLoadDemoData,
  onNavigate,
  onToast,
}: {
  hasVendors: boolean;
  isGenerating: boolean;
  isLoadingDemo: boolean;
  reportDraft: string;
  onGenerateReport: () => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [selectedReport, setSelectedReport] = useState(reports[0]);

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Board-ready output"
        title="Reports"
        detail="Generate monthly CFO packets, savings recaps, renewal briefs, and IT cleanup lists from the same audit data."
        action={<PrimaryButton onClick={onGenerateReport}>{isGenerating ? "Generating..." : "Create AI report"}</PrimaryButton>}
      />

      {!hasVendors && (
        <EmptyState
          title="Reports need vendor data"
          detail="Load sample vendors or import your own CSV before generating CFO-ready savings reports."
          action={<EmptySetupActions isLoadingDemo={isLoadingDemo} onLoadDemoData={onLoadDemoData} onNavigate={onNavigate} />}
          icon={FileText}
        />
      )}

      {hasVendors && <div className="grid gap-4 lg:grid-cols-3">
        {reports.map((report) => (
          <article className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)] transition hover:-translate-y-1 hover:shadow-xl" key={report.name}>
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
        <Panel title={selectedReport.name} eyebrow="Report preview" action={<PanelAction label="Download summary" onClick={() => downloadTextFile(`${selectedReport.name}.txt`, buildReportSummary(selectedReport), onToast)} />}>
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-lg border border-line bg-panel-subtle p-4">
              <h3 className="font-extrabold">Executive summary</h3>
              <p className="mt-2 text-sm leading-7 text-quiet">{buildReportSummary(selectedReport)}</p>
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
              <Line type="monotone" dataKey="savings" name="Savings captured" stroke="#137333" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="waste" name="Waste found" stroke="#b3261e" strokeWidth={3} dot={{ r: 4 }} />
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
      setError(withUpgradePrompt(getApiErrorMessage(err)));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="AI workflow"
        title="AI Email Generator"
        detail="Draft cancellation, renegotiation, owner follow-up, and renewal notice emails using audit evidence and company context."
        action={<PrimaryButton onClick={handleGenerate}>{isGenerating ? "Generating..." : "Generate draft"}</PrimaryButton>}
      />

      {vendors.length === 0 && (
        <EmptyState
          title="Email drafts need a vendor"
          detail="Load sample data or import your vendor list so AutoAudit can attach spend, seats, renewal, and savings context to the draft."
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
            <PlanMetric label="Payments" value="Manual" />
          </div>
          <div className="mt-5 rounded-lg border border-line bg-panel-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-lg font-extrabold">Payments are not automated yet</strong>
                <p className="mt-1 text-sm leading-6 text-quiet">Customers can use the product first. Paid plan activation can be handled manually until a payment provider is connected.</p>
              </div>
              <span className="rounded-full bg-good-soft px-3 py-1.5 text-sm font-extrabold text-good">No card required</span>
            </div>
          </div>
        </Panel>

        <Panel title="Upgrade path" eyebrow="Next step">
          <div className="grid gap-3 text-sm leading-6 text-quiet">
            <p>Use Starter at $49/mo for core audits, or Standard at $89/mo for AI reports and action drafts.</p>
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => { window.location.href = "/pricing"; }}>
              Compare plans
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand"
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText("exehassan62@gmail.com").then(
                  () => onToast("Contact email copied."),
                  () => onToast("Email exehassan62@gmail.com for a custom plan."),
                );
              }}
            >
              Request custom plan
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="What happens after payment integration" eyebrow="Future billing">
        <div className="grid gap-3 md:grid-cols-3">
          {["Automatic subscriptions", "Real invoices", "Plan-based feature limits"].map((item) => (
            <div className="rounded-lg border border-line bg-panel-subtle p-4" key={item}>
              <strong className="block text-sm font-extrabold">{item}</strong>
              <p className="mt-2 text-sm leading-6 text-quiet">This can be added after the first paying users validate the pricing.</p>
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
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={() => { window.location.href = "/pricing"; }}>
              Upgrade to Standard!
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

function SettingsPage({ companySettings, onToast }: { companySettings: ApiCompany["settings"]; onToast: (message: string) => void }) {
  const [settings, setSettings] = useState(() => {
    return mapCompanySettings(companySettings);
  });
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(mapCompanySettings(companySettings));
  }, [companySettings]);

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

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Workspace controls"
        title="Settings"
        detail="Manage data sources, users, approval rules, report cadence, and finance ownership."
        action={<PrimaryButton onClick={handleSaveSettings}>{isSaving ? "Saving..." : "Save settings"}</PrimaryButton>}
      />

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

      <Panel title="How to use AutoAudit.ai" eyebrow="Manual">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "1. Add vendors",
              detail: "Open Vendors, add each SaaS tool, monthly spend, owner, seats, last-used date, and renewal date.",
            },
            {
              title: "2. Review waste",
              detail: "Use Waste Detection to find zombie subscriptions, unused seats, duplicate tools, and savings estimates.",
            },
            {
              title: "3. Work renewals",
              detail: "Check Renewals before notice windows close, then decide whether to cancel, reduce, or renegotiate.",
            },
            {
              title: "4. Send actions",
              detail: "Use the AI Email Generator to draft cancellation or negotiation emails with vendor context.",
            },
          ].map((item) => (
            <article className="rounded-lg border border-line bg-panel-subtle p-4 transition hover:-translate-y-1 hover:border-brand hover:shadow-md" key={item.title}>
              <strong className="block text-sm font-extrabold">{item.title}</strong>
              <p className="mt-2 text-sm leading-6 text-quiet">{item.detail}</p>
            </article>
          ))}
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

function HeroBand({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <section className="w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-line bg-inverse text-inverse-ink shadow-[0_24px_70px_rgba(23,32,38,0.18)] sm:max-w-full">
      <div className="grid min-w-0 max-w-full gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-center">
        <div className="min-w-0 max-w-[calc(100vw-4.5rem)] sm:max-w-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-inverse-ink/10 px-3 py-1.5 text-sm font-extrabold text-inverse-ink">
            <Bot aria-hidden="true" size={17} />
            AI audit complete
          </div>
          <h2 className="mt-5 max-w-full break-words text-2xl font-extrabold tracking-normal sm:max-w-3xl sm:text-4xl">Found $48,320 in annual SaaS savings across 7 high-priority actions.</h2>
          <p className="mt-4 max-w-full text-sm leading-6 text-inverse-ink/70 sm:max-w-2xl">
            AutoAudit matched finance spend, renewal notices, and usage signals to rank cancellations, unused seats, duplicate tools, and contract risk.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-inverse-action px-4 text-sm font-extrabold text-inverse-action-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto" type="button" onClick={() => onNavigate("waste")}>
              Review actions
              <ChevronRight aria-hidden="true" size={17} />
            </button>
            <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-inverse-ink/20 px-4 text-center text-sm font-extrabold text-inverse-ink transition hover:-translate-y-0.5 hover:bg-inverse-ink/10 sm:w-auto" type="button" onClick={() => onNavigate("reports")}>
              Generate CFO report
            </button>
          </div>
        </div>

        <div className="min-w-0 max-w-[calc(100vw-4.5rem)] rounded-lg border border-inverse-ink/10 bg-inverse-ink/[0.08] p-4 sm:max-w-none">
          <span className="text-xs font-extrabold uppercase text-inverse-ink/60">Next best action</span>
          <strong className="mt-3 block text-2xl font-extrabold">Cancel Clearbit</strong>
          <p className="mt-2 text-sm leading-6 text-inverse-ink/70">No usage in 117 days. Expected first-year savings: $14,400.</p>
          <div className="mt-4 h-2 rounded-full bg-inverse-ink/10">
            <div className="h-2 w-[96%] rounded-full bg-brand-soft" />
          </div>
          <span className="mt-2 block text-xs font-bold text-inverse-ink/60">96% confidence</span>
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
    { label: "Active vendors", value: totals.activeVendors.toString(), detail: `${totals.vendorCount} total tracked`, icon: Inbox, tone: "brand" },
    { label: "Zombie subscriptions", value: totals.zombieCount.toString(), detail: "No usage in 90+ days", icon: ArrowDownRight, tone: "warning" },
    { label: "Unused seats", value: totals.unusedSeatCount.toString(), detail: "Paid but inactive", icon: Users, tone: "brand" },
    { label: "Upcoming renewals", value: currency(totals.renewalRisk), detail: "Next 90 days", icon: CalendarClock, tone: "warning" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article className="rounded-lg border border-line bg-panel p-4 shadow-[0_18px_45px_rgba(23,32,38,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-xl" key={card.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold uppercase text-quiet">{card.label}</span>
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
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left">
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
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-extrabold uppercase text-brand-strong">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-normal sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-quiet">{detail}</p>
      </div>
      <div className="flex shrink-0">{action}</div>
    </section>
  );
}

function Panel({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-[0_18px_45px_rgba(23,32,38,0.08)] sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">{eyebrow}</p>
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
    <div className="rounded-lg border border-line bg-panel p-3">
      <span className="block text-xs font-extrabold uppercase text-quiet">{label}</span>
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
    <div className="rounded-lg border border-line bg-panel-subtle p-4">
      <span className="text-xs font-extrabold uppercase text-quiet">{label}</span>
      <strong className="mt-2 block text-2xl font-extrabold">{value}</strong>
    </div>
  );
}

function UsageMeter({ label, used, limit, compact = false }: { label: string; used: number; limit: number | null; compact?: boolean }) {
  const cappedUsed = Math.max(0, used);
  const percent = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((cappedUsed / limit) * 100));
  const isAtLimit = limit !== null && cappedUsed >= limit;

  return (
    <div className={`rounded-lg border border-line bg-panel-subtle ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase text-quiet">{label}</span>
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
    <button className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-subtle p-4 text-left transition hover:-translate-y-0.5 hover:border-brand" type="button" onClick={onToggle}>
      <span className="text-sm font-extrabold">{title}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${enabled ? "bg-brand" : "bg-panel-muted"}`}>
        <span className={`size-5 rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function PanelAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-panel-subtle px-3 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_16px_32px_rgb(var(--color-brand)/0.28)] active:translate-y-0" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-quiet shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-panel-muted hover:text-brand hover:shadow-md active:translate-y-0" type="button" aria-label={label} title={label} onClick={onClick}>
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

function buildReportSummary(report: (typeof reports)[number]) {
  return `${report.name}

Owner: ${report.owner}
Status: ${report.status}
Date: ${report.date}
Savings identified: ${currency(report.savings)}

Summary:
This packet highlights SaaS waste drivers, renewal exposure, and recommended owner actions for the current review cycle.`;
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
  const colors = ["#087f8c", "#2f6fed", "#8a5a00", "#b3261e", "#137333", "#5b5fc7"];
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
