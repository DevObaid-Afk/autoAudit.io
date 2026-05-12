import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Database, Eye, FileText, LockKeyhole, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter, publicContact } from "../components/PublicFooter";

const dataTypes = [
  {
    title: "Account and company details",
    text: "Used to create your workspace, identify your company context, and protect signed-in areas.",
  },
  {
    title: "Vendor and subscription data",
    text: "Used to calculate waste signals, renewal exposure, owner assignments, and report summaries from the data your team enters or imports.",
  },
  {
    title: "Support and contact messages",
    text: "Used to reply to questions, custom plan requests, onboarding needs, and feedback.",
  },
];

const userControls = [
  "Choose what vendor data you enter or import.",
  "Review reports before sharing them with your team.",
  "Edit AI drafts before using them anywhere.",
  "Request account correction, export, or deletion by email.",
];

const handlingSteps = [
  "Data is added by the user or workspace team.",
  "AutoAudit.ai organizes it into audit, renewal, and reporting views.",
  "Waste findings show the reasoning behind each recommendation.",
  "A human decides what to keep, reduce, cancel, or renegotiate.",
];

export function DataSafetyPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="Data Safety - AutoAudit.ai"
        description="How AutoAudit.ai handles account, workspace, vendor, SaaS subscription, renewal, report, and support data."
        canonicalPath="/data-safety"
        keywords={["SaaS audit data safety", "vendor data privacy", "SaaS subscription data", "workspace data security"]}
      />

      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.24)]">
              <ShieldCheck aria-hidden="true" size={23} />
            </span>
            <span className="text-lg font-extrabold tracking-normal">AutoAudit.ai</span>
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" to="/trust">
            <ArrowLeft aria-hidden="true" size={17} />
            Trust Center
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1fr] lg:items-center lg:px-8">
        <div className="motion-enter">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Data safety</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">
            Know what data powers each audit.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-quiet">
            AutoAudit.ai uses the information you provide to organize software spend, renewals, seat usage, and action drafts. The goal is visibility, not hidden automation.
          </p>
        </div>

        <div className="motion-enter motion-delay-1 rounded-lg border border-line bg-panel p-5 shadow-[0_24px_70px_rgba(23,32,38,0.12)]">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
              <Database aria-hidden="true" size={23} />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase text-brand-strong">Simple lifecycle</p>
              <h2 className="text-xl font-extrabold tracking-normal">From uploaded data to reviewed action</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {handlingSteps.map((step, index) => (
              <div className="flex gap-3 rounded-lg border border-line bg-panel-subtle p-4" key={step}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-extrabold text-white">{index + 1}</span>
                <p className="text-sm font-bold leading-6 text-quiet">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {dataTypes.map((item) => (
          <article className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item.title}>
            <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
              <FileText aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Your controls</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Trust improves when users can see the controls.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {userControls.map((item) => (
                <div className="motion-card rounded-lg border border-line bg-panel-subtle p-4 text-sm font-bold leading-6 text-quiet" key={item}>
                  <CheckCircle2 aria-hidden="true" className="mb-3 text-good" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-line bg-panel-subtle p-6">
            <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
              <Eye aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold tracking-normal">No hidden vendor action</h2>
            <p className="mt-3 text-sm leading-7 text-quiet">
              AutoAudit.ai can surface findings and draft language, but vendor contact, cancellation, purchase, and renewal decisions remain human-reviewed.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
        <div className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]">
          <LockKeyhole aria-hidden="true" className="text-brand" size={24} />
          <h2 className="mt-4 text-xl font-extrabold tracking-normal">Account protection basics</h2>
          <p className="mt-2 text-sm leading-7 text-quiet">
            Passwords are hashed before storage, protected routes require sign-in, and workspace permissions are used for sensitive actions.
          </p>
        </div>
        <div className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]">
          <Trash2 aria-hidden="true" className="text-brand" size={24} />
          <h2 className="mt-4 text-xl font-extrabold tracking-normal">Deletion and correction requests</h2>
          <p className="mt-2 text-sm leading-7 text-quiet">
            Requests can be sent to <a className="font-extrabold text-brand hover:text-brand-strong" href={`mailto:${publicContact.email}`}>{publicContact.email}</a>. Reasonable verification may be required.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
