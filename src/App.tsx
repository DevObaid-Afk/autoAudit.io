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
  Mail,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

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
  unusedSeatCount: number;
  renewalRisk: number;
  monthlyWaste: number;
};

type Vendor = {
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

type WasteSignal = {
  title: string;
  vendor: string;
  impact: number;
  confidence: number;
  detail: string;
  type: "Zombie app" | "Unused seats" | "Duplicate tool" | "Renewal";
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "vendors", label: "Vendors", icon: Inbox },
  { id: "waste", label: "Waste Detection", icon: AlertTriangle },
  { id: "renewals", label: "Renewals", icon: CalendarClock },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "email", label: "AI Email Generator", icon: Mail },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

const vendors: Vendor[] = [
  {
    name: "Notion",
    category: "Knowledge base",
    owner: "Operations",
    spend: 6420,
    seats: 120,
    activeSeats: 82,
    lastUsed: "Today",
    renewal: "May 18",
    status: "Renewal risk",
    risk: "critical",
    savings: 18240,
  },
  {
    name: "Clearbit",
    category: "Data enrichment",
    owner: "Revenue Ops",
    spend: 1200,
    seats: 24,
    activeSeats: 0,
    lastUsed: "117 days ago",
    renewal: "Jul 01",
    status: "Zombie",
    risk: "critical",
    savings: 14400,
  },
  {
    name: "Figma",
    category: "Design",
    owner: "Design",
    spend: 2860,
    seats: 68,
    activeSeats: 54,
    lastUsed: "Yesterday",
    renewal: "Jun 02",
    status: "Duplicate",
    risk: "high",
    savings: 6800,
  },
  {
    name: "HubSpot",
    category: "CRM",
    owner: "Sales",
    spend: 5300,
    seats: 44,
    activeSeats: 38,
    lastUsed: "Today",
    renewal: "Jun 14",
    status: "Renewal risk",
    risk: "high",
    savings: 9100,
  },
  {
    name: "Loom",
    category: "Video messaging",
    owner: "People",
    spend: 490,
    seats: 45,
    activeSeats: 3,
    lastUsed: "91 days ago",
    renewal: "Monthly",
    status: "Zombie",
    risk: "medium",
    savings: 4080,
  },
  {
    name: "Miro",
    category: "Whiteboarding",
    owner: "Product",
    spend: 780,
    seats: 33,
    activeSeats: 18,
    lastUsed: "6 days ago",
    renewal: "Aug 09",
    status: "Unused seats",
    risk: "medium",
    savings: 4800,
  },
  {
    name: "Asana",
    category: "Project management",
    owner: "Operations",
    spend: 950,
    seats: 60,
    activeSeats: 56,
    lastUsed: "Today",
    renewal: "Sep 22",
    status: "Healthy",
    risk: "low",
    savings: 0,
  },
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

const unusedSeats = [
  { tool: "Notion", owner: "Operations", unused: 38, cost: 6840, action: "Downgrade before May 18" },
  { tool: "Loom", owner: "People", unused: 42, cost: 4080, action: "Cancel team plan" },
  { tool: "Miro", owner: "Product", unused: 15, cost: 4800, action: "Reduce seats" },
  { tool: "Figma", owner: "Design", unused: 14, cost: 2520, action: "Merge duplicate team" },
  { tool: "HubSpot", owner: "Sales", unused: 6, cost: 2280, action: "Confirm owner usage" },
];

const duplicateTools = [
  {
    group: "Project management",
    tools: "Asana, Monday, ClickUp",
    owner: "Operations",
    waste: 9600,
    recommendation: "Keep Asana, cancel two inactive workspaces",
  },
  {
    group: "Data enrichment",
    tools: "Clearbit, Apollo, ZoomInfo",
    owner: "Revenue Ops",
    waste: 14400,
    recommendation: "Cancel Clearbit and renegotiate ZoomInfo",
  },
  {
    group: "Whiteboarding",
    tools: "Miro, FigJam",
    owner: "Product",
    waste: 4800,
    recommendation: "Move workshops into FigJam",
  },
];

const wasteSignals: WasteSignal[] = [
  {
    title: "Cancel dormant enrichment workspace",
    vendor: "Clearbit",
    impact: 14400,
    confidence: 96,
    detail: "No logins, API calls, or CRM sync events were detected in the last 117 days.",
    type: "Zombie app",
  },
  {
    title: "Reduce paid knowledge seats",
    vendor: "Notion",
    impact: 18240,
    confidence: 91,
    detail: "38 paid seats have no page edits and no SSO logins in the last quarter.",
    type: "Unused seats",
  },
  {
    title: "Consolidate design collaboration",
    vendor: "Figma",
    impact: 6800,
    confidence: 84,
    detail: "Marketing owns a separate team plan that overlaps with the primary design org.",
    type: "Duplicate tool",
  },
  {
    title: "Renegotiate CRM renewal",
    vendor: "HubSpot",
    impact: 9100,
    confidence: 79,
    detail: "The annual renewal is within 45 days and current price is above benchmark.",
    type: "Renewal",
  },
];

const reports = [
  { name: "May SaaS Waste Report", owner: "Finance", status: "Ready", savings: 48320, date: "May 07, 2026" },
  { name: "Renewal Risk Brief", owner: "Ops", status: "Scheduled", savings: 31900, date: "May 15, 2026" },
  { name: "Unused Seat Audit", owner: "IT", status: "Draft", savings: 20520, date: "May 21, 2026" },
];

const renewalRows = [
  { vendor: "Notion", date: "May 18", owner: "Operations", amount: 77040, risk: "critical" as RiskLevel },
  { vendor: "Figma", date: "Jun 02", owner: "Design", amount: 34320, risk: "high" as RiskLevel },
  { vendor: "HubSpot", date: "Jun 14", owner: "Sales", amount: 63600, risk: "high" as RiskLevel },
  { vendor: "Miro", date: "Aug 09", owner: "Product", amount: 9360, risk: "medium" as RiskLevel },
];

const integrations = [
  { name: "Gmail", status: "Connected", detail: "Receipts and renewal notices" },
  { name: "Ramp CSV", status: "Connected", detail: "Card and AP spend" },
  { name: "Google Workspace", status: "Pending", detail: "SSO usage signals" },
  { name: "Okta", status: "Not connected", detail: "Login activity and seats" },
];

const defaultDraft = `Hi Clearbit team,

We are reviewing our SaaS stack and found no meaningful Clearbit usage in the last quarter.

Please cancel renewal for the current contract and confirm the final service date. If there is a lower-commitment option, please send pricing for 5 active seats.

Thank you,
Finance Team`;

export function App() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);
  const [emailTone, setEmailTone] = useState("Direct");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? "Overview";

  const totals = useMemo(() => {
    const monthlySpend = vendors.reduce((sum, vendor) => sum + vendor.spend, 0);
    const estimatedSavings = vendors.reduce((sum, vendor) => sum + vendor.savings, 0);
    const zombieCount = vendors.filter((vendor) => vendor.status === "Zombie").length;
    const activeVendors = vendors.filter((vendor) => vendor.status !== "Zombie").length;
    const unusedSeatCount = vendors.reduce((sum, vendor) => sum + Math.max(vendor.seats - vendor.activeSeats, 0), 0);
    const renewalRisk = renewalRows.reduce((sum, renewal) => sum + renewal.amount, 0);

    return {
      monthlySpend,
      estimatedSavings,
      zombieCount,
      activeVendors,
      unusedSeatCount,
      renewalRisk,
      monthlyWaste: 24700,
    };
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
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      showToast("Email draft copied.");
    } catch {
      showToast("Select the draft text to copy it.");
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="lg:grid lg:grid-cols-[286px_minmax(0,1fr)]">
        <Sidebar activePage={activePage} isOpen={isMobileNavOpen} onClose={() => setMobileNavOpen(false)} onNavigate={handleNav} />

        <div className="min-w-0">
          <Topbar pageTitle={pageTitle} onMenu={() => setMobileNavOpen(true)} onToast={showToast} />

          <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="animate-[fadeIn_420ms_ease-out]">
              {activePage === "overview" && <OverviewPage totals={totals} onToast={showToast} />}
              {activePage === "vendors" && <VendorsPage onToast={showToast} />}
              {activePage === "waste" && <WasteDetectionPage onToast={showToast} />}
              {activePage === "renewals" && <RenewalsPage onToast={showToast} />}
              {activePage === "reports" && <ReportsPage onToast={showToast} />}
              {activePage === "email" && (
                <EmailGeneratorPage
                  draft={draft}
                  emailTone={emailTone}
                  onCopyDraft={copyDraft}
                  onDraftChange={setDraft}
                  onGenerate={() => showToast("AI draft refreshed with company context.")}
                  onToneChange={setEmailTone}
                />
              )}
              {activePage === "billing" && <BillingPage onToast={showToast} />}
              {activePage === "settings" && <SettingsPage onToast={showToast} />}
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
      <div className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-line bg-panel/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
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
                className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-extrabold transition duration-200 ${
                  isActive ? "bg-brand text-white shadow-[0_10px_24px_rgba(8,127,140,0.24)]" : "text-quiet hover:bg-panel-muted hover:text-ink"
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
          <div className="rounded-lg border border-line bg-[#fbfcfd] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-quiet">Audit coverage</span>
              <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-extrabold text-brand-strong">82%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-panel-muted">
              <div className="h-2 w-[82%] rounded-full bg-brand" />
            </div>
            <p className="mt-3 text-sm leading-6 text-quiet">Finance exports connected. Email and SSO need approval.</p>
          </div>

          <button className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button">
            <Zap aria-hidden="true" size={17} />
            Run new audit
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ pageTitle, onMenu, onToast }: { pageTitle: string; onMenu: () => void; onToast: (message: string) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button className="grid size-10 place-items-center rounded-lg border border-line bg-panel text-quiet lg:hidden" type="button" onClick={onMenu} aria-label="Open navigation">
          <Menu aria-hidden="true" size={20} />
        </button>

        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Authenticated workspace</p>
          <h1 className="truncate text-xl font-extrabold tracking-normal sm:text-2xl">{pageTitle}</h1>
        </div>

        <div className="ml-auto hidden min-w-[280px] items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-quiet md:flex">
          <Search aria-hidden="true" size={17} />
          <span>Search vendors, renewals, reports</span>
        </div>

        <button className="hidden min-h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-extrabold text-ink transition hover:bg-panel-muted sm:inline-flex" type="button" onClick={() => onToast("Audit data refreshed.")}>
          <RefreshCw aria-hidden="true" size={17} />
          Sync
        </button>

        <button className="relative grid size-10 place-items-center rounded-lg border border-line bg-panel text-quiet transition hover:bg-panel-muted" type="button" aria-label="Notifications" onClick={() => onToast("3 renewal alerts need review.")}>
          <Bell aria-hidden="true" size={18} />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-risk" />
        </button>

        <button className="flex items-center gap-2 rounded-lg border border-line bg-panel p-1.5 pr-3 transition hover:bg-panel-muted" type="button" onClick={() => onToast("Profile menu opened.")}>
          <span className="grid size-8 place-items-center rounded-md bg-brand text-xs font-extrabold text-white">NF</span>
          <span className="hidden text-sm font-extrabold sm:block">Neon Finance</span>
        </button>
      </div>
    </header>
  );
}

function OverviewPage({ totals, onToast }: { totals: DashboardTotals; onToast: (message: string) => void }) {
  return (
    <div className="grid gap-4">
      <HeroBand onToast={onToast} />
      <SummaryGrid totals={totals} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <Panel title="Spend, waste, and savings" eyebrow="Monthly trend" action={<PanelAction label="Inspect" onClick={() => onToast("Trend details opened.")} />}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
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

        <Panel title="Spend by function" eyebrow="Category map" action={<PanelAction label="Export" onClick={() => onToast("Category chart exported.")} />}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categorySpend} innerRadius={70} outerRadius={108} paddingAngle={3} dataKey="value">
                  {categorySpend.map((entry) => (
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
        <UnusedSeatsTable />
        <DuplicateToolsPanel onToast={onToast} />
      </div>
    </div>
  );
}

function VendorsPage({ onToast }: { onToast: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const filteredVendors = vendors.filter((vendor) => {
    const matchesQuery = vendor.name.toLowerCase().includes(query.toLowerCase()) || vendor.owner.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All" || vendor.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Vendor inventory"
        title="All SaaS vendors"
        detail="Track ownership, spend, usage, seats, risk, and renewal status in one place."
        action={<PrimaryButton onClick={() => onToast("Vendor import started.")}>Import vendors</PrimaryButton>}
      />

      <Panel
        title="Vendor directory"
        eyebrow={`${filteredVendors.length} vendors shown`}
        action={
          <div className="flex flex-wrap gap-2">
            <SearchBox value={query} onChange={setQuery} />
            <SelectPill value={status} onChange={setStatus} values={["All", "Healthy", "Zombie", "Duplicate", "Renewal risk", "Unused seats"]} />
          </div>
        }
      >
        <div className="overflow-x-auto">
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
              {filteredVendors.map((vendor) => (
                <tr className="rounded-lg bg-[#fbfcfd] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={vendor.name}>
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
                    <IconButton label={`Open ${vendor.name}`} onClick={() => onToast(`${vendor.name} profile opened.`)}>
                      <ChevronRight aria-hidden="true" size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function WasteDetectionPage({ onToast }: { onToast: (message: string) => void }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="AI detection"
        title="Waste signals"
        detail="AutoAudit maps spend, receipts, usage, seats, and renewal windows to prioritize the highest-value actions."
        action={<PrimaryButton onClick={() => onToast("New waste scan started.")}>Run detection</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Recommended actions" eyebrow="Highest impact first">
          <div className="grid gap-3">
            {wasteSignals.map((signal) => (
              <article className="rounded-lg border border-line bg-[#fbfcfd] p-4 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md" key={signal.title}>
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
                  <SecondaryButton onClick={() => onToast(`${signal.vendor} evidence opened.`)}>View evidence</SecondaryButton>
                  <PrimaryButton onClick={() => onToast(`${signal.vendor} action queued.`)}>Create action</PrimaryButton>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Detection mix" eyebrow="Waste by class">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
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

      <div className="grid gap-4 xl:grid-cols-2">
        <UnusedSeatsTable />
        <DuplicateToolsPanel onToast={onToast} />
      </div>
    </div>
  );
}

function RenewalsPage({ onToast }: { onToast: (message: string) => void }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Contract control"
        title="Upcoming renewals"
        detail="Prioritize notice windows, contract owners, benchmark gaps, and savings opportunities before vendors auto-renew."
        action={<PrimaryButton onClick={() => onToast("Renewal calendar exported.")}>Export calendar</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Renewal exposure" eyebrow="Next 90 days">
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={renewalChart} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
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
            {renewalRows.map((renewal) => (
              <article className="rounded-lg border border-line bg-[#fbfcfd] p-4" key={renewal.vendor}>
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
                  <IconButton label={`Review ${renewal.vendor}`} onClick={() => onToast(`${renewal.vendor} renewal opened.`)}>
                    <ChevronRight aria-hidden="true" size={18} />
                  </IconButton>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ReportsPage({ onToast }: { onToast: (message: string) => void }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Board-ready output"
        title="Reports"
        detail="Generate monthly CFO packets, savings recaps, renewal briefs, and IT cleanup lists from the same audit data."
        action={<PrimaryButton onClick={() => onToast("Report builder opened.")}>Create report</PrimaryButton>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
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
              <SecondaryButton onClick={() => onToast(`${report.name} opened.`)}>Open</SecondaryButton>
            </div>
          </article>
        ))}
      </div>

      <Panel title="Savings captured over time" eyebrow="Report chart">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
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
      </Panel>
    </div>
  );
}

function EmailGeneratorPage({
  draft,
  emailTone,
  onCopyDraft,
  onDraftChange,
  onGenerate,
  onToneChange,
}: {
  draft: string;
  emailTone: string;
  onCopyDraft: () => void;
  onDraftChange: (draft: string) => void;
  onGenerate: () => void;
  onToneChange: (tone: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="AI workflow"
        title="AI Email Generator"
        detail="Draft cancellation, renegotiation, owner follow-up, and renewal notice emails using audit evidence and company context."
        action={<PrimaryButton onClick={onGenerate}>Generate draft</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Prompt controls" eyebrow="Company context">
          <div className="grid gap-4">
            <Field label="Vendor">
              <select className="input">
                <option>Clearbit</option>
                <option>Notion</option>
                <option>HubSpot</option>
              </select>
            </Field>
            <Field label="Goal">
              <select className="input">
                <option>Cancel subscription</option>
                <option>Renegotiate contract</option>
                <option>Reduce seat count</option>
                <option>Ask owner to confirm usage</option>
              </select>
            </Field>
            <Field label="Tone">
              <div className="grid grid-cols-3 gap-2">
                {["Direct", "Friendly", "Firm"].map((tone) => (
                  <button
                    className={`min-h-10 rounded-lg border text-sm font-extrabold transition ${
                      emailTone === tone ? "border-brand bg-brand text-white" : "border-line bg-panel text-quiet hover:bg-panel-muted hover:text-ink"
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
              <p className="mt-2 text-sm leading-6 text-brand-strong">No logins in 117 days, no API calls, renewal on Jul 01, projected savings of $14,400.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Vendor email draft" eyebrow="Editable output" action={<PanelAction label="Copy" onClick={onCopyDraft} />}>
          <textarea
            className="min-h-[420px] w-full resize-y rounded-lg border border-line bg-[#fbfcfd] p-4 leading-7 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
            value={draft}
            spellCheck={false}
            onChange={(event) => onDraftChange(event.target.value)}
          />
        </Panel>
      </div>
    </div>
  );
}

function BillingPage({ onToast }: { onToast: (message: string) => void }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Subscription"
        title="Billing"
        detail="Mock billing view for plan management, tracked spend tiers, savings fees, and invoices."
        action={<PrimaryButton onClick={() => onToast("Billing portal opened.")}>Manage plan</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Current plan" eyebrow="Growth audit">
          <div className="grid gap-4 md:grid-cols-3">
            <PlanMetric label="Base subscription" value="$299/mo" />
            <PlanMetric label="Tracked spend" value="$112.4k" />
            <PlanMetric label="Success fee" value="20%" />
          </div>
          <div className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-lg font-extrabold">Savings-based billing</strong>
                <p className="mt-1 text-sm text-quiet">20% of first-year savings after finance approval.</p>
              </div>
              <span className="rounded-full bg-[#e7f4eb] px-3 py-1.5 text-sm font-extrabold text-good">$9,664 pending approval</span>
            </div>
          </div>
        </Panel>

        <Panel title="Invoices" eyebrow="Recent activity">
          <div className="grid gap-3">
            {["May 2026", "Apr 2026", "Mar 2026"].map((invoice, index) => (
              <div className="flex items-center justify-between rounded-lg border border-line bg-[#fbfcfd] p-3" key={invoice}>
                <div>
                  <strong className="block text-sm font-extrabold">{invoice}</strong>
                  <span className="text-sm text-quiet">{index === 0 ? "Open" : "Paid"}</span>
                </div>
                <button className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-extrabold hover:bg-panel-muted" type="button" onClick={() => onToast(`${invoice} invoice opened.`)}>
                  View
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SettingsPage({ onToast }: { onToast: (message: string) => void }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Workspace controls"
        title="Settings"
        detail="Manage data sources, users, approval rules, report cadence, and finance ownership."
        action={<PrimaryButton onClick={() => onToast("Settings saved.")}>Save settings</PrimaryButton>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Integrations" eyebrow="Data sources">
          <div className="grid gap-3">
            {integrations.map((integration) => (
              <div className="flex flex-col gap-3 rounded-lg border border-line bg-[#fbfcfd] p-4 sm:flex-row sm:items-center sm:justify-between" key={integration.name}>
                <div>
                  <strong className="block font-extrabold">{integration.name}</strong>
                  <span className="mt-1 block text-sm text-quiet">{integration.detail}</span>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${integration.status === "Connected" ? "bg-[#e7f4eb] text-good" : integration.status === "Pending" ? "bg-warning-soft text-warning" : "bg-panel-muted text-quiet"}`}>
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Approval rules" eyebrow="Automation">
          <div className="grid gap-3">
            <ToggleRow title="Require CFO approval above $5k" enabled />
            <ToggleRow title="Auto-draft cancellation emails" enabled />
            <ToggleRow title="Send weekly renewal digest" enabled />
            <ToggleRow title="Allow managed renegotiation" enabled={false} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function HeroBand({ onToast }: { onToast: (message: string) => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-ink text-white shadow-[0_24px_70px_rgba(23,32,38,0.18)]">
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-extrabold text-white">
            <Bot aria-hidden="true" size={17} />
            AI audit complete
          </div>
          <h2 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-normal sm:text-4xl">Found $48,320 in annual SaaS savings across 7 high-priority actions.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
            AutoAudit matched finance spend, renewal notices, and usage signals to rank cancellations, unused seats, duplicate tools, and contract risk.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5" type="button" onClick={() => onToast("Waste action queue opened.")}>
              Review actions
              <ChevronRight aria-hidden="true" size={17} />
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-white/10" type="button" onClick={() => onToast("CFO report generated.")}>
              Generate CFO report
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4">
          <span className="text-xs font-extrabold uppercase text-white/60">Next best action</span>
          <strong className="mt-3 block text-2xl font-extrabold">Cancel Clearbit</strong>
          <p className="mt-2 text-sm leading-6 text-white/70">No usage in 117 days. Expected first-year savings: $14,400.</p>
          <div className="mt-4 h-2 rounded-full bg-white/10">
            <div className="h-2 w-[96%] rounded-full bg-brand-soft" />
          </div>
          <span className="mt-2 block text-xs font-bold text-white/60">96% confidence</span>
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
    { label: "Active vendors", value: totals.activeVendors.toString(), detail: `${vendors.length} total tracked`, icon: Inbox, tone: "brand" },
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

function UnusedSeatsTable() {
  return (
    <Panel title="Unused seats table" eyebrow="Seat leakage">
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
            {unusedSeats.map((row) => (
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
    </Panel>
  );
}

function DuplicateToolsPanel({ onToast }: { onToast: (message: string) => void }) {
  return (
    <Panel title="Duplicate tools alerts" eyebrow="Consolidation">
      <div className="grid gap-3">
        {duplicateTools.map((alert) => (
          <article className="rounded-lg border border-line bg-[#fbfcfd] p-4 transition hover:-translate-y-0.5 hover:shadow-md" key={alert.group}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block font-extrabold">{alert.group}</strong>
                <span className="mt-1 block text-sm text-quiet">{alert.tools}</span>
              </div>
              <span className="rounded-full bg-risk-soft px-2.5 py-1 text-xs font-extrabold text-risk">{currency(alert.waste)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-quiet">{alert.recommendation}</p>
            <button className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-brand hover:text-brand-strong" type="button" onClick={() => onToast(`${alert.group} consolidation opened.`)}>
              Review consolidation
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </article>
        ))}
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

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-10 min-w-[240px] items-center gap-2 rounded-lg border border-line bg-[#fbfcfd] px-3 text-sm text-quiet">
      <Search aria-hidden="true" size={17} />
      <input className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-quiet" value={value} placeholder="Search vendors" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectPill({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-[#fbfcfd] px-3 text-sm font-bold text-quiet">
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
    <div className="rounded-lg border border-line bg-[#fbfcfd] p-4">
      <span className="text-xs font-extrabold uppercase text-quiet">{label}</span>
      <strong className="mt-2 block text-2xl font-extrabold">{value}</strong>
    </div>
  );
}

function ToggleRow({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#fbfcfd] p-4">
      <span className="text-sm font-extrabold">{title}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${enabled ? "bg-brand" : "bg-panel-muted"}`}>
        <span className={`size-5 rounded-full bg-white shadow transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </div>
  );
}

function PanelAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-[#fbfcfd] px-3 text-sm font-extrabold text-ink transition hover:bg-panel-muted" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(8,127,140,0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:bg-panel-muted" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-quiet transition hover:border-brand hover:text-brand" type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function RiskPill({ risk, label }: { risk: RiskLevel; label: string }) {
  const tone = {
    critical: "bg-risk-soft text-risk",
    high: "bg-warning-soft text-warning",
    medium: "bg-brand-soft text-brand-strong",
    low: "bg-[#e7f4eb] text-good",
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
    <div className={`fixed bottom-5 right-5 z-[60] max-w-[calc(100vw-40px)] rounded-lg bg-ink px-4 py-3 text-sm font-extrabold text-white shadow-2xl transition duration-200 ${message ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

function metricTone(tone: string) {
  if (tone === "risk") return "bg-risk-soft text-risk";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "good") return "bg-[#e7f4eb] text-good";
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
