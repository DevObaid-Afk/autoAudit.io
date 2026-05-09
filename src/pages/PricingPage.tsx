import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { PublicFooter } from "../components/PublicFooter";
import { useTheme } from "../theme/ThemeContext";

const plans = [
  {
    name: "Free Trial",
    price: "$0",
    cadence: "for 7 days",
    detail: "Try the audit workflow before choosing a paid plan.",
    action: "Start trial",
    href: "/signup?plan=trial",
    featured: false,
    features: ["7-day access", "Sample vendor workspace", "Basic waste findings", "One report draft"],
  },
  {
    name: "Starter",
    price: "$49",
    cadence: "per month",
    detail: "For founders and lean teams cleaning up SaaS spend.",
    action: "Choose Starter",
    href: "/signup?plan=starter",
    featured: false,
    features: ["Vendor inventory", "Renewal tracking", "Unused seat detection", "Monthly waste summary"],
  },
  {
    name: "Standard",
    price: "$89",
    cadence: "per month",
    detail: "For teams that want AI-assisted reporting and action drafts.",
    action: "Choose Standard",
    href: "/signup?plan=standard",
    featured: true,
    features: ["Everything in Starter", "AI email generator", "CFO-ready reports", "CSV import workflow"],
  },
  {
    name: "Custom",
    price: "Request",
    cadence: "custom plan",
    detail: "For larger teams that need custom limits, onboarding, or integrations.",
    action: "Request plan",
    href: "/contact",
    featured: false,
    features: ["Custom workspace limits", "Assisted onboarding", "Governance workflows", "Integration planning"],
  },
];

export function PricingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.24)]">
              <ShieldCheck aria-hidden="true" size={23} />
            </span>
            <span className="text-lg font-extrabold tracking-normal">AutoAudit.ai</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link className="hidden min-h-10 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand sm:inline-flex" to="/">
              <ArrowLeft aria-hidden="true" size={17} />
              Home
            </Link>
            <button
              className="grid size-10 place-items-center rounded-lg border border-line bg-panel-subtle text-ink transition hover:border-brand hover:text-brand"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            </button>
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgb(var(--color-brand)/0.22)] transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-extrabold text-brand-strong shadow-sm">
            <Sparkles aria-hidden="true" size={17} />
            Simple pricing for SaaS cleanup
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">Choose the plan that fits your audit workflow.</h1>
          <p className="mt-4 text-base leading-7 text-quiet">
            Start with a week-long trial, then move into a monthly plan when AutoAudit becomes part of your finance rhythm.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              className={`relative flex min-h-[430px] flex-col rounded-lg border p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)] ${plan.featured ? "border-brand bg-brand-soft" : "border-line bg-panel"
                }`}
              key={plan.name}
            >
              {plan.featured && (
                <span className="absolute right-4 top-4 rounded-md bg-brand px-2.5 py-1 text-xs font-extrabold text-white">
                  Popular
                </span>
              )}
              <div className="grid size-11 place-items-center rounded-lg bg-panel-subtle text-brand">
                {plan.name === "Custom" ? <Building2 aria-hidden="true" size={23} /> : <ShieldCheck aria-hidden="true" size={23} />}
              </div>
              <h2 className="mt-5 text-xl font-extrabold tracking-normal">{plan.name}</h2>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-extrabold tracking-normal">{plan.price}</span>
                <span className="pb-1 text-sm font-bold text-quiet">{plan.cadence}</span>
              </div>
              <p className="mt-4 min-h-14 text-sm leading-6 text-quiet">{plan.detail}</p>

              <ul className="mt-5 grid gap-3">
                {plan.features.map((feature) => (
                  <li className="flex gap-2 text-sm font-bold text-ink" key={feature}>
                    <Check aria-hidden="true" className="mt-0.5 shrink-0 text-good" size={17} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                className={`mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold transition ${plan.featured
                  ? "bg-brand text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.24)] hover:bg-brand-strong"
                  : "border border-line bg-panel-subtle text-ink hover:border-brand hover:text-brand"
                  }`}
                to={plan.href}
              >
                {plan.action}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-line bg-panel p-5 text-center shadow-[0_18px_45px_rgba(23,32,38,0.06)]">
          <p className="text-sm font-bold leading-6 text-quiet">
            Plans can be changed in future, stay tuned with the real pricing updates!
          </p>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
