import { Link } from "react-router-dom";
import { ArrowLeft, Bot, CheckCircle2, Edit3, Eye, Mail, Send, ShieldCheck, XCircle } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter, publicContact } from "../components/PublicFooter";

const aiCanDo = [
  "Draft SaaS waste summaries from audit evidence.",
  "Suggest vendor email wording for review.",
  "Help explain why a subscription was flagged.",
  "Turn renewal and seat data into clearer next steps.",
];

const aiCannotDo = [
  "Send emails without a human.",
  "Cancel subscriptions or change vendor accounts.",
  "Approve renewals, purchases, or legal decisions.",
  "Guarantee savings, finance outcomes, or contract terms.",
];

const reviewFlow = [
  {
    title: "Evidence first",
    text: "The useful part of an AI draft is the data behind it: spend, seats, usage, owners, and renewal timing.",
  },
  {
    title: "Draft second",
    text: "AutoAudit.ai can turn that evidence into a report note or email draft your team can inspect.",
  },
  {
    title: "Human action last",
    text: "A person decides what to send, change, cancel, renew, reduce, or escalate.",
  },
];

export function AiBoundariesPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="AI Boundaries - AutoAudit.ai"
        description="Learn what AutoAudit.ai AI drafts can do for SaaS reports and vendor emails, what they cannot do, and how human review stays in control."
        canonicalPath="/ai-boundaries"
        keywords={["AI SaaS audit", "AI email drafts", "human reviewed AI", "SaaS vendor AI boundaries"]}
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

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:items-center lg:px-8">
        <div className="motion-enter">
          <p className="text-xs font-extrabold uppercase text-brand-strong">AI boundaries</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">
            AI helps draft. Humans decide.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-quiet">
            AutoAudit.ai uses AI to make audit findings easier to understand and act on, while keeping vendor communication and subscription decisions under human control.
          </p>
        </div>

        <div className="motion-enter motion-delay-1 rounded-lg border border-line bg-panel p-5 shadow-[0_24px_70px_rgba(23,32,38,0.12)]">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
              <Bot aria-hidden="true" size={23} />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase text-brand-strong">Rule of thumb</p>
              <h2 className="text-xl font-extrabold tracking-normal">No automatic vendor action</h2>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold leading-7 text-quiet">
            If an action affects a vendor relationship, subscription, payment, renewal, contract, or team workflow, AutoAudit.ai treats it as something a person must review first.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]">
          <CheckCircle2 aria-hidden="true" className="text-good" size={24} />
          <h2 className="mt-4 text-2xl font-extrabold tracking-normal">AI can help with</h2>
          <div className="mt-5 grid gap-3">
            {aiCanDo.map((item) => (
              <p className="flex gap-2 text-sm font-bold leading-6 text-quiet" key={item}>
                <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-good" size={17} />
                {item}
              </p>
            ))}
          </div>
        </article>

        <article className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]">
          <XCircle aria-hidden="true" className="text-risk" size={24} />
          <h2 className="mt-4 text-2xl font-extrabold tracking-normal">AI cannot do</h2>
          <div className="mt-5 grid gap-3">
            {aiCannotDo.map((item) => (
              <p className="flex gap-2 text-sm font-bold leading-6 text-quiet" key={item}>
                <XCircle aria-hidden="true" className="mt-0.5 shrink-0 text-risk" size={17} />
                {item}
              </p>
            ))}
          </div>
        </article>
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase text-brand-strong">Human review flow</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-normal">Small steps make the AI experience feel safer.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviewFlow.map((item, index) => (
              <article className="motion-card rounded-lg border border-line bg-panel-subtle p-5" key={item.title}>
                <span className="grid size-9 place-items-center rounded-lg bg-brand text-sm font-extrabold text-white">{index + 1}</span>
                <h3 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          { icon: Eye, title: "Visible reasoning", text: "Recommendations should be explainable with the audit data behind them." },
          { icon: Edit3, title: "Editable drafts", text: "Draft text should be reviewed and adjusted before it leaves the product." },
          { icon: Send, title: "No silent sending", text: "Vendor communication should remain a deliberate human action." },
        ].map((item) => (
          <article className="motion-card rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={item.title}>
            <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
              <item.icon aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-normal">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 rounded-lg border border-line bg-inverse p-6 text-inverse-ink shadow-[0_24px_70px_rgba(23,32,38,0.16)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold text-inverse-ink/70">Questions about AI behavior?</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal">Ask before uploading sensitive audit data.</h2>
          </div>
          <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-inverse-action px-4 text-sm font-extrabold text-inverse-action-ink transition hover:-translate-y-0.5" href={`mailto:${publicContact.email}`}>
            <Mail aria-hidden="true" size={17} />
            Contact founder
          </a>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
