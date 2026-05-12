import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  LogIn,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { PublicFooter } from "../components/PublicFooter";
import { PageMeta } from "../components/PageMeta";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";

const findings = [
  { label: "Zombie subscriptions", value: "$18.4k", tone: "risk" },
  { label: "Unused seats", value: "126", tone: "warning" },
  { label: "Renewal exposure", value: "$42k", tone: "brand" },
];

const workflows = [
  {
    icon: BarChart3,
    title: "Spot waste fast",
    text: "Import vendors, spend, seats, usage, and renewal dates into one operations-ready workspace.",
  },
  {
    icon: CalendarClock,
    title: "Prioritize renewals",
    text: "See which contracts need action before they quietly roll into another billing cycle.",
  },
  {
    icon: FileText,
    title: "Create action drafts",
    text: "Generate cancellation, renegotiation, and monthly waste summaries from your findings.",
  },
];

const steps = [
  { title: "Add vendor data", text: "Start with manual entry or CSV import so the audit has real spend, seat, and renewal context." },
  { title: "Review waste signals", text: "AutoAudit highlights unused seats, zombie subscriptions, duplicate tools, and renewal exposure." },
  { title: "Send the next action", text: "Turn findings into reports, renewal notes, and vendor email drafts your team can use immediately." },
];

const teamWorkflow = [
  { title: "Import vendor data", text: "Start with a CSV or sample workspace containing spend, seats, usage, owners, and renewal dates." },
  { title: "Detect waste signals", text: "Review zombie subscriptions, unused seats, duplicate categories, and high-risk renewals." },
  { title: "Review renewal exposure", text: "Prioritize contracts before notice windows close and assign the next owner action." },
  { title: "Generate reports", text: "Create a CFO-ready summary with savings logic and the findings behind each recommendation." },
  { title: "Send AI drafts", text: "Use human-reviewed cancellation, renegotiation, or seat-reduction drafts when action is needed." },
];

const sampleOutputs = [
  {
    icon: FileText,
    title: "Evidence-backed report",
    text: "Clearbit is flagged because 12 purchased seats show 0 active users and the renewal is inside 30 days. Estimated annual waste: $14,400.",
  },
  {
    icon: ClipboardList,
    title: "Renewal queue",
    text: "Slack renews in 24 days with 52 of 80 seats active. Recommended action: review a 28-seat reduction before renewal.",
  },
  {
    icon: Mail,
    title: "Human-reviewed AI draft",
    text: "AutoAudit drafts the vendor email from audit evidence, then the user reviews and edits it before anything is sent.",
  },
];

const trustNotes = [
  "Workspace data is separated by company.",
  "Passwords are hashed before storage.",
  "Protected API routes require signed-in access.",
  "Owner, admin, and member permissions control sensitive actions.",
  "AI drafts recommendations and emails; it never cancels tools or contacts vendors by itself.",
];

const roadmapItems = ["Google Workspace", "Microsoft 365", "QuickBooks", "Stripe", "Okta", "Slack alerts"];

const buildLandingPageSchema = (siteUrl: string) => [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AutoAudit.ai",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/`,
    description: "SaaS waste control software for operations leads at software companies with 20 to 150 employees.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "7-day early access trial",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does AutoAudit.ai do?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AutoAudit.ai helps operations leads track SaaS vendors, find unused seats, flag zombie subscriptions, review renewal risk, and create evidence-backed reports and email drafts from user-provided data.",
        },
      },
      {
        "@type": "Question",
        name: "Does AutoAudit.ai contact vendors automatically?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. AutoAudit.ai creates reports and email drafts for human review. Users decide whether to contact vendors, cancel subscriptions, reduce seats, or renegotiate.",
        },
      },
      {
        "@type": "Question",
        name: "Can AutoAudit.ai work with CSV vendor data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Teams can add vendors manually or import CSV data with spend, owners, seats, usage, categories, and renewal dates.",
        },
      },
    ],
  },
];

