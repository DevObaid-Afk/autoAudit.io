import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/services";
import { getApiErrorMessage } from "../api/client";
import { PageMeta } from "../components/PageMeta";
import { AuthError, AuthField, AuthLayout, AuthSuccess } from "./LoginPage";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Reset password" subtitle="Enter your account email and AutoAudit.ai will send a secure reset link if the account exists.">
      <PageMeta title="Reset Password - AutoAudit.ai" description="Request a secure AutoAudit.ai password reset link." canonicalPath="/forgot-password" noindex />
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {message && <AuthSuccess message={message} />}
        {error && <AuthError message={error} />}
        <AuthField label="Email">
          <input className="input" type="email" value={email} autoComplete="email" placeholder="you@company.com" onChange={(event) => setEmail(event.target.value)} required />
        </AuthField>
        <button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
        <Link className="text-center text-sm font-extrabold text-brand hover:text-brand-strong" to="/login">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
