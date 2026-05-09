import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, CalendarClock, FileText, Mail, ShieldCheck } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter } from "../components/PublicFooter";

const demoMetrics = [
  { label: "Monthly SaaS spend", value: "$18,420" },
  { label: "Annual savings found", value: "$42,860" },
  { label: "Renewals at risk", value: "7" },
  { label: "Unused seats", value: "126" },
];

const demoRows = [
  { vendor: "Clearbit", owner: "Revenue", spend: "$1,200", issue: "Zombie subscription", action: "Cancel before renewal" },
  { vendor: "Slack", owner: "Operations", spend: "$890", issue: "28 unused seats", action: "Right-size seats" },
  { vendor: "Asana", owner: "Operations", spend: "$510", issue: "Duplicate PM tool", action: "Review with Monday.com" },
  { vendor: "Notion", owner: "Product", spend: "$420", issue: "Healthy", action: "Keep monitored" },
];

export function DemoPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta title="Demo Dashboard - AutoAudit.ai" description="Explore a read-only AutoAudit.ai demo dashboard with sample SaaS waste, renewals, and reports." />
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

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-brand-strong">Read-only demo</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">See the audit workflow before signup.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-quiet">This sample workspace shows how AutoAudit.ai turns vendor data into waste findings, renewal priorities, reports, and vendor email drafts.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/signup?plan=trial">
            Start your trial
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {demoMetrics.map((metric) => (
            <article className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]" key={metric.label}>
              <p className="text-sm font-bold text-quiet">{metric.label}</p>
              <strong className="mt-2 block text-3xl font-extrabold tracking-normal">{metric.value}</strong>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-brand" aria-hidden="true" size={22} />
              <h2 className="text-lg font-extrabold tracking-normal">Sample vendor audit</h2>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[760px] w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs uppercase text-quiet">
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Spend</th>
                    <th className="px-3 py-2">Finding</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {demoRows.map((row) => (
                    <tr className="bg-panel-subtle text-sm font-bold" key={row.vendor}>
                      <td className="rounded-l-lg border-y border-l border-line px-3 py-3">{row.vendor}</td>
                      <td className="border-y border-line px-3 py-3">{row.owner}</td>
                      <td className="border-y border-line px-3 py-3">{row.spend}</td>
                      <td className="border-y border-line px-3 py-3">{row.issue}</td>
                      <td className="rounded-r-lg border-y border-r border-line px-3 py-3">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="grid gap-4">
            {[
              { icon: CalendarClock, title: "Renewal queue", text: "Three contracts need owner review in the next 30 days." },
              { icon: FileText, title: "Report output", text: "CFO summary highlights $42.8k in annual savings opportunities." },
              { icon: Mail, title: "Email draft", text: "Vendor cancellation draft is ready with usage and savings context." },
            ].map((item) => (
              <article className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]" key={item.title}>
                <item.icon className="text-brand" aria-hidden="true" size={22} />
                <h2 className="mt-3 text-base font-extrabold tracking-normal">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-quiet">{item.text}</p>
              </article>
            ))}
          </aside>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
