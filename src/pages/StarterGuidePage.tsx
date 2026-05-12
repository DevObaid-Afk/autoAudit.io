import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter } from "../components/PublicFooter";

const guideSteps = [
  "Open the landing page and review what AutoAudit.ai is built to solve.",
  "Visit the demo page to see a sample SaaS audit before creating an account.",
  "Start the 7-day trial from pricing or signup.",
  "Load sample data or import your vendor CSV in the dashboard.",
  "Review waste signals, unused seats, duplicate tools, and renewal risks.",
  "Generate a report or vendor email draft when you need an action-ready output.",
  "Use the contact page if you need a custom plan, help, or manual onboarding.",
];

const pros = [
  "Shows SaaS spend, owners, renewals, seats, and waste in one dashboard.",
  "Helps small teams act before subscriptions renew quietly.",
  "Includes CSV import, sample data, reports, and AI email drafts.",
  "Keeps pricing simple while payments are still manual.",
];

const risks = [
  "Unused seats can keep draining budget every month.",
  "Forgotten tools may renew before anyone reviews them.",
  "Duplicate software makes teams pay twice for similar workflows.",
  "Finance work becomes slower when vendor data stays scattered in spreadsheets.",
];

export function StarterGuidePage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="SaaS Audit Starter Guide - AutoAudit.ai"
        description="Learn how to use AutoAudit.ai to import vendor data, find SaaS waste, review renewals, and create reports or email drafts."
        canonicalPath="/starter-guide"
        keywords={["SaaS audit guide", "software spend audit", "vendor cleanup guide", "SaaS renewal management"]}
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

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase text-brand-strong">Starter guide</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">How to use AutoAudit.ai from first visit to first savings report.</h1>
          <p className="mt-4 text-sm leading-7 text-quiet">
            This guide explains the website flow, why the product is useful, and what can happen when paid SaaS subscriptions are ignored for too long.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section id="step-by-step" className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
            <h2 className="text-2xl font-extrabold tracking-normal">Step-by-step usage</h2>
            <div className="mt-6 grid gap-3">
              {guideSteps.map((step, index) => (
                <article className="flex gap-3 rounded-lg border border-line bg-panel-subtle p-4" key={step}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-extrabold text-white">{index + 1}</span>
                  <p className="text-sm font-bold leading-6 text-ink">{step}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="grid gap-5">
            <section id="why-choose" className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
              <h2 className="text-xl font-extrabold tracking-normal">Why choose this website?</h2>
              <p className="mt-3 text-sm leading-7 text-quiet">
                AutoAudit.ai is built for teams that want a simple, focused way to clean up SaaS spend without starting with a heavy procurement system.
              </p>
            </section>

            <section id="pros" className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
              <h2 className="text-xl font-extrabold tracking-normal">Pros</h2>
              <div className="mt-4 grid gap-3">
                {pros.map((item) => (
                  <p className="flex gap-2 text-sm font-bold leading-6 text-quiet" key={item}>
                    <CheckCircle2 className="mt-0.5 shrink-0 text-good" aria-hidden="true" size={17} />
                    {item}
                  </p>
                ))}
              </div>
            </section>

            <section id="subscription-risk" className="rounded-lg border border-risk/20 bg-risk-soft p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
              <h2 className="text-xl font-extrabold tracking-normal text-risk">Cost of ignoring paid subscriptions</h2>
              <div className="mt-4 grid gap-3">
                {risks.map((item) => (
                  <p className="flex gap-2 text-sm font-bold leading-6 text-risk" key={item}>
                    <TriangleAlert className="mt-0.5 shrink-0" aria-hidden="true" size={17} />
                    {item}
                  </p>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-lg border border-line bg-inverse p-6 text-inverse-ink sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-inverse-ink/70">Ready to try the workflow?</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-normal">Start with demo data, then replace it with your real vendor list.</h2>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-inverse-action px-4 text-sm font-extrabold text-inverse-action-ink transition hover:-translate-y-0.5" to="/signup?plan=trial">
            Start free trial
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
