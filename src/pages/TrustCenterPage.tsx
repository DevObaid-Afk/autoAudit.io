import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter, publicContact } from "../components/PublicFooter";

const trustPillars = [
  {
    icon: Database,
    title: "Workspace data stays separated",
    text: "Vendor lists, renewal notes, reports, and account data are scoped to the company workspace they belong to.",
  },
  {
    icon: Bot,
    title: "AI stays in draft mode",
    text: "AutoAudit.ai can help draft reports and vendor messages, but it does not cancel tools, contact vendors, or make purchasing decisions for you.",
  },
  {
    icon: UserCheck,
    title: "People stay in control",
    text: "Recommendations are meant to support a human review process, with evidence shown before any team takes action.",
  },
  {
    icon: FileText,
    title: "Findings trace back to your inputs",
    text: "Until integrations are connected, signals are based on vendor, spend, seat, usage, owner, and renewal data your team enters or imports.",
  },
];

const safetyBasics = [
  "Passwords are hashed before storage.",
  "Protected dashboard routes require signed-in access.",
  "Owner, admin, and member permissions control sensitive workspace actions.",
  "Users can request correction, export, or deletion of account data.",
];

const dataLifecycle = [
  {
    title: "What you add",
    text: "Account details, company workspace details, vendor names, spend, owners, seats, renewal dates, and messages sent through contact forms.",
  },
  {
    title: "Why it is used",
    text: "To show SaaS waste signals, renewal exposure, reports, AI-assisted drafts, support replies, product quality improvements, and account security.",
  },
  {
    title: "What you control",
    text: "You choose what vendor data to enter, which reports or drafts to generate, and whether to request correction, export, or deletion.",
  },
];

const aiBoundaries = [
  "Does not send emails automatically.",
  "Does not cancel subscriptions.",
  "Does not approve purchases or renewals.",
  "Does not replace financial, legal, or procurement review.",
];

const trustTopics = [
  {
    icon: Database,
    title: "Data Safety",
    text: "See what data powers the audit flow, why it is used, and what users control.",
    href: "/data-safety",
  },
  {
    icon: Bot,
    title: "AI Boundaries",
    text: "Understand draft-only AI behavior, human review, and actions AutoAudit.ai will not take.",
    href: "/ai-boundaries",
  },
  {
    icon: FileText,
    title: "Report Proof",
    text: "See how findings should show evidence, savings context, and human review steps.",
    href: "/report-proof",
  },
];

export function TrustCenterPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="Trust Center - AutoAudit.ai"
        description="AutoAudit.ai trust basics for SaaS vendor data handling, AI boundaries, workspace permissions, account control, and support."
        canonicalPath="/trust"
        keywords={["AutoAudit trust center", "SaaS vendor data security", "AI draft boundaries", "SaaS audit privacy"]}
      />

      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.24)]">
              <ShieldCheck aria-hidden="true" size={23} />
            </span>
            <span className="text-lg font-extrabold tracking-normal">AutoAudit.ai</span>
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" to="/">
            <ArrowLeft aria-hidden="true" size={17} />
            Home
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:px-8">
        <div className="motion-enter">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Trust Center</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">
            Clear rules for your SaaS audit data.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-quiet">
            AutoAudit.ai is designed for practical vendor reviews, not hidden automation. You stay in control of your data, your AI drafts, and your next vendor action.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.22)] transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/privacy">
              Read privacy basics
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" href={`mailto:${publicContact.email}`}>
              <Mail aria-hidden="true" size={17} />
              Ask a question
            </a>
          </div>
        </div>

        <div className="motion-enter motion-delay-1 rounded-lg border border-line bg-panel p-5 shadow-[0_24px_70px_rgba(23,32,38,0.12)]">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
              <LockKeyhole aria-hidden="true" size={23} />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase text-brand-strong">Plain-English summary</p>
              <h2 className="text-xl font-extrabold tracking-normal">What AutoAudit.ai will not do</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {aiBoundaries.map((item) => (
              <div className="rounded-lg border border-line bg-panel-subtle p-4 text-sm font-bold leading-6 text-quiet" key={item}>
                <CheckCircle2 aria-hidden="true" className="mb-3 text-good" size={18} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {trustPillars.map((item) => (
          <article className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item.title}>
            <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
              <item.icon aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Trust topics</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Separate pages for focused answers.</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {trustTopics.map((topic) => (
            <Link className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" to={topic.href} key={topic.title}>
              <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                <topic.icon aria-hidden="true" size={22} />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-normal">{topic.title}</h3>
              <p className="mt-2 text-sm leading-6 text-quiet">{topic.text}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-brand">
                Open page
                <ArrowRight aria-hidden="true" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Data handling</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Know what is collected, why, and what you control.</h2>
            <p className="mt-3 text-sm leading-7 text-quiet">
              The product is early-access and intentionally straightforward: enter only the audit information you want AutoAudit.ai to help organize.
            </p>
          </div>
          <div className="grid gap-3">
            {dataLifecycle.map((item) => (
              <article className="motion-card rounded-lg border border-line bg-panel-subtle p-5" key={item.title}>
                <h3 className="text-base font-extrabold tracking-normal">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:px-8">
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">Security basics</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Practical safeguards for an early-stage SaaS workflow.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {safetyBasics.map((item) => (
              <div className="motion-card rounded-lg border border-line bg-panel p-4 text-sm font-bold leading-6 text-quiet shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item}>
                <ShieldCheck aria-hidden="true" className="mb-3 text-brand" size={18} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-inverse p-6 text-inverse-ink shadow-[0_24px_70px_rgba(23,32,38,0.16)]">
          <span className="grid size-11 place-items-center rounded-lg bg-inverse-action text-inverse-action-ink">
            <Trash2 aria-hidden="true" size={22} />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold tracking-normal">Need data changed or removed?</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-inverse-ink/76">
            Send a request from the account email where possible. Reasonable verification may be required before account data is corrected, exported, or deleted.
          </p>
          <a className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-inverse-action px-4 text-sm font-extrabold text-inverse-action-ink transition hover:-translate-y-0.5" href={`mailto:${publicContact.email}`}>
            <Mail aria-hidden="true" size={17} />
            {publicContact.email}
          </a>
        </aside>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Helpful documents</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal">Review the legal basics before you start.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" to="/privacy">
              <FileText aria-hidden="true" size={17} />
              Privacy
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" to="/terms">
              <FileText aria-hidden="true" size={17} />
              Terms
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