export function LandingPage() {
  const { token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isSignedIn = Boolean(token);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="AutoAudit.ai - SaaS Waste Control for Operations Teams"
        description="Help operations leads at software companies find SaaS waste, renewal risk, unused seats, zombie subscriptions, and vendor cleanup actions."
        canonicalPath="/"
        keywords={["SaaS waste management", "SaaS audit software", "vendor management", "renewal tracking", "unused seat audit", "software spend optimization"]}
        schema={buildLandingPageSchema}
      />
      <section className="relative overflow-hidden border-b border-line bg-[linear-gradient(180deg,rgb(var(--color-panel))_0%,rgb(var(--color-canvas))_100%)]">
        <div className="mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3" to="/">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.24)]">
                <ShieldCheck aria-hidden="true" size={23} />
              </span>
              <span className="text-lg font-extrabold tracking-normal">AutoAudit.ai</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-extrabold text-quiet transition hover:bg-panel hover:text-brand md:inline-flex"
                to="/pricing"
              >
                Pricing
              </Link>
              <Link
                className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-extrabold text-quiet transition hover:bg-panel hover:text-brand lg:inline-flex"
                to="/trust"
              >
                Trust
              </Link>
              <button
                className="grid size-10 place-items-center rounded-lg border border-line bg-panel text-ink transition hover:border-brand hover:text-brand"
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
              </button>
              <Link
                className="hidden min-h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand sm:inline-flex"
                to="/login"
              >
                <LogIn aria-hidden="true" size={17} />
                Sign in
              </Link>
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgb(var(--color-brand)/0.22)] transition hover:-translate-y-0.5 hover:bg-brand-strong"
                to={isSignedIn ? "/dashboard" : "/signup"}
              >
                {isSignedIn ? "Dashboard" : "Start free"}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </header>

          <div className="grid flex-1 content-center gap-10 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)] lg:items-center lg:py-10">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-extrabold text-brand-strong shadow-sm">
                <Sparkles aria-hidden="true" size={17} />
                Founder-led early access
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-normal text-ink sm:text-5xl lg:text-6xl">
                SaaS waste control for lean software ops teams.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-quiet sm:text-lg">
                AutoAudit.ai helps operations leads at 20-150 person software companies turn vendor lists, seat counts, renewal dates, and usage notes into a cleanup queue.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-quiet">
                Currently improving through real user feedback, focused on practical SaaS cleanup workflows instead of bloated procurement software.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgb(var(--color-brand)/0.24)] transition hover:-translate-y-0.5 hover:bg-brand-strong"
                  to={isSignedIn ? "/dashboard" : "/signup"}
                >
                  {isSignedIn ? "Open dashboard" : "Create workspace"}
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-5 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand"
                  to="/demo"
                >
                  View demo
                </Link>
              </div>
            </div>

            <ProductPreview />
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {workflows.map((item) => (
          <article key={item.title} className="rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]">
            <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
              <item.icon aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="border-y border-line bg-panel">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase text-brand-strong">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">A practical audit flow, not another empty dashboard.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-5" key={step.title}>
                <span className="grid size-9 place-items-center rounded-lg bg-brand text-sm font-extrabold text-white">{index + 1}</span>
                <h3 className="mt-4 text-lg font-extrabold tracking-normal">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-quiet">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="team-workflow" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase text-brand-strong">How teams use AutoAudit.ai</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal">A lightweight operating flow from data to action.</h2>
          <p className="mt-3 text-sm leading-7 text-quiet">
            The product is built around the weekly work operations leads already do: review software spend, check renewals, and send the next clear action.
          </p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {teamWorkflow.map((item, index) => (
            <article className="rounded-lg border border-line bg-panel p-4 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item.title}>
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-extrabold text-white">{index + 1}</span>
              <h3 className="mt-4 text-base font-extrabold tracking-normal">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="sample-output" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Sample output</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Show the work behind every savings recommendation.</h2>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {sampleOutputs.map((item) => (
            <article className="rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item.title}>
              <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                <item.icon aria-hidden="true" size={22} />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Founder note</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Built by a real person, improved with real user feedback.</h2>
            <p className="mt-3 text-sm leading-7 text-quiet">
              AutoAudit.ai is in active early access, with product decisions shaped around practical SaaS spend reviews, renewal cleanup, and feedback from real workflows.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel-subtle p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]">
            <p className="text-sm leading-7 text-quiet">
              I am Obaid, the developer behind AutoAudit.ai. I am building this product for operations leads at growing software teams who want a simpler way to spot SaaS waste, review renewals, and turn findings into clear action. The product is still early, so I am personally reviewing feedback, improving the workflow, and helping early users get value without a heavy setup process.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/contact">
                Contact Founder
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" to="/about-developer">
                About Founder
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">Trust and control</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Clear guardrails for an early-stage SaaS workflow.</h2>
          <p className="mt-3 text-sm leading-7 text-quiet">
            AutoAudit is designed to help teams decide faster, while keeping real vendor actions under human control.
          </p>
          <Link className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" to="/trust">
            Visit Trust Center
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {trustNotes.map((note) => (
            <div className="rounded-lg border border-line bg-panel p-4 text-sm font-bold leading-6 text-quiet shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={note}>
              <CheckCircle2 aria-hidden="true" className="mb-3 text-good" size={18} />
              {note}
            </div>
          ))}
        </div>
      </section>

      <section id="data-basis" className="border-y border-line bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Based on your data</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Clear findings, without pretending the system is magic.</h2>
          </div>
          <div className="rounded-lg border border-line bg-panel-subtle p-5">
            <p className="text-sm leading-7 text-quiet">
              Until integrations are connected, AutoAudit.ai findings are based on the vendor, spend, seat, usage, owner, and renewal data your team enters or imports. Reports should be treated as review-ready evidence, not automatic financial decisions.
            </p>
          </div>
        </div>
      </section>

      <section id="roadmap" className="border-y border-line bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">What is coming</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Planned integrations for stronger evidence.</h2>
            <p className="mt-3 text-sm leading-7 text-quiet">
              The current product starts with manual and CSV workflows. Integrations are planned around the systems operations teams already use to confirm spend, users, and renewal notices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roadmapItems.map((item) => (
              <span className="rounded-lg border border-line bg-panel-subtle px-3 py-2 text-sm font-extrabold text-ink" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="feedback" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase text-brand-strong">Feedback loop</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-normal">Help shape the workflow while the product is still flexible.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-quiet">
                Early users can share missing fields, report formats, integration requests, and renewal workflows that would make AutoAudit more useful in day-to-day finance work.
              </p>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/contact">
              Share feedback
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="border-y border-line bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">SaaS audit FAQ</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Questions teams ask before reviewing software spend.</h2>
          </div>
          <div className="grid gap-4">
            {[
              {
                question: "What does AutoAudit.ai do?",
                answer: "AutoAudit.ai helps teams track SaaS vendors, find unused seats, flag zombie subscriptions, review renewal risk, and create evidence-backed reports and email drafts.",
              },
              {
                question: "Does AutoAudit.ai contact vendors automatically?",
                answer: "No. AutoAudit.ai creates reports and email drafts for human review. Users decide whether to contact vendors, cancel subscriptions, reduce seats, or renegotiate.",
              },
              {
                question: "Can AutoAudit.ai work with CSV vendor data?",
                answer: "Yes. Teams can add vendors manually or import CSV data with spend, owners, seats, usage, categories, and renewal dates.",
              },
            ].map((item) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-5" key={item.question}>
                <h3 className="text-lg font-extrabold tracking-normal">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-quiet">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 rounded-lg border border-line bg-inverse p-6 text-inverse-ink shadow-[0_24px_70px_rgba(23,32,38,0.16)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold text-inverse-ink/70">Ready when your vendor list is</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Start with a 7-day trial and see what waste turns up.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-inverse-action px-4 text-sm font-extrabold text-inverse-action-ink transition hover:-translate-y-0.5" to="/signup?plan=trial">
              Start free trial
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-inverse-ink/20 px-4 text-sm font-extrabold text-inverse-ink transition hover:bg-inverse-ink/10" to="/pricing">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-lg border border-line bg-panel p-3 shadow-[0_24px_70px_rgba(23,32,38,0.16)]">
      <div className="rounded-md border border-line bg-panel-subtle">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">May audit</p>
            <h2 className="text-base font-extrabold tracking-normal">Savings command center</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md bg-good-soft px-3 py-1 text-xs font-extrabold text-good">
            <CheckCircle2 aria-hidden="true" size={15} />
            Live
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {findings.map((finding) => (
            <div key={finding.label} className="rounded-lg border border-line bg-panel p-4">
              <p className="text-xs font-bold text-quiet">{finding.label}</p>
              <p
                className={`mt-2 text-2xl font-extrabold tracking-normal ${
                  finding.tone === "risk" ? "text-risk" : finding.tone === "warning" ? "text-warning" : "text-brand"
                }`}
              >
                {finding.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-lg border border-line bg-panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-normal">Waste trend</h3>
              <Zap aria-hidden="true" className="text-brand" size={18} />
            </div>
            <div className="flex h-40 items-end gap-2">
              {[44, 72, 56, 92, 66, 114, 83, 128].map((height, index) => (
                <span
                  className="min-w-0 flex-1 rounded-t-md bg-brand"
                  style={{ height: `${height}px`, opacity: 0.36 + index * 0.07 }}
                  key={height}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-panel p-4">
            <h3 className="text-sm font-extrabold tracking-normal">Action queue</h3>
            <div className="mt-4 grid gap-3">
              {["Cancel inactive design seats", "Renegotiate CRM tier", "Review storage renewal"].map((task, index) => (
                <div className="flex items-center gap-3 rounded-md bg-panel-muted px-3 py-2" key={task}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-soft text-xs font-extrabold text-brand">{index + 1}</span>
                  <span className="min-w-0 text-sm font-bold text-ink">{task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
