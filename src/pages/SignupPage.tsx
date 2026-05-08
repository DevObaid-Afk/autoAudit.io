import { Link, useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

export function SignupPage() {
  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    companyDomain: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signup(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-canvas px-4 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.6fr)] lg:p-6">
      <section className="hidden rounded-lg bg-inverse p-8 text-inverse-ink shadow-2xl lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
            <ShieldCheck aria-hidden="true" size={27} />
          </span>
          <div>
            <Link className="block text-lg font-extrabold" to="/">
              AutoAudit.ai
            </Link>
            <span className="text-sm text-inverse-ink/60">SaaS waste control</span>
          </div>
        </div>
        <div>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-normal">Turn SaaS cleanup into measurable savings.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-inverse-ink/70">Create a workspace, add vendors, and generate your first waste audit from live backend data.</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-md content-center">
        <form className="rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)]" onSubmit={handleSubmit}>
          <div className="mb-4 flex justify-end">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel-subtle px-3 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
              type="button"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
          <div className="mb-6">
            <p className="text-xs font-extrabold uppercase text-brand-strong">Start workspace</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-normal">Create account</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">Set up your company dashboard and connect the API-backed vendor inventory.</p>
          </div>
          <div className="grid gap-4">
            {error && <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk">{error}</div>}
            <SignupField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <SignupField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-quiet">Password</span>
              <div className="relative">
                <input className="input pr-12" type={showPassword ? "text" : "password"} value={form.password} autoComplete="new-password" minLength={8} required onChange={(event) => setForm({ ...form, password: event.target.value })} />
                <button
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-quiet transition hover:bg-panel-muted hover:text-ink"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
                </button>
              </div>
            </label>
            <SignupField label="Company name" value={form.companyName} onChange={(value) => setForm({ ...form, companyName: value })} />
            <SignupField label="Company domain" value={form.companyDomain} onChange={(value) => setForm({ ...form, companyDomain: value })} required={false} />
            <button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_16px_32px_rgb(var(--color-brand)/0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
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
