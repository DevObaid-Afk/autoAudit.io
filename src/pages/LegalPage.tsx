import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter, publicContact } from "../components/PublicFooter";

type LegalPageProps = {
  type: "privacy" | "terms";
};

export function LegalPage({ type }: LegalPageProps) {
  const isPrivacy = type === "privacy";

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title={`${isPrivacy ? "Privacy Policy" : "Terms of Use"} - AutoAudit.ai`}
        description={isPrivacy ? "AutoAudit.ai privacy basics for account, workspace, SaaS vendor, and contact data." : "AutoAudit.ai terms covering SaaS audit workflows, AI drafts, and product use."}
        canonicalPath={isPrivacy ? "/privacy" : "/terms"}
      />
      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
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

      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase text-brand-strong">Legal basics</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-normal">{isPrivacy ? "Privacy Policy" : "Terms of Use"}</h1>
        <p className="mt-3 text-sm leading-6 text-quiet">Last updated: May 9, 2026</p>

        <div className="mt-8 grid gap-4">
          {(isPrivacy ? privacySections : termsSections).map((section) => (
            <article className="rounded-lg border border-line bg-panel p-5 shadow-[0_14px_34px_rgba(23,32,38,0.06)]" key={section.title}>
              <h2 className="text-lg font-extrabold tracking-normal">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-quiet">{section.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-line bg-panel-subtle p-5 text-sm leading-7 text-quiet">
          Questions? Contact <a className="font-extrabold text-brand hover:text-brand-strong" href={`mailto:${publicContact.email}`}>{publicContact.email}</a>.
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

const privacySections = [
  {
    title: "Information collected",
    text: "AutoAudit.ai may collect account details, company workspace details, vendor data entered by users, usage data, and messages submitted through contact forms or email.",
  },
  {
    title: "How information is used",
    text: "Information is used to provide the SaaS audit workflow, generate reports or drafts, improve product quality, respond to requests, and maintain security.",
  },
  {
    title: "Third-party services",
    text: "The product may use infrastructure, database, analytics, email, or AI providers. Data sent to AI features is used only to complete the requested workflow.",
  },
  {
    title: "Contact and deletion requests",
    text: "Users can request corrections, exports, or deletion by contacting the listed email address. Reasonable verification may be required before account data is changed or removed.",
  },
];

const termsSections = [
  {
    title: "Use of the product",
    text: "AutoAudit.ai is provided to help teams review SaaS spend, vendors, renewals, reports, and related workflows. Users are responsible for the accuracy of data they upload or enter.",
  },
  {
    title: "No financial or legal guarantee",
    text: "Reports, savings estimates, and AI drafts are informational. Users should review all recommendations before acting on cancellations, renewals, purchases, or vendor communications.",
  },
  {
    title: "Accounts and access",
    text: "Users should keep login details secure and only upload data they are authorized to use. Access may be limited, suspended, or removed for misuse.",
  },
  {
    title: "Changes",
    text: "Pricing, trial limits, features, and availability may change as the product evolves. Continued use means acceptance of updated terms.",
  },
];
