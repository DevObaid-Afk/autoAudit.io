import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, CheckCircle2, ClipboardList, FileText, LineChart, ShieldCheck, Target } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter } from "../components/PublicFooter";

const proofSignals = [
  {
    title: "Spend",
    text: "Monthly or annual cost gives the finding a financial weight.",
  },
  {
    title: "Seats",
    text: "Purchased and active seats help reveal unused capacity.",
  },
  {
    title: "Renewal timing",
    text: "Notice windows and renewal dates show how urgent the action is.",
  },
  {
    title: "Owner context",
    text: "Assigned owners make the next review step easier to route.",
  },
];

const sampleFindings = [
  {
    title: "Unused seats",
    evidence: "80 seats purchased, 52 active, renewal in 24 days.",
    action: "Review a 28-seat reduction before the renewal date.",
  },
  {
    title: "Zombie subscription",
    evidence: "$1,200 monthly spend with no active owner and no recent usage note.",
    action: "Confirm ownership, then cancel or reassign before the next billing cycle.",
  },
  {
    title: "Duplicate category",
    evidence: "Two tools marked for the same workflow with overlapping teams.",
    action: "Compare usage and consolidate after stakeholder review.",
  },
];

const proofPrinciples = [
  "A recommendation should name the signal behind it.",
  "A savings estimate should show the rough logic behind the number.",
  "Urgent findings should explain the deadline or renewal risk.",
  "Reports should be review-ready, not treated as final decisions.",
];

export function ReportProofPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="Report Proof - AutoAudit.ai"
        description="See how AutoAudit.ai reports explain the evidence behind SaaS waste, unused seats, renewal risk, and savings recommendations."
        canonicalPath="/report-proof"
        keywords={["SaaS waste reports", "unused seat report", "renewal risk report", "software spend report"]}
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
          <p className="text-xs font-extrabold uppercase text-brand-strong">Report proof</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">
            Show the work behind every recommendation.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-quiet">
            Trust grows when a savings recommendation includes the reason it was flagged, the evidence behind it, and the next action a person should review.
          </p>
        </div>

        <div className="motion-enter motion-delay-1 rounded-lg border border-line bg-panel p-5 shadow-[0_24px_70px_rgba(23,32,38,0.12)]">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
              <FileText aria-hidden="true" size={23} />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase text-brand-strong">Report standard</p>
              <h2 className="text-xl font-extrabold tracking-normal">Evidence before action</h2>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold leading-7 text-quiet">
            A useful report should help an operations lead understand why something matters before the team makes a vendor decision.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-4 lg:px-8">
        {proofSignals.map((item) => (
          <article className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item.title}>
            <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
              <LineChart aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase text-brand-strong">Sample proof cards</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Clear findings are easier to trust.</h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {sampleFindings.map((item) => (
              <article className="motion-card rounded-lg border border-line bg-panel-subtle p-5" key={item.title}>
                <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                  <ClipboardList aria-hidden="true" size={22} />
                </span>
                <h3 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h3>
                <p className="mt-3 text-xs font-extrabold uppercase text-brand-strong">Evidence</p>
                <p className="mt-1 text-sm leading-6 text-quiet">{item.evidence}</p>
                <p className="mt-4 text-xs font-extrabold uppercase text-brand-strong">Review action</p>
                <p className="mt-1 text-sm leading-6 text-quiet">{item.action}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:px-8">
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">Proof principles</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Reports should reduce doubt, not create it.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {proofPrinciples.map((item) => (
              <div className="motion-card rounded-lg border border-line bg-panel p-4 text-sm font-bold leading-6 text-quiet shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item}>
                <CheckCircle2 aria-hidden="true" className="mb-3 text-good" size={18} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-inverse p-6 text-inverse-ink shadow-[0_24px_70px_rgba(23,32,38,0.16)]">
          <span className="grid size-11 place-items-center rounded-lg bg-inverse-action text-inverse-action-ink">
            <Calculator aria-hidden="true" size={22} />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold tracking-normal">Savings estimates need context.</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-inverse-ink/76">
            AutoAudit.ai should present savings as an estimate based on user-provided or imported data, with human review before finance or vendor action.
          </p>
          <p className="mt-4 rounded-lg border border-line bg-panel-subtle p-4 text-sm font-bold leading-6 text-quiet">
            Until integrations are connected, report signals come from the data your team enters or imports: vendors, spend, seats, usage notes, owners, and renewal dates.
          </p>
        </aside>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Next product cue</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal">Add “why flagged” details inside dashboard findings.</h2>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/demo">
            <Target aria-hidden="true" size={17} />
            View demo
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
