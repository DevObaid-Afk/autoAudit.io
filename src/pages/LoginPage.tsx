import { Link, useLocation, useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("test2@autoaudit.ai");
  const [password, setPassword] = useState("password123");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

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
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error && <AuthError message={error} />}
        <AuthField label="Email">
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </AuthField>
        <AuthField label="Password">
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </AuthField>
        <button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
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

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-canvas px-4 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.6fr)] lg:p-6">
      <section className="hidden rounded-lg bg-ink p-8 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-brand-soft text-brand">
            <ShieldCheck aria-hidden="true" size={27} />
          </span>
          <div>
            <strong className="block text-lg font-extrabold">AutoAudit.ai</strong>
            <span className="text-sm text-white/60">Authenticated SaaS control room</span>
          </div>
        </div>
        <div>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-normal">Find forgotten SaaS spend before it renews.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">Connect finance and usage data, detect zombie subscriptions, and turn every finding into a CFO-ready action.</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-md content-center">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-[0_18px_45px_rgba(23,32,38,0.08)]">
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

function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-quiet">{label}</span>
      {children}
    </label>
  );
}

function AuthError({ message }: { message: string }) {
  return <div className="rounded-lg border border-risk/20 bg-risk-soft px-3 py-2 text-sm font-bold text-risk">{message}</div>;
}
