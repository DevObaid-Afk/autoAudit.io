import { Link, useLocation, useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { API_URL, getApiErrorMessage } from "../api/client";
import { PageMeta } from "../components/PageMeta";
import { useTheme } from "../theme/ThemeContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to review SaaS waste, renewals, and vendor actions.">
      <PageMeta title="Sign In - AutoAudit.ai" description="Sign in to your AutoAudit.ai SaaS waste control dashboard." canonicalPath="/login" noindex />
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error && <AuthError message={error} />}
        <GoogleAuthButton returnTo={redirectTo} />
        <AuthDivider />
        <AuthField label="Email">
          <input className="input" type="email" value={email} autoComplete="email" placeholder="you@company.com" onChange={(event) => setEmail(event.target.value)} required />
        </AuthField>
        <AuthField label="Password">
          <div className="relative">
            <input className="input pr-12" type={showPassword ? "text" : "password"} value={password} autoComplete="current-password" placeholder="Enter your password" onChange={(event) => setPassword(event.target.value)} required />
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
        </AuthField>
        <button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_16px_32px_rgb(var(--color-brand)/0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <Link className="text-center text-sm font-extrabold text-brand hover:text-brand-strong" to="/forgot-password">
          Forgot password?
        </Link>
        <p className="text-center text-sm text-quiet">
          New workspace?{" "}
          <Link className="font-extrabold text-brand hover:text-brand-strong" to="/signup">
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function GoogleAuthButton({ plan = "free", returnTo = "/dashboard" }: { plan?: string; returnTo?: string }) {
  const href = `${API_URL}/api/auth/google?returnTo=${encodeURIComponent(returnTo)}&plan=${encodeURIComponent(plan)}`;

  return (
    <a
      className="inline-flex min-h-11 items-center justify-center gap-3 rounded-lg border border-line bg-panel-subtle px-4 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
      href={href}
    >
      <GoogleLogo />
      Continue with Google
    </a>
  );
}

function GoogleLogo() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h6c-.3 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.3-4.5 3.3-7.5Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-3.3l-3.4-2.6c-.9.6-2.2 1-3.9 1-3 0-5.5-2-6.4-4.8H2.1V16c1.8 4.1 5.6 7 9.9 7Z" />
      <path fill="#FBBC05" d="M5.6 13.3a6.6 6.6 0 0 1 0-4.2V6.4H2.1a11 11 0 0 0 0 9.8l3.5-2.9Z" />
      <path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.7l3.1-3.1A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.1 6.4l3.5 2.7C6.5 7.3 9 5.3 12 5.3Z" />
    </svg>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-extrabold uppercase text-quiet">
      <span className="h-px flex-1 bg-line" />
      <span>or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

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
            <span className="text-sm text-inverse-ink/60">Authenticated SaaS control room</span>
          </div>
        </div>
        <div>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-normal">Find forgotten SaaS spend before it renews.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-inverse-ink/70">Connect finance and usage data, detect zombie subscriptions, and turn every finding into a CFO-ready action.</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-md content-center">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
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
            <p className="text-xs font-extrabold uppercase text-brand-strong">Secure access</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-normal">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-quiet">{label}</span>
      {children}
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk">{message}</div>;
}

export function AuthSuccess({ message }: { message: string }) {
  return <div className="rounded-lg border border-good/20 bg-good-soft px-3 py-2 text-sm font-bold text-good">{message}</div>;
}
