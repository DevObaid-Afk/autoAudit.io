import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { PageMeta } from "../components/PageMeta";
import { PublicFooter, publicContact } from "../components/PublicFooter";

const socialLinks = [
  { label: "GitHub", className: "fa-brands fa-github", href: "https://github.com/DevObaid-Afk" },
  { label: "Instagram", className: "fa-brands fa-instagram", href: "https://www.instagram.com/dev_obaid.io/" },
  { label: "Facebook", className: "fa-brands fa-facebook", href: "https://www.facebook.com/share/1LvvoCf7VU/" },
  { label: "X", className: "fa-brands fa-x-twitter", href: "#" },
];

const founderNotes = [
  {
    title: "Why I built it",
    text: "Small teams often manage SaaS renewals across spreadsheets, inboxes, and memory. AutoAudit.ai is meant to turn that scattered work into a clear review queue.",
  },
  {
    title: "What I am optimizing for",
    text: "The product focuses on practical workflows: vendor ownership, renewal timing, seat usage, savings logic, and action-ready reports.",
  },
  {
    title: "How it is improving",
    text: "AutoAudit.ai is in active early access. I am using real feedback to tighten onboarding, reporting, trust copy, and the product roadmap.",
  },
];

export function AboutDeveloperPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageMeta
        title="About the Developer - AutoAudit.ai"
        description="Meet Obaid, the self-taught full-stack developer building AutoAudit.ai for practical SaaS spend cleanup workflows."
        canonicalPath="/about-developer"
        keywords={["AutoAudit.ai developer", "SaaS audit founder", "AutoAudit founder"]}
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

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-center lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-panel-subtle shadow-[0_24px_70px_rgba(23,32,38,0.16)]">
          <img className="aspect-[4/5] h-full w-full object-cover" src="/obaid-photo.png" alt="Obaid, creator of AutoAudit.ai" />
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">Founder-led SaaS</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">Obaid, builder of AutoAudit.ai.</h1>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-quiet">
            <p>
              I am Obaid, a self-taught full-stack web developer building AutoAudit.ai as a focused tool for teams that want to find SaaS waste before renewals quietly turn into another billing cycle.
            </p>
            <p>
              The idea comes from a simple operational problem: software spend grows across teams, owners change, seat counts drift, and renewal dates get missed. AutoAudit.ai brings those signals into one workspace so founders, finance teams, and operators can review what to keep, reduce, cancel, or renegotiate.
            </p>
            <p>
              I am keeping the product lightweight on purpose. The goal is not to replace a full procurement department; it is to give growing teams a practical audit workflow, transparent savings logic, and useful AI drafts that humans review before taking action.
            </p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-3">
            {founderNotes.map((note) => (
              <article className="rounded-lg border border-line bg-panel-subtle p-4" key={note.title}>
                <CheckCircle2 aria-hidden="true" className="text-good" size={18} />
                <h2 className="mt-3 text-sm font-extrabold tracking-normal">{note.title}</h2>
                <p className="mt-2 text-sm leading-6 text-quiet">{note.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" href={`mailto:${publicContact.email}`}>
              <Mail aria-hidden="true" size={17} />
              {publicContact.email}
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand" href={`tel:${publicContact.phone.replace(/\s/g, "")}`}>
              <Phone aria-hidden="true" size={17} />
              {publicContact.phone}
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" href={publicContact.whatsappHref} rel="noreferrer" target="_blank">
              <MessageCircle aria-hidden="true" size={17} />
              WhatsApp
            </a>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {socialLinks.map((item) => (
              <a className="grid size-11 place-items-center rounded-lg border border-line bg-panel-subtle text-quiet transition hover:-translate-y-0.5 hover:border-brand hover:text-brand" href={item.href} key={item.label} aria-label={item.label} title={item.label}>
                <i aria-hidden="true" className={`${item.className} text-xl`} />
              </a>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
