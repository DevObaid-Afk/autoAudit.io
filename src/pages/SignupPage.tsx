import { Link, useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../api/client";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    companyDomain: "",
  });
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-canvas px-4 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.6fr)] lg:p-6">
      <section className="hidden rounded-lg bg-ink p-8 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
            <ShieldCheck aria-hidden="true" size={27} />
          </span>
          <div>
            <strong className="block text-lg font-extrabold">AutoAudit.ai</strong>
            <span className="text-sm text-white/60">SaaS waste control</span>
          </div>
        </div>
        <div>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-normal">Turn SaaS cleanup into measurable savings.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">Create a workspace, add vendors, and generate your first waste audit from live backend data.</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-md content-center">
        <form className="rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)]" onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-xs font-extrabold uppercase text-brand-strong">Start workspace</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-normal">Create account</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">Set up your company dashboard and connect the API-backed vendor inventory.</p>
          </div>
          <div className="grid gap-4">
            {error && <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk">{error}</div>}
            <SignupField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <SignupField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <SignupField label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
            <SignupField label="Company name" value={form.companyName} onChange={(value) => setForm({ ...form, companyName: value })} />
            <SignupField label="Company domain" value={form.companyDomain} onChange={(value) => setForm({ ...form, companyDomain: value })} required={false} />
            <button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create workspace"}
            </button>
            <p className="text-center text-sm text-quiet">
              Already have an account?{" "}
              <Link className="font-extrabold text-brand hover:text-brand-strong" to="/login">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}

function SignupField({
  label,
  type = "text",
  value,
  required = true,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-quiet">{label}</span>
      <input className="input" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

