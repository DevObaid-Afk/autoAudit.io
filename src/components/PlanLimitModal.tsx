import { ArrowRight, Crown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PlanLimitErrorPayload } from "../types/api";

const planBenefits = {
  starter: "Starter gives you 50 vendors, 5 reports, 20 AI emails, and 15 AI analyses.",
  standard: "Standard gives you 200 vendors, 25 reports, 100 AI emails, and 50 AI analyses.",
  growth: "Growth gives you 500 vendors, 75 reports, 300 AI emails, and 150 AI analyses.",
  enterprise: "Enterprise gives you custom capacity, onboarding support, and integration planning.",
  custom: "A custom plan gives you tailored limits, onboarding support, and integration planning.",
  free: "Starter gives you more room to continue your audit workflow.",
} as const;

const limitLabels = {
  vendors: "vendor slots",
  reports: "reports",
  aiEmails: "AI email drafts",
  vendorAnalyses: "AI analyses",
  trial: "trial access",
} as const;

export function PlanLimitModal({ error, onDismiss }: { error: PlanLimitErrorPayload | null; onDismiss: () => void }) {
  const navigate = useNavigate();
  if (!error) return null;

  const plan = error.upgradeToUnlock;
  const title = error.limitType === "trial"
    ? "Your trial has ended"
    : `You've used all ${error.planLimit} ${limitLabels[error.limitType]}`;

  const handleUpgrade = () => {
    onDismiss();
    navigate("/dashboard/billing");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-5 text-ink shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <Crown aria-hidden="true" size={22} />
          </span>
          <button
            aria-label="Close upgrade prompt"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-panel-subtle text-quiet transition hover:border-brand hover:text-brand"
            type="button"
            onClick={onDismiss}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <h2 className="mt-4 text-xl font-extrabold tracking-normal">{title}</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-quiet">{error.message}</p>
        <p className="mt-3 rounded-lg border border-brand/20 bg-brand-soft p-3 text-sm font-extrabold leading-6 text-brand-strong">
          {planBenefits[plan] ?? planBenefits.starter}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong"
            type="button"
            onClick={handleUpgrade}
          >
            Upgrade to {formatPlan(plan)}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand"
            type="button"
            onClick={onDismiss}
          >
            Not now
          </button>
        </div>
      </section>
    </div>
  );
}

function formatPlan(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
