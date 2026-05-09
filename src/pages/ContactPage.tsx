import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Moon, Send, ShieldCheck, Sun } from "lucide-react";
import { PublicFooter, publicContact } from "../components/PublicFooter";
import { useTheme } from "../theme/ThemeContext";

export function ContactPage() {
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const subject = encodeURIComponent(`Custom AutoAudit.ai plan request from ${form.company || form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\n${form.message}`,
    );

    window.location.href = `mailto:${publicContact.email}?subject=${subject}&body=${body}`;
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_12px_26px_rgb(var(--color-brand)/0.24)]">
              <ShieldCheck aria-hidden="true" size={23} />
            </span>
            <span className="text-lg font-extrabold tracking-normal">AutoAudit.ai</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link className="hidden min-h-10 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm font-extrabold text-ink transition hover:border-brand hover:text-brand sm:inline-flex" to="/pricing">
              <ArrowLeft aria-hidden="true" size={17} />
              Pricing
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
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
        <div>
          <p className="text-xs font-extrabold uppercase text-brand-strong">Custom plan</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">Tell us what your audit workflow needs.</h1>
          <p className="mt-4 text-base leading-7 text-quiet">
            Use this for higher vendor counts, assisted onboarding, special reporting needs, or early access to planned integrations.
          </p>
          <div className="mt-6 rounded-lg border border-line bg-panel p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand">
                <Mail aria-hidden="true" size={21} />
              </span>
              <div>
                <strong className="block text-sm font-extrabold">Direct contact</strong>
                <span className="text-sm text-quiet">{publicContact.email}</span>
              </div>
            </div>
          </div>
        </div>

        <form className="rounded-lg border border-line bg-panel p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <ContactField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <ContactField label="Work email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <ContactField label="Company" value={form.company} onChange={(value) => setForm({ ...form, company: value })} />
            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-quiet">What do you need?</span>
              <textarea
                className="min-h-32 rounded-lg border border-line bg-panel-subtle p-3 text-sm text-ink outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgb(var(--color-brand-soft))]"
                value={form.message}
                required
                onChange={(event) => setForm({ ...form, message: event.target.value })}
              />
            </label>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong" type="submit">
              <Send aria-hidden="true" size={17} />
              Send request
            </button>
          </div>
        </form>
      </section>
      <PublicFooter />
    </main>
  );
}

function ContactField({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-quiet">{label}</span>
      <input className="input" type={type} value={value} required onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
